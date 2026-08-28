/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createAuthApp, registerBody } from '../../helpers/auth-app';
import { cleanAuthDatabase } from '../../helpers/auth-database';

describe('authentication security and Swagger', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createAuthApp();
  });
  beforeEach(async () => cleanAuthDatabase(app));
  afterAll(async () => app.close());
  it('documents exactly the five authentication operations and bearer scheme', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    const paths = Object.keys(response.body.paths).filter((path) =>
      path.startsWith('/auth/'),
    );
    expect(paths.sort()).toEqual([
      '/auth/login',
      '/auth/logout',
      '/auth/me',
      '/auth/refresh',
      '/auth/register',
    ]);
    expect(response.body.components.securitySchemes['access-token']).toEqual(
      expect.objectContaining({ type: 'http', scheme: 'bearer' }),
    );
  });
  it('applies normalized-email throttling with Retry-After and no email oracle', async () => {
    const bodies = Array.from({ length: 4 }, (_, index) =>
      registerBody(index % 2 ? ' RATE@example.com ' : 'rate@example.com'),
    );
    const responses = [];
    for (const body of bodies)
      responses.push(
        await request(app.getHttpServer()).post('/auth/register').send(body),
      );
    const limited = responses.find((response) => response.status === 429);
    expect(limited).toBeDefined();
    expect(limited?.headers['retry-after']).toBeDefined();
    expect(JSON.stringify(limited?.body)).not.toContain('rate@example.com');
  });
});
