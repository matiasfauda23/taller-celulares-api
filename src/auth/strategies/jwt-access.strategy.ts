import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AppConfiguration } from '../../config/configuration';
import type { TokenIdentity } from '../token.service';

interface AccessPayload {
  sub?: unknown;
  sid?: unknown;
  typ?: unknown;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  constructor(config: ConfigService<AppConfiguration, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt.accessSecret', { infer: true }),
      algorithms: ['HS384'],
      issuer: config.get('jwt.issuer', { infer: true }),
      audience: config.get('jwt.audience', { infer: true }),
    });
  }

  validate(payload: AccessPayload): TokenIdentity {
    if (
      payload.typ !== 'access' ||
      typeof payload.sub !== 'string' ||
      typeof payload.sid !== 'string'
    ) {
      throw new UnauthorizedException();
    }
    return { sub: payload.sub, sid: payload.sid };
  }
}
