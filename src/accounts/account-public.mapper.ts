import { Injectable } from '@nestjs/common';
import type { Account } from '@prisma/client';
import { AccountPublicDto } from '../auth/dto/auth-response.dto';

@Injectable()
export class AccountPublicMapper {
  toPublic(account: Account): AccountPublicDto {
    return {
      id: account.id,
      ownerName: account.ownerName,
      email: account.email,
    };
  }
}
