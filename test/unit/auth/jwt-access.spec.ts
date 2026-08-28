import { UnauthorizedException } from '@nestjs/common';
import { JwtAccessStrategy } from '../../../src/auth/strategies/jwt-access.strategy';

describe('JwtAccessStrategy', () => {
  const config = {
    get: jest.fn(
      (key: string) =>
        ({
          'jwt.accessSecret': 'a'.repeat(64),
          'jwt.issuer': 'issuer',
          'jwt.audience': 'audience',
        })[key],
    ),
  };
  it('accepts only access identities and does not depend on persistence', () => {
    const strategy = new JwtAccessStrategy(config as never);
    expect(
      strategy.validate({ typ: 'access', sub: 'account', sid: 'session' }),
    ).toEqual({ sub: 'account', sid: 'session' });
    expect(() =>
      strategy.validate({ typ: 'refresh', sub: 'account', sid: 'session' }),
    ).toThrow(UnauthorizedException);
    expect(config.get).not.toHaveBeenCalledWith(
      expect.stringContaining('database'),
      expect.anything(),
    );
  });
});
