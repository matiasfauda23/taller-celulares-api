/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createAuthApp, registerBody } from '../../helpers/auth-app';
import { cleanAuthDatabase } from '../../helpers/auth-database';

describe('POST /auth/logout', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createAuthApp();
  });
  beforeEach(async () => cleanAuthDatabase(app));
  afterAll(async () => app.close());
  it('is 204/idempotent, blocks its refresh, keeps access and sibling session usable', async () => {
    const one = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerBody())
      .expect(201);
    const two = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ana@example.com', password: registerBody().password })
      .expect(200);
    const authorization = `Bearer ${one.body.tokens.accessToken as string}`;
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', authorization)
      .expect(204)
      .expect('');
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', authorization)
      .expect(204);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', authorization)
      .expect(200);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: one.body.tokens.refreshToken })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: two.body.tokens.refreshToken })
      .expect(200);
  });
});
