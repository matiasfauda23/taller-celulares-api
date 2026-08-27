import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { TokenService } from '../../../src/auth/token.service';
import type { AppConfiguration } from '../../../src/config/configuration';

describe('TokenService', () => {
  interface DecodedToken {
    sub: string;
    sid: string;
    typ: string;
    jti?: string;
    iss: string;
    aud: string;
    iat: number;
    exp: number;
  }
  const values: Record<string, string> = {
    'jwt.accessSecret': 'unit-access-secret-long-and-distinct',
    'jwt.refreshSecret': 'unit-refresh-secret-long-and-distinct',
    'jwt.accessTtl': '15m',
    'jwt.refreshTtl': '7d',
    'jwt.issuer': 'unit-issuer',
    'jwt.audience': 'unit-audience',
  };
  const config = {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService<AppConfiguration, true>;
  const jwt = new JwtService();
  const service = new TokenService(jwt, config);
  const identity = { sub: 'account-id', sid: 'session-id' };

  it('issues access and refresh tokens with separate claims and TTLs', async () => {
    const access = await service.issueAccess(identity);
    const refresh = await service.issueRefresh({
      ...identity,
      jti: 'credential-id',
    });
    const accessPayload = jwt.decode<DecodedToken>(access);
    const refreshPayload = jwt.decode<DecodedToken>(refresh);

    expect(accessPayload).toMatchObject({ ...identity, typ: 'access' });
    expect(refreshPayload).toMatchObject({
      ...identity,
      typ: 'refresh',
      jti: 'credential-id',
    });
    expect(accessPayload.iss).toBe('unit-issuer');
    expect(accessPayload.aud).toBe('unit-audience');
    expect(accessPayload.exp - accessPayload.iat).toBe(900);
    expect(refreshPayload.exp - refreshPayload.iat).toBe(604800);
    await expect(service.verifyAccess(access)).resolves.toEqual(identity);
    await expect(service.verifyRefresh(refresh)).resolves.toEqual({
      ...identity,
      jti: 'credential-id',
    });
  });

  it('rejects cross-use by both secret and token type', async () => {
    const access = await service.issueAccess(identity);
    const refresh = await service.issueRefresh({ ...identity, jti: 'jti' });

    await expect(service.verifyAccess(refresh)).rejects.toThrow();
    await expect(service.verifyRefresh(access)).rejects.toThrow();

    const wrongTypeAccessSecret = await jwt.signAsync(
      { ...identity, jti: 'jti', typ: 'refresh' },
      {
        secret: values['jwt.accessSecret'],
        algorithm: 'HS384',
        issuer: values['jwt.issuer'],
        audience: values['jwt.audience'],
        expiresIn: '15m',
      },
    );
    await expect(service.verifyAccess(wrongTypeAccessSecret)).rejects.toThrow(
      'Invalid token payload',
    );
  });

  it('hashes the complete refresh JWT with SHA-256', () => {
    const token = 'header.payload.signature';
    expect(service.hashRefresh(token)).toBe(
      createHash('sha256').update(token, 'utf8').digest('hex'),
    );
    expect(service.hashRefresh(token)).toHaveLength(64);
  });
});
