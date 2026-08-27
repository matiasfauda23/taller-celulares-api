import { BadRequestException, HttpException } from '@nestjs/common';
import { ApiErrorFilter } from '../../../src/common/errors/api-error.filter';
import { validateEnvironment } from '../../../src/config/env.validation';

const validEnvironment = (): Record<string, string> => ({
  NODE_ENV: 'test',
  PORT: '3000',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/app',
  JWT_SECRET: 'access-secret-value',
  JWT_REFRESH_SECRET: 'refresh-secret-value',
  JWT_ISSUER: 'test-issuer',
  JWT_AUDIENCE: 'test-audience',
  PASSWORD_PEPPER: 'password-pepper-value',
  CORS_ALLOWED_ORIGINS: 'http://localhost:3001,https://example.test',
  TRUST_PROXY: 'false',
  RATE_LIMIT_KEY_SECRET: 'rate-limit-secret-value',
});

describe('environment validation (RF-019–RF-021, RF-029; CE-013)', () => {
  it('applies only public defaults', () => {
    const result = validateEnvironment(validEnvironment());
    expect(result).toMatchObject({
      JWT_ACCESS_TTL: '15m',
      JWT_REFRESH_TTL: '7d',
      BCRYPT_ROUNDS: '12',
    });
  });

  it.each(Object.keys(validEnvironment()))(
    'fails fast when %s is missing',
    (key) => {
      const environment = Object.fromEntries(
        Object.entries(validEnvironment()).filter(
          ([environmentKey]) => environmentKey !== key,
        ),
      );
      expect(() => validateEnvironment(environment)).toThrow(key);
    },
  );

  it('rejects every pair of equal secrets', () => {
    const pairs: [string, string][] = [
      ['JWT_SECRET', 'JWT_REFRESH_SECRET'],
      ['JWT_SECRET', 'PASSWORD_PEPPER'],
      ['JWT_SECRET', 'RATE_LIMIT_KEY_SECRET'],
      ['JWT_REFRESH_SECRET', 'PASSWORD_PEPPER'],
      ['JWT_REFRESH_SECRET', 'RATE_LIMIT_KEY_SECRET'],
      ['PASSWORD_PEPPER', 'RATE_LIMIT_KEY_SECRET'],
    ];
    for (const [left, right] of pairs) {
      const environment = validEnvironment();
      const repeatedSecret = environment[left];
      if (repeatedSecret === undefined) throw new Error('Invalid test fixture');
      environment[right] = repeatedSecret;
      expect(() => validateEnvironment(environment)).toThrow(
        'Application secrets must be distinct',
      );
    }
  });

  it('rejects permissive CORS and implicit trust proxy', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment(), CORS_ALLOWED_ORIGINS: '*' }),
    ).toThrow();
    expect(() =>
      validateEnvironment({ ...validEnvironment(), TRUST_PROXY: 'true' }),
    ).toThrow();
  });
});

describe('API error filter (RF-019–RF-021; CE-007)', () => {
  it('returns correctable validation details in the public contract', () => {
    const result = invokeFilter(
      new BadRequestException(['email must be valid']),
    );
    expect(result).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      path: '/auth/register',
      details: [{ field: 'email', message: 'email must be valid' }],
    });
  });

  it('sanitizes unexpected errors and internal HTTP responses', () => {
    const secret = 'sensitive-secret-value';
    const unexpected = invokeFilter(
      Object.assign(new Error(secret), { cause: secret, query: secret }),
    );
    const internalHttp = invokeFilter(
      new HttpException({ message: secret, cause: secret }, 500),
    );
    const output = JSON.stringify([unexpected, internalHttp]);

    expect(unexpected).toEqual({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      path: '/auth/register',
    });
    expect(output).not.toContain(secret);
    expect(output).not.toContain('stack');
    expect(output).not.toContain('cause');
    expect(output).not.toContain('query');
  });
});

function invokeFilter(exception: unknown): unknown {
  let body: unknown;
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn((value: unknown) => {
      body = value;
    }),
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ originalUrl: '/auth/register' }),
      getResponse: () => response,
    }),
  };

  new ApiErrorFilter().catch(exception, host as never);
  return body;
}
