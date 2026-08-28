import { Module } from '@nestjs/common';
import { AccountPublicMapper } from './account-public.mapper';
import { AccountsService } from './accounts.service';

@Module({
  providers: [AccountsService, AccountPublicMapper],
  exports: [AccountsService, AccountPublicMapper],
})
export class AccountsModule {}
