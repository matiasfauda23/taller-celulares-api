import type { INestApplication } from '@nestjs/common';
import { AuthService } from '../../../src/auth/auth.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { createAuthApp, registerBody } from '../../helpers/auth-app';
import { cleanAuthDatabase } from '../../helpers/auth-database';

describe('login persistence', () => {
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
  it('creates an independent session and stores only refresh hashes', async () => {
    await auth.register(registerBody());
    const first = await auth.login({
      email: 'ana@example.com',
      password: registerBody().password,
    });
    const second = await auth.login({
      email: 'ana@example.com',
      password: registerBody().password,
    });
    expect(first.tokens.refreshToken).not.toBe(second.tokens.refreshToken);
    const sessions = await prisma.session.findMany({
      include: { credentials: true },
    });
    expect(sessions).toHaveLength(3);
    const raw = [
      first.tokens.refreshToken,
      second.tokens.refreshToken,
      registerBody().password,
    ].join('|');
    expect(JSON.stringify(sessions)).not.toContain(first.tokens.refreshToken);
    expect(JSON.stringify(sessions)).not.toContain(raw);
  });
});
