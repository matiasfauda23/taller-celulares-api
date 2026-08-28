import { Injectable } from '@nestjs/common';
import type { Workshop } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkshopsService {
  constructor(private readonly prisma: PrismaService) {}

  findByAccountId(accountId: string): Promise<Workshop | null> {
    return this.prisma.workshop.findUnique({ where: { accountId } });
  }
}
