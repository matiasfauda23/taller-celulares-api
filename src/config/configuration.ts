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
  };
}

const environmentValue = (key: string): string => {
  const value = process.env[key];
  if (value === undefined)
    throw new Error(`Validated environment value unavailable: ${key}`);
  return value;
};

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
  },
});
