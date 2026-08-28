import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateWorkOrderDto } from './create-work-order.dto';
export class UpdateWorkOrderDto extends PartialType(
  OmitType(CreateWorkOrderDto, ['deviceId', 'receivedAt'] as const),
) {}
