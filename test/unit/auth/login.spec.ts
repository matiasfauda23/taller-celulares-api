import { UnauthorizedException } from '@nestjs/common';
import { LoginDto } from '../../../src/auth/dto/login.dto';
import { AuthService } from '../../../src/auth/auth.service';
import { validateDto } from '../../helpers/validation';

describe('login validation and public error', () => {
  it('normalizes email, preserves password and rejects extras', async () => {
    await expect(
      validateDto(LoginDto, {
        email: ' USER@EXAMPLE.COM ',
        password: ' pass ',
      }),
    ).resolves.toEqual({ email: 'user@example.com', password: ' pass ' });
    await expect(
      validateDto(LoginDto, { email: 'a@b.co', password: 'x', role: 'admin' }),
    ).rejects.toBeDefined();
  });
  it('returns exactly the same error for missing account and wrong password', async () => {
    const prisma = { account: { findUnique: jest.fn() } };
    const passwords = { verify: jest.fn().mockResolvedValue(false) };
    const service = new AuthService(
      prisma as never,
      passwords as never,
      {} as never,
      {} as never,
      {} as never,
    );
    prisma.account.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'a', passwordHash: 'hash', workshop: {} });
    const capture = async (email: string) =>
      service
        .login({ email, password: 'wrong' })
        .catch((e: unknown) => (e as UnauthorizedException).getResponse());
    expect(await capture('missing@example.com')).toEqual(
      await capture('known@example.com'),
    );
  });
});
