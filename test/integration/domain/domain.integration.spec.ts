import type { INestApplication } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthService } from '../../../src/auth/auth.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { createAuthApp, registerBody } from '../../helpers/auth-app';
import { cleanAuthDatabase } from '../../helpers/auth-database';

describe('domain PostgreSQL constraints', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  beforeAll(async () => {
    app = await createAuthApp();
    prisma = app.get(PrismaService);
  });
  beforeEach(async () => cleanAuthDatabase(app));
  afterAll(async () => app.close());

  it('enforces workshop ownership across client, device, and work order relations', async () => {
    const auth = app.get(AuthService);
    const first = await auth.register(registerBody());
    const second = await auth.register(registerBody('second@example.com'));
    const client = await prisma.client.create({
      data: {
        workshopId: first.workshop.id,
        firstName: 'A',
        lastName: 'B',
        phone: '1',
        address: 'X',
      },
    });
    await expect(
      prisma.device.create({
        data: {
          workshopId: second.workshop.id,
          clientId: client.id,
          brand: 'X',
          model: 'Y',
          physicalCondition: 'Good',
        },
      }),
    ).rejects.toMatchObject<Partial<Prisma.PrismaClientKnownRequestError>>({
      code: 'P2003',
    });
    const device = await prisma.device.create({
      data: {
        workshopId: first.workshop.id,
        clientId: client.id,
        brand: 'X',
        model: 'Y',
        physicalCondition: 'Good',
      },
    });
    await expect(
      prisma.workOrder.create({
        data: {
          workshopId: second.workshop.id,
          deviceId: device.id,
          orderNumber: 1,
          reportedIssue: 'Broken',
        },
      }),
    ).rejects.toMatchObject<Partial<Prisma.PrismaClientKnownRequestError>>({
      code: 'P2003',
    });
  });

  it('enforces non-negative amounts and workshop-local order numbers', async () => {
    const aggregate = await app.get(AuthService).register(registerBody());
    const client = await prisma.client.create({
      data: {
        workshopId: aggregate.workshop.id,
        firstName: 'A',
        lastName: 'B',
        phone: '1',
        address: 'X',
      },
    });
    const device = await prisma.device.create({
      data: {
        workshopId: aggregate.workshop.id,
        clientId: client.id,
        brand: 'X',
        model: 'Y',
        physicalCondition: 'Good',
      },
    });
    await expect(
      prisma.workOrder.create({
        data: {
          workshopId: aggregate.workshop.id,
          deviceId: device.id,
          orderNumber: 1,
          reportedIssue: 'Broken',
          estimatedBudget: new Prisma.Decimal(-1),
        },
      }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    await prisma.workOrder.create({
      data: {
        workshopId: aggregate.workshop.id,
        deviceId: device.id,
        orderNumber: 1,
        reportedIssue: 'Broken',
      },
    });
    await expect(
      prisma.workOrder.create({
        data: {
          workshopId: aggregate.workshop.id,
          deviceId: device.id,
          orderNumber: 1,
          reportedIssue: 'Again',
        },
      }),
    ).rejects.toMatchObject<Partial<Prisma.PrismaClientKnownRequestError>>({
      code: 'P2002',
    });
  });
});
