import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions, JwtVerifyOptions } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import type { AppConfiguration } from '../config/configuration';

export interface TokenIdentity {
  sub: string;
  sid: string;
}

export interface RefreshTokenIdentity extends TokenIdentity {
  jti: string;
}

@Injectable()
export class TokenService {
  private readonly accessOptions: JwtSignOptions;
  private readonly refreshOptions: JwtSignOptions;
  private readonly accessVerifyOptions: JwtVerifyOptions;
  private readonly refreshVerifyOptions: JwtVerifyOptions;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService<AppConfiguration, true>,
  ) {
    const issuer = config.get('jwt.issuer', { infer: true });
    const audience = config.get('jwt.audience', { infer: true });
    const common = { algorithm: 'HS384' as const, issuer, audience };
    this.accessOptions = {
      ...common,
      secret: config.get('jwt.accessSecret', { infer: true }),
      expiresIn: config.get('jwt.accessTtl', { infer: true }),
    };
    this.refreshOptions = {
      ...common,
      secret: config.get('jwt.refreshSecret', { infer: true }),
      expiresIn: config.get('jwt.refreshTtl', { infer: true }),
    };
    this.accessVerifyOptions = this.verificationOptions(
      this.accessOptions.secret,
      issuer,
      audience,
    );
    this.refreshVerifyOptions = this.verificationOptions(
      this.refreshOptions.secret,
      issuer,
      audience,
    );
  }

  issueAccess(identity: TokenIdentity): Promise<string> {
    return this.jwt.signAsync(
      { ...identity, typ: 'access' },
      this.accessOptions,
    );
  }

  issueRefresh(identity: RefreshTokenIdentity): Promise<string> {
    return this.jwt.signAsync(
      { ...identity, typ: 'refresh' },
      this.refreshOptions,
    );
  }

  async verifyAccess(token: string): Promise<TokenIdentity> {
    const payload = await this.jwt.verifyAsync<Record<string, unknown>>(
      token,
      this.accessVerifyOptions,
    );
    this.assertPayload(payload, 'access', false);
    return { sub: payload.sub, sid: payload.sid };
  }

  async verifyRefresh(token: string): Promise<RefreshTokenIdentity> {
    const payload = await this.jwt.verifyAsync<Record<string, unknown>>(
      token,
      this.refreshVerifyOptions,
    );
    this.assertPayload(payload, 'refresh', true);
    return { sub: payload.sub, sid: payload.sid, jti: payload.jti };
  }

  hashRefresh(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private verificationOptions(
    secret: JwtSignOptions['secret'],
    issuer: string,
    audience: string,
  ): JwtVerifyOptions {
    return {
      secret,
      algorithms: ['HS384'],
      issuer,
      audience,
    };
  }

  private assertPayload(
    payload: Record<string, unknown>,
    type: 'access' | 'refresh',
    requiresJti: boolean,
  ): asserts payload is Record<string, unknown> & RefreshTokenIdentity {
    if (
      payload.typ !== type ||
      typeof payload.sub !== 'string' ||
      typeof payload.sid !== 'string' ||
      (requiresJti && typeof payload.jti !== 'string')
    ) {
      throw new Error('Invalid token payload');
    }
  }
}
