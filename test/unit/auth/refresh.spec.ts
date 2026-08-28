/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { RefreshCredentialStatus } from '@prisma/client';
import { SessionService } from '../../../src/auth/session.service';

describe('refresh decisions', () => {
  it('rejects an unknown credential without issuing a successor', async () => {
    const tx = {
      refreshCredential: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      session: { updateMany: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((fn: (arg: typeof tx) => unknown) => fn(tx)),
    };
    const tokens = { hashRefresh: jest.fn().mockReturnValue('h') };
    await expect(
      new SessionService(prisma as never, tokens as never).rotate('raw', {
        sub: 'a',
        sid: 's',
        jti: 'j',
      }),
    ).resolves.toBeNull();
    expect(tx.refreshCredential.create).not.toHaveBeenCalled();
  });
  it('treats reuse as local session revocation', async () => {
    const tx = {
      refreshCredential: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'j',
          sessionId: 's',
          status: RefreshCredentialStatus.ROTATED,
          session: { id: 's', accountId: 'a' },
        }),
      },
      session: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      $transaction: jest.fn((fn: (arg: typeof tx) => unknown) => fn(tx)),
    };
    const tokens = { hashRefresh: jest.fn().mockReturnValue('h') };
    await expect(
      new SessionService(prisma as never, tokens as never).rotate('raw', {
        sub: 'a',
        sid: 's',
        jti: 'j',
      }),
    ).resolves.toBeNull();
    expect(tx.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's', revokedAt: null },
        data: expect.objectContaining({ revocationReason: 'TOKEN_REUSE' }),
      }),
    );
  });
});
