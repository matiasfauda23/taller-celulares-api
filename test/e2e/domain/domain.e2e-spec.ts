/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-confusing-void-expression */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthService } from '../../../src/auth/auth.service';
import { createAuthApp, registerBody } from '../../helpers/auth-app';
import { cleanAuthDatabase } from '../../helpers/auth-database';

interface Created {
  id: string;
}

describe('domain API', () => {
  let app: INestApplication;
  let token: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  beforeAll(async () => {
    app = await createAuthApp();
  });
  beforeEach(async () => {
    await cleanAuthDatabase(app);
    token = (await app.get(AuthService).register(registerBody())).tokens
      .accessToken;
  });
  afterAll(async () => app.close());

  async function client() {
    const response = await request(app.getHttpServer())
      .post('/clients')
      .set(auth())
      .send({
        firstName: 'Ana',
        lastName: 'Pérez',
        phone: '123',
        address: 'Main 1',
      })
      .expect(201);
    return response.body as Created;
  }
  async function device(clientId: string) {
    const response = await request(app.getHttpServer())
      .post('/devices')
      .set(auth())
      .send({
        clientId,
        brand: 'Apple',
        model: 'iPhone',
        physicalCondition: 'Screen cracked',
      })
      .expect(201);
    return response.body as Created;
  }

  it('performs Client CRUD and logical archival', async () => {
    const value = await client();
    await request(app.getHttpServer())
      .get('/clients')
      .set(auth())
      .expect(200)
      .expect(({ body }) => expect(body.data).toHaveLength(1));
    await request(app.getHttpServer())
      .patch(`/clients/${value.id}`)
      .set(auth())
      .send({ phone: '456' })
      .expect(200)
      .expect(({ body }) => expect(body.phone).toBe('456'));
    await request(app.getHttpServer())
      .delete(`/clients/${value.id}`)
      .set(auth())
      .expect(200);
    await request(app.getHttpServer())
      .get('/clients')
      .set(auth())
      .expect(200)
      .expect(({ body }) => expect(body.data).toHaveLength(0));
    await request(app.getHttpServer())
      .get(`/clients/${value.id}`)
      .set(auth())
      .expect(200);
  });

  it('performs Device CRUD and rejects credential properties', async () => {
    const c = await client();
    const value = await device(c.id);
    await request(app.getHttpServer())
      .get(`/devices/${value.id}`)
      .set(auth())
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/devices/${value.id}`)
      .set(auth())
      .send({ color: 'Black' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/devices')
      .set(auth())
      .send({
        clientId: c.id,
        brand: 'X',
        model: 'Y',
        physicalCondition: 'Good',
        pin: '1234',
      })
      .expect(400);
    await request(app.getHttpServer())
      .delete(`/devices/${value.id}`)
      .set(auth())
      .expect(200);
  });

  it('creates, updates state, reads, and archives a WorkOrder', async () => {
    const c = await client(),
      d = await device(c.id);
    const created = await request(app.getHttpServer())
      .post('/work-orders')
      .set(auth())
      .send({ deviceId: d.id, reportedIssue: 'No power' })
      .expect(201);
    const id = (created.body as Created).id;
    expect(created.body.status).toBe('RECEIVED');
    expect(created.body.number).toBe('ORD-000001');
    await request(app.getHttpServer())
      .patch(`/work-orders/${id}/status`)
      .set(auth())
      .send({ status: 'DIAGNOSING' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/work-orders/${id}`)
      .set(auth())
      .send({ diagnosis: 'Battery failure' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/work-orders/${id}/status`)
      .set(auth())
      .send({ status: 'CANCELLED' })
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/work-orders/${id}`)
      .set(auth())
      .expect(200);
    await request(app.getHttpServer())
      .get('/work-orders')
      .set(auth())
      .expect(200)
      .expect(({ body }) => expect(body.data).toHaveLength(0));
    await request(app.getHttpServer())
      .get(`/work-orders/${id}`)
      .set(auth())
      .expect(200);
  });

  it('requires access tokens and rejects undeclared properties', async () => {
    await request(app.getHttpServer()).get('/clients').expect(401);
    await request(app.getHttpServer())
      .post('/clients')
      .set(auth())
      .send({
        firstName: 'A',
        lastName: 'B',
        phone: '1',
        address: 'X',
        extra: true,
      })
      .expect(400);
  });

  it('returns the same 404 for foreign and missing resources', async () => {
    const owned = await client();
    token = (
      await app.get(AuthService).register(registerBody('other@example.com'))
    ).tokens.accessToken;
    await request(app.getHttpServer())
      .get(`/clients/${owned.id}`)
      .set(auth())
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/clients/${owned.id}`)
      .set(auth())
      .send({ phone: '9' })
      .expect(404);
    await request(app.getHttpServer())
      .get('/clients/00000000-0000-4000-8000-000000000000')
      .set(auth())
      .expect(404);
  });
});
