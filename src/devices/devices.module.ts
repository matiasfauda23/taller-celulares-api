import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WorkshopsModule } from '../workshops/workshops.module';
import { DevicesController } from './devices.controller';
import { DevicesMapper } from './devices.mapper';
import { DevicesService } from './devices.service';
@Module({
  imports: [AuthModule, WorkshopsModule],
  controllers: [DevicesController],
  providers: [DevicesService, DevicesMapper],
})
export class DevicesModule {}
