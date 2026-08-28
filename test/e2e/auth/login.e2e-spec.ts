/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createAuthApp, registerBody } from '../../helpers/auth-app';
import { cleanAuthDatabase } from '../../helpers/auth-database';

describe('POST /auth/login', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createAuthApp();
  });
  beforeEach(async () => cleanAuthDatabase(app));
  afterAll(async () => app.close());
  it('creates a distinct token pair for each successful login', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerBody())
      .expect(201);
    const one = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ANA@example.com', password: registerBody().password })
      .expect(200);
    const two = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ana@example.com', password: registerBody().password })
      .expect(200);
    expect(one.body.tokens.refreshToken).not.toBe(two.body.tokens.refreshToken);
    expect(JSON.stringify(one.body)).not.toMatch(/passwordHash|tokenHash/);
  });
  it('does not reveal whether the email exists', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerBody())
      .expect(201);
    const missing = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'missing@example.com', password: 'wrong' })
      .expect(401);
    const wrong = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ana@example.com', password: 'wrong' })
      .expect(401);
    expect(missing.body).toEqual(wrong.body);
  });
});
