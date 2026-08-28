/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/restrict-template-expressions */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createAuthApp, registerBody } from '../../helpers/auth-app';
import { cleanAuthDatabase } from '../../helpers/auth-database';

describe('GET /auth/me', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createAuthApp();
  });
  beforeEach(async () => cleanAuthDatabase(app));
  afterAll(async () => app.close());
  it('rejects absent/invalid tokens and returns only public data for access JWT', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid')
      .expect(401);
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerBody())
      .expect(201);
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${registered.body.tokens.accessToken}`)
      .expect(200);
    expect(response.body).toEqual({
      account: registered.body.account,
      workshop: registered.body.workshop,
    });
    expect(JSON.stringify(response.body)).not.toMatch(/Hash|secret|password/i);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${registered.body.tokens.refreshToken}`)
      .expect(401);
  });
});
