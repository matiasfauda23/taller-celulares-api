import { Module } from '@nestjs/common';
import { WorkshopPublicMapper } from './workshop-public.mapper';
import { WorkshopsService } from './workshops.service';

@Module({
  providers: [WorkshopsService, WorkshopPublicMapper],
  exports: [WorkshopsService, WorkshopPublicMapper],
})
export class WorkshopsModule {}
