import { Injectable } from '@nestjs/common';
import type { Account } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Account | null> {
    return this.prisma.account.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<Account | null> {
    return this.prisma.account.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }
}
