import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHmac } from 'node:crypto';
import { PasswordService } from '../../../src/auth/password.service';
import type { AppConfiguration } from '../../../src/config/configuration';

describe('PasswordService', () => {
  const pepper = 'unit-test-password-pepper-not-for-runtime';
  const config = {
    get: jest.fn((key: string) =>
      key === 'security.passwordPepper' ? pepper : 12,
    ),
  } as unknown as ConfigService<AppConfiguration, true>;
  const service = new PasswordService(config);

  it('hashes the Base64 HMAC-SHA-384 prehash with bcrypt cost 12', async () => {
    const password = '  unchanged password 🔐  ';
    const expectedPrehash = createHmac('sha384', pepper)
      .update(password, 'utf8')
      .digest('base64');
    const hash = await service.hash(password);

    expect(expectedPrehash).toHaveLength(64);
    expect(bcrypt.getRounds(hash)).toBe(12);
    await expect(bcrypt.compare(expectedPrehash, hash)).resolves.toBe(true);
    await expect(service.verify(password, hash)).resolves.toBe(true);
    await expect(service.verify(password.trim(), hash)).resolves.toBe(false);
  });

  it('distinguishes long UTF-8 passwords that differ after byte 72', async () => {
    const prefix = 'á'.repeat(40) + 'x'.repeat(40);
    const first = `${prefix}first`;
    const second = `${prefix}second`;
    expect(Buffer.byteLength(first, 'utf8')).toBeGreaterThan(72);
    const hash = await service.hash(first);

    await expect(service.verify(first, hash)).resolves.toBe(true);
    await expect(service.verify(second, hash)).resolves.toBe(false);
  });
});
