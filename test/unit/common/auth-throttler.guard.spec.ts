import { createHmac } from 'node:crypto';
import { AuthThrottlerGuard } from '../../../src/common/security/auth-throttler.guard';

describe('AuthThrottlerGuard trackers', () => {
  const secret = 'rate-limit-secret';
  const guard = new AuthThrottlerGuard(
    {} as never,
    {} as never,
    {} as never,
    { get: () => secret } as never,
  );
  it('uses a normalized keyed digest that never exposes email', () => {
    const tracker = guard.emailTracker(' User@Example.COM ');
    expect(tracker).toBe(
      createHmac('sha256', secret).update('user@example.com').digest('hex'),
    );
    expect(tracker).not.toContain('user@example.com');
  });
  it('tracks origin without accepting email as origin', () => {
    expect(guard.originTracker({ ip: '192.0.2.1' })).toBe('192.0.2.1');
    expect(guard.originTracker({})).toBe('unknown-origin');
  });
});
