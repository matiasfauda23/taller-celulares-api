/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-non-null-assertion */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createAuthApp, registerBody } from '../../helpers/auth-app';
import { cleanAuthDatabase } from '../../helpers/auth-database';

describe('public response secret audit', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createAuthApp();
  });
  beforeEach(async () => cleanAuthDatabase(app));
  afterAll(async () => app.close());
  it('never emits password, pepper, hashes, JWT secrets, stack or SQL', async () => {
    const responses = [
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerBody()),
      await request(app.getHttpServer()).post('/auth/login').send({
        email: 'missing@example.com',
        password: registerBody().password,
      }),
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid' }),
      await request(app.getHttpServer()).get('/auth/me'),
    ];
    const serialized = JSON.stringify(responses.map((r) => r.body));
    for (const forbidden of [
      registerBody().password,
      process.env.PASSWORD_PEPPER!,
      process.env.JWT_SECRET!,
      process.env.JWT_REFRESH_SECRET!,
      'passwordHash',
      'tokenHash',
      'SELECT ',
      'INSERT ',
      'Prisma',
      'stack',
    ])
      expect(serialized).not.toContain(forbidden);
  });
});
