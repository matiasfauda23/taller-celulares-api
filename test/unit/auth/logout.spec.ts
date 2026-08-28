/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { SessionService } from '../../../src/auth/session.service';

describe('logout decisions', () => {
  it('is idempotent and targets only the authenticated sid', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const service = new SessionService(
      { session: { updateMany } } as never,
      {} as never,
    );
    await service.logout('sid');
    await service.logout('sid');
    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(updateMany).toHaveBeenLastCalledWith({
      where: { id: 'sid', revokedAt: null },
      data: { revokedAt: expect.any(Date), revocationReason: 'LOGOUT' },
    });
  });
});
