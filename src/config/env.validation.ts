const REQUIRED_KEYS = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ISSUER',
  'JWT_AUDIENCE',
  'PASSWORD_PEPPER',
  'CORS_ALLOWED_ORIGINS',
  'TRUST_PROXY',
  'RATE_LIMIT_KEY_SECRET',
] as const;

const SECRET_KEYS = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'PASSWORD_PEPPER',
  'RATE_LIMIT_KEY_SECRET',
] as const;

const TTL_PATTERN = /^\d+[smhd]$/;

export type ValidatedEnvironment = Record<string, string | undefined>;

export function validateEnvironment(
  config: Record<string, unknown>,
): ValidatedEnvironment {
  const validated: ValidatedEnvironment = {};

  for (const [key, value] of Object.entries(config)) {
    validated[key] = typeof value === 'string' ? value : undefined;
  }

  validated.JWT_ACCESS_TTL ??= '15m';
  validated.JWT_REFRESH_TTL ??= '7d';
  validated.BCRYPT_ROUNDS ??= '12';

  for (const key of REQUIRED_KEYS) {
    if (!validated[key]?.trim()) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  const value = (key: string): string => {
    const result = validated[key];
    if (result === undefined)
      throw new Error(`Missing required environment variable: ${key}`);
    return result;
  };

  if (!['development', 'test', 'production'].includes(value('NODE_ENV'))) {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  const port = Number(value('PORT'));
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  try {
    const databaseUrl = new URL(value('DATABASE_URL'));
    if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol))
      throw new Error();
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL');
  }

  for (const key of ['JWT_ACCESS_TTL', 'JWT_REFRESH_TTL'] as const) {
    if (!TTL_PATTERN.test(value(key)))
      throw new Error(`${key} must be a duration such as 15m`);
  }

  if (validated.BCRYPT_ROUNDS !== '12')
    throw new Error('BCRYPT_ROUNDS must be 12');

  const origins = value('CORS_ALLOWED_ORIGINS')
    .split(',')
    .map((origin) => origin.trim());
  if (origins.some((origin) => !isHttpOrigin(origin))) {
    throw new Error('CORS_ALLOWED_ORIGINS must contain explicit HTTP origins');
  }

  if (validated.TRUST_PROXY !== 'false') {
    const proxies = value('TRUST_PROXY')
      .split(',')
      .map((proxy) => proxy.trim());
    if (proxies.some((proxy) => proxy.length === 0 || proxy === 'true')) {
      throw new Error('TRUST_PROXY must be false or an explicit proxy list');
    }
  }

  for (const [index, left] of SECRET_KEYS.entries()) {
    for (const right of SECRET_KEYS.slice(index + 1)) {
      if (validated[left] === validated[right]) {
        throw new Error('Application secrets must be distinct');
      }
    }
  }

  return validated;
}

function isHttpOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && url.origin === value;
  } catch {
    return false;
  }
}
