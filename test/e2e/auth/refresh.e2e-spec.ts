/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createAuthApp, registerBody } from '../../helpers/auth-app';
import { cleanAuthDatabase } from '../../helpers/auth-database';

describe('POST /auth/refresh', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createAuthApp();
  });
  beforeEach(async () => cleanAuthDatabase(app));
  afterAll(async () => app.close());
  it('rotates once and rejects reuse without leaking internal data', async () => {
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerBody())
      .expect(201);
    const token = registered.body.tokens.refreshToken as string;
    const rotated = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: token })
      .expect(200);
    expect(rotated.body.tokens.refreshToken).not.toBe(token);
    expect(JSON.stringify(rotated.body)).not.toMatch(
      /tokenHash|password|secret/i,
    );
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: token })
      .expect(401);
  });
  it('has no more than one observable concurrent winner', async () => {
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerBody())
      .expect(201);
    const token = registered.body.tokens.refreshToken as string;
    const responses = await Promise.all([
      request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: token }),
      request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: token }),
    ]);
    expect(
      responses.filter((r) => r.status === 200).length,
    ).toBeLessThanOrEqual(1);
    expect(responses.every((r) => [200, 401].includes(r.status))).toBe(true);
  });
});
