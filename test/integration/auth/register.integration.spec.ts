/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { INestApplication } from '@nestjs/common';
import { PasswordService } from '../../../src/auth/password.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { cleanAuthDatabase } from '../../helpers/auth-database';
import { createAuthApp, registerBody } from '../../helpers/auth-app';
import { AuthService } from '../../../src/auth/auth.service';

describe('registration persistence', () => {
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
  it('atomically persists the aggregate with only a bcrypt hash', async () => {
    const input = registerBody();
    const result = await auth.register(input);
    const account = await prisma.account.findUnique({
      where: { email: input.email },
      include: { workshop: true, sessions: { include: { credentials: true } } },
    });
    expect(account?.workshop?.accountId).toBe(account?.id);
    expect(account?.sessions).toHaveLength(1);
    expect(account?.sessions[0]?.credentials).toHaveLength(1);
    expect(account?.passwordHash).not.toBe(input.password);
    expect(
      await app
        .get(PasswordService)
        .verify(input.password, account!.passwordHash),
    ).toBe(true);
    expect(JSON.stringify(account)).not.toContain(result.tokens.refreshToken);
  });
  it('permits at most one concurrent aggregate for the same normalized email', async () => {
    const settled = await Promise.allSettled([
      auth.register(registerBody('same@example.com')),
      auth.register(registerBody('same@example.com')),
    ]);
    expect(settled.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(
      await prisma.account.count({ where: { email: 'same@example.com' } }),
    ).toBe(1);
  });
  it('bcrypt verifies full UTF-8 passwords differing after byte 72', async () => {
    const prefix = 'á'.repeat(40);
    const one = `${prefix}A-different-tail`;
    const two = `${prefix}B-different-tail`;
    const result = await auth.register({
      ...registerBody('utf8@example.com'),
      password: one,
    });
    const account = await prisma.account.findUniqueOrThrow({
      where: { id: result.account.id },
    });
    expect(
      await app.get(PasswordService).verify(one, account.passwordHash),
    ).toBe(true);
    expect(
      await app.get(PasswordService).verify(two, account.passwordHash),
    ).toBe(false);
  });
});
