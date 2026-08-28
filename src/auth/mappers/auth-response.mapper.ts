import { Injectable } from '@nestjs/common';
import type { Account, Workshop } from '@prisma/client';
import { AccountPublicMapper } from '../../accounts/account-public.mapper';
import { WorkshopPublicMapper } from '../../workshops/workshop-public.mapper';
import {
  AuthResponseDto,
  AuthTokensDto,
  MeResponseDto,
  RefreshResponseDto,
} from '../dto/auth-response.dto';

@Injectable()
export class AuthResponseMapper {
  constructor(
    private readonly accounts: AccountPublicMapper,
    private readonly workshops: WorkshopPublicMapper,
  ) {}

  toAuthResponse(
    account: Account,
    workshop: Workshop,
    tokens: AuthTokensDto,
  ): AuthResponseDto {
    return {
      account: this.accounts.toPublic(account),
      workshop: this.workshops.toPublic(workshop),
      tokens: this.toTokens(tokens),
    };
  }

  toRefreshResponse(tokens: AuthTokensDto): RefreshResponseDto {
    return { tokens: this.toTokens(tokens) };
  }

  toMeResponse(account: Account, workshop: Workshop): MeResponseDto {
    return {
      account: this.accounts.toPublic(account),
      workshop: this.workshops.toPublic(workshop),
    };
  }

  private toTokens(tokens: AuthTokensDto): AuthTokensDto {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessExpiresIn: tokens.accessExpiresIn,
      refreshExpiresIn: tokens.refreshExpiresIn,
    };
  }
}
