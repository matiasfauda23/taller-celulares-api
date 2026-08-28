process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '3000';
process.env.JWT_SECRET ??= 'access-secret-that-is-long-and-distinct-0123456789';
process.env.JWT_REFRESH_SECRET ??=
  'refresh-secret-that-is-long-and-distinct-0123456789';
process.env.JWT_ISSUER ??= 'test-issuer';
process.env.JWT_AUDIENCE ??= 'test-audience';
process.env.PASSWORD_PEPPER ??= 'pepper-that-is-long-and-distinct-0123456789';
process.env.RATE_LIMIT_KEY_SECRET ??=
  'rate-key-that-is-long-and-distinct-0123456789';
process.env.CORS_ALLOWED_ORIGINS ??= 'http://localhost';
process.env.TRUST_PROXY ??= 'false';
process.env.BCRYPT_ROUNDS ??= '12';
