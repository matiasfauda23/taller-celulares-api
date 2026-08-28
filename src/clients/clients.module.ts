import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WorkshopsModule } from '../workshops/workshops.module';
import { ClientsController } from './clients.controller';
import { ClientsMapper } from './clients.mapper';
import { ClientsService } from './clients.service';
@Module({
  imports: [AuthModule, WorkshopsModule],
  controllers: [ClientsController],
  providers: [ClientsService, ClientsMapper],
})
export class ClientsModule {}
