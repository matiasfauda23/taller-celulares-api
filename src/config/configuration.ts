export interface AppConfiguration {
  runtime: {
    nodeEnv: 'development' | 'test' | 'production';
    port: number;
  };
  database: { url: string };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtl: string;
    issuer: string;
    audience: string;
  };
  security: {
    bcryptRounds: 12;
    passwordPepper: string;
    rateLimitKeySecret: string;
    corsAllowedOrigins: string[];
    trustProxy: false | string[];
    registerOriginLimit: number;
    registerEmailLimit: number;
    loginOriginLimit: number;
    loginEmailLimit: number;
    globalRateLimit: number;
  };
}

const environmentValue = (key: string): string => {
  const value = process.env[key];
  if (value === undefined)
    throw new Error(`Validated environment value unavailable: ${key}`);
  return value;
};

/**
 * Signup throttles. The E2E suite registers a fresh account per spec file and every request
 * shares one IP, so the production defaults would throttle verification runs after a handful
 * of signups. Overridable per environment; the defaults stay production-safe.
 */
export const registerOriginLimit = (): number =>
  Number(process.env.REGISTER_ORIGIN_LIMIT ?? 5);
export const registerEmailLimit = (): number =>
  Number(process.env.REGISTER_EMAIL_LIMIT ?? 3);

/**
 * Login throttles, same rationale as the signup ones. A serial E2E spec signs in once per test
 * and every run shares one IP, so the production defaults throttle verification runs partway
 * through a suite. Overridable per environment; the defaults stay production-safe.
 */
export const loginOriginLimit = (): number =>
  Number(process.env.LOGIN_ORIGIN_LIMIT ?? 20);
export const loginEmailLimit = (): number =>
  Number(process.env.LOGIN_EMAIL_LIMIT ?? 5);

/** Same rationale as the signup throttles: a parallel E2E run bursts well past 100 req/min. */
export const globalRateLimit = (): number =>
  Number(process.env.GLOBAL_RATE_LIMIT ?? 100);

export default (): AppConfiguration => ({
  runtime: {
    nodeEnv: environmentValue(
      'NODE_ENV',
    ) as AppConfiguration['runtime']['nodeEnv'],
    port: Number(environmentValue('PORT')),
  },
  database: { url: environmentValue('DATABASE_URL') },
  jwt: {
    accessSecret: environmentValue('JWT_SECRET'),
    refreshSecret: environmentValue('JWT_REFRESH_SECRET'),
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
    issuer: environmentValue('JWT_ISSUER'),
    audience: environmentValue('JWT_AUDIENCE'),
  },
  security: {
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 12) as 12,
    passwordPepper: environmentValue('PASSWORD_PEPPER'),
    rateLimitKeySecret: environmentValue('RATE_LIMIT_KEY_SECRET'),
    corsAllowedOrigins: environmentValue('CORS_ALLOWED_ORIGINS')
      .split(',')
      .map((value) => value.trim()),
    trustProxy:
      process.env.TRUST_PROXY === 'false'
        ? false
        : environmentValue('TRUST_PROXY')
            .split(',')
            .map((value) => value.trim()),
    registerOriginLimit: registerOriginLimit(),
    registerEmailLimit: registerEmailLimit(),
    loginOriginLimit: loginOriginLimit(),
    loginEmailLimit: loginEmailLimit(),
    globalRateLimit: globalRateLimit(),
  },
});
