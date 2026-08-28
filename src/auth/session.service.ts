import { Injectable } from '@nestjs/common';
import {
  Prisma,
  RefreshCredentialStatus,
  SessionRevocationReason,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService, type RefreshTokenIdentity } from './token.service';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  refreshExpiresIn: number;
}

type RotationResult =
  | { kind: 'success'; tokens: IssuedTokens }
  | { kind: 'invalid' };

class ConditionalRotationFailure extends Error {}

@Injectable()
export class SessionService {
  private static readonly MAX_SERIALIZATION_ATTEMPTS = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async issueTokens(
    accountId: string,
    sessionId: string,
    credentialId: string,
  ): Promise<IssuedTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokens.issueAccess({ sub: accountId, sid: sessionId }),
      this.tokens.issueRefresh({
        sub: accountId,
        sid: sessionId,
        jti: credentialId,
      }),
    ]);
    const now = Math.floor(Date.now() / 1000);
    return {
      accessToken,
      refreshToken,
      accessExpiresIn: this.expiresIn(accessToken, now),
      refreshExpiresIn: this.expiresIn(refreshToken, now),
    };
  }

  refreshExpiration(refreshToken: string): Date {
    const payload = this.decodePayload(refreshToken);
    if (typeof payload.exp !== 'number')
      throw new Error('Refresh token has no expiration');
    return new Date(payload.exp * 1000);
  }

  async rotate(
    rawToken: string,
    identity: RefreshTokenIdentity,
  ): Promise<IssuedTokens | null> {
    const tokenHash = this.tokens.hashRefresh(rawToken);
    for (
      let attempt = 1;
      attempt <= SessionService.MAX_SERIALIZATION_ATTEMPTS;
      attempt += 1
    ) {
      try {
        const result = await this.prisma.$transaction(
          async (tx): Promise<RotationResult> => {
            const credential = await tx.refreshCredential.findUnique({
              where: { tokenHash },
              include: { session: true },
            });
            if (
              credential?.id !== identity.jti ||
              credential.sessionId !== identity.sid ||
              credential.session.accountId !== identity.sub
            )
              return { kind: 'invalid' };

            if (credential.status === RefreshCredentialStatus.ROTATED) {
              await tx.session.updateMany({
                where: { id: identity.sid, revokedAt: null },
                data: {
                  revokedAt: new Date(),
                  revocationReason: SessionRevocationReason.TOKEN_REUSE,
                },
              });
              return { kind: 'invalid' };
            }

            const now = new Date();
            if (
              credential.expiresAt <= now ||
              credential.session.expiresAt <= now ||
              credential.session.revokedAt !== null
            )
              return { kind: 'invalid' };

            const successorId = randomUUID();
            const issued = await this.issueTokens(
              identity.sub,
              identity.sid,
              successorId,
            );
            const expiresAt = this.refreshExpiration(issued.refreshToken);
            await tx.refreshCredential.create({
              data: {
                id: successorId,
                sessionId: identity.sid,
                tokenHash: this.tokens.hashRefresh(issued.refreshToken),
                status: RefreshCredentialStatus.ACTIVE,
                expiresAt,
              },
            });
            const rotated = await tx.refreshCredential.updateMany({
              where: {
                id: credential.id,
                sessionId: identity.sid,
                status: RefreshCredentialStatus.ACTIVE,
                successorId: null,
              },
              data: {
                status: RefreshCredentialStatus.ROTATED,
                rotatedAt: now,
                successorId,
              },
            });
            if (rotated.count !== 1) throw new ConditionalRotationFailure();

            const session = await tx.session.updateMany({
              where: {
                id: identity.sid,
                version: credential.session.version,
                revokedAt: null,
                expiresAt: { gt: now },
              },
              data: { version: { increment: 1 }, expiresAt },
            });
            if (session.count !== 1) throw new ConditionalRotationFailure();
            return { kind: 'success', tokens: issued };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        return result.kind === 'success' ? result.tokens : null;
      } catch (error) {
        if (
          attempt < SessionService.MAX_SERIALIZATION_ATTEMPTS &&
          (this.isPrismaCode(error, 'P2034') ||
            error instanceof ConditionalRotationFailure)
        )
          continue;
        if (error instanceof ConditionalRotationFailure) return null;
        throw error;
      }
    }
    return null;
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revocationReason: SessionRevocationReason.LOGOUT,
      },
    });
  }

  private isPrismaCode(error: unknown, code: string): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === code
    );
  }

  private expiresIn(token: string, now: number): number {
    const payload = this.decodePayload(token);
    if (typeof payload.exp !== 'number')
      throw new Error('Token has no expiration');
    return Math.max(0, payload.exp - now);
  }

  private decodePayload(token: string): Record<string, unknown> {
    const encoded = token.split('.')[1];
    if (encoded === undefined) throw new Error('Malformed issued token');
    return JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as Record<string, unknown>;
  }
}
