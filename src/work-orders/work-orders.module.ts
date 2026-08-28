import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WorkshopsModule } from '../workshops/workshops.module';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersMapper } from './work-orders.mapper';
import { WorkOrdersService } from './work-orders.service';
@Module({
  imports: [AuthModule, WorkshopsModule],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService, WorkOrdersMapper],
})
export class WorkOrdersModule {}
