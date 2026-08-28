import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AuthResponseDto,
  MeResponseDto,
  RefreshResponseDto,
} from './dto/auth-response.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import { AuthResponseMapper } from './mappers/auth-response.mapper';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';

const DUMMY_PASSWORD_HASH =
  '$2b$12$C6UzMDM.H6dfI/f/IKcEe.5/S5M4nB8n5pYVZPHbRjNQZkJqfKf7K';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly sessions: SessionService,
    private readonly responses: AuthResponseMapper,
  ) {}

  async register(input: RegisterDto): Promise<AuthResponseDto> {
    const passwordHash = await this.passwords.hash(input.password);
    const accountId = randomUUID();
    const sessionId = randomUUID();
    const credentialId = randomUUID();
    const issued = await this.sessions.issueTokens(
      accountId,
      sessionId,
      credentialId,
    );
    const expiresAt = this.sessions.refreshExpiration(issued.refreshToken);
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const account = await tx.account.create({
          data: {
            id: accountId,
            ownerName: input.ownerName.trim(),
            email: input.email.trim().toLowerCase(),
            passwordHash,
          },
        });
        const workshop = await tx.workshop.create({
          data: {
            accountId,
            name: input.workshopName.trim(),
            address: input.workshopAddress.trim(),
          },
        });
        await tx.session.create({
          data: { id: sessionId, accountId, expiresAt },
        });
        await tx.refreshCredential.create({
          data: {
            id: credentialId,
            sessionId,
            tokenHash: this.tokens.hashRefresh(issued.refreshToken),
            expiresAt,
          },
        });
        return { account, workshop };
      });
      return this.responses.toAuthResponse(
        result.account,
        result.workshop,
        issued,
      );
    } catch (error) {
      if (this.isPrismaCode(error, 'P2002')) {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_REGISTERED',
          message: 'Email is already registered',
        });
      }
      throw error;
    }
  }

  async login(input: LoginDto): Promise<AuthResponseDto> {
    const account = await this.prisma.account.findUnique({
      where: { email: input.email.trim().toLowerCase() },
      include: { workshop: true },
    });
    const passwordMatches = await this.passwords.verify(
      input.password,
      account?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!account?.workshop || !passwordMatches) {
      throw this.invalidCredentials();
    }

    const sessionId = randomUUID();
    const credentialId = randomUUID();
    const issued = await this.sessions.issueTokens(
      account.id,
      sessionId,
      credentialId,
    );
    const expiresAt = this.sessions.refreshExpiration(issued.refreshToken);
    await this.prisma.$transaction(async (tx) => {
      await tx.session.create({
        data: { id: sessionId, accountId: account.id, expiresAt },
      });
      await tx.refreshCredential.create({
        data: {
          id: credentialId,
          sessionId,
          tokenHash: this.tokens.hashRefresh(issued.refreshToken),
          expiresAt,
        },
      });
    });
    return this.responses.toAuthResponse(account, account.workshop, issued);
  }

  async refresh(refreshToken: string): Promise<RefreshResponseDto> {
    try {
      const identity = await this.tokens.verifyRefresh(refreshToken);
      const issued = await this.sessions.rotate(refreshToken, identity);
      if (issued === null) throw this.invalidRefreshToken();
      return this.responses.toRefreshResponse(issued);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw this.invalidRefreshToken();
    }
  }

  logout(sessionId: string): Promise<void> {
    return this.sessions.logout(sessionId);
  }

  async me(accountId: string): Promise<MeResponseDto> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { workshop: true },
    });
    if (!account?.workshop) {
      throw new UnauthorizedException();
    }
    return this.responses.toMeResponse(account, account.workshop);
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    });
  }

  private invalidRefreshToken(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Invalid refresh token',
    });
  }

  private isPrismaCode(error: unknown, code: string): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === code
    );
  }
}
