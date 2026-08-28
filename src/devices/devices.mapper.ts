import { Injectable } from '@nestjs/common';
import type { Device } from '@prisma/client';
@Injectable()
export class DevicesMapper {
  toPublic(v: Device) {
    const { workshopId, ...device } = v;
    void workshopId;
    return device;
  }
}
