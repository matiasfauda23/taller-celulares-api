import type { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';

export async function cleanAuthDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.refreshCredential.deleteMany();
  await prisma.session.deleteMany();
  await prisma.workshop.deleteMany();
  await prisma.account.deleteMany();
}
