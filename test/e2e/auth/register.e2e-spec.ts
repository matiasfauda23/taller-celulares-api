/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createAuthApp, registerBody } from '../../helpers/auth-app';
import { cleanAuthDatabase } from '../../helpers/auth-database';

describe('POST /auth/register', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createAuthApp();
  });
  beforeEach(async () => cleanAuthDatabase(app));
  afterAll(async () => app.close());
  it('returns 201 with normalized public data and tokens', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerBody(' ANA@EXAMPLE.COM '))
      .expect(201);
    expect(response.body.account.email).toBe('ana@example.com');
    expect(response.body.tokens).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      }),
    );
    expect(JSON.stringify(response.body)).not.toMatch(
      /passwordHash|tokenHash|createdAt|updatedAt/,
    );
  });
  it('rejects undeclared and invalid properties uniformly', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...registerBody(), admin: true })
      .expect(400);
    expect(response.body).toEqual(
      expect.objectContaining({ statusCode: 400, path: '/auth/register' }),
    );
  });
});
