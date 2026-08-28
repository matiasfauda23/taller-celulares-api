import type { INestApplication } from '@nestjs/common';
import { AuthService } from '../../../src/auth/auth.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { createAuthApp, registerBody } from '../../helpers/auth-app';
import { cleanAuthDatabase } from '../../helpers/auth-database';

describe('refresh persistence and concurrency', () => {
  let app: INestApplication;
  let auth: AuthService;
  let prisma: PrismaService;
  beforeAll(async () => {
    app = await createAuthApp();
    auth = app.get(AuthService);
    prisma = app.get(PrismaService);
  });
  beforeEach(async () => cleanAuthDatabase(app));
  afterAll(async () => app.close());
  it('creates one successor and rejects reuse by revoking only that session', async () => {
    const original = await auth.register(registerBody());
    const sibling = await auth.login({
      email: original.account.email,
      password: registerBody().password,
    });
    await auth.refresh(original.tokens.refreshToken);
    await expect(
      auth.refresh(original.tokens.refreshToken),
    ).rejects.toBeDefined();
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: 'asc' },
      include: { credentials: true },
    });
    expect(
      sessions.find((s) => s.credentials.some((c) => c.status === 'ROTATED'))
        ?.revocationReason,
    ).toBe('TOKEN_REUSE');
    await expect(
      auth.refresh(sibling.tokens.refreshToken),
    ).resolves.toBeDefined();
  });
  it('allows at most one concurrent rotation winner', async () => {
    const original = await auth.register(registerBody());
    const results = await Promise.allSettled([
      auth.refresh(original.tokens.refreshToken),
      auth.refresh(original.tokens.refreshToken),
    ]);
    expect(
      results.filter((x) => x.status === 'fulfilled').length,
    ).toBeLessThanOrEqual(1);
  });
});
