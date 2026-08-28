import { Injectable } from '@nestjs/common';
import type { Workshop } from '@prisma/client';
import { WorkshopPublicDto } from '../auth/dto/auth-response.dto';

@Injectable()
export class WorkshopPublicMapper {
  toPublic(workshop: Workshop): WorkshopPublicDto {
    return {
      id: workshop.id,
      name: workshop.name,
      address: workshop.address,
    };
  }
}
