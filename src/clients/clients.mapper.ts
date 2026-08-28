import { Injectable } from '@nestjs/common';
import type { Client } from '@prisma/client';
@Injectable()
export class ClientsMapper {
  toPublic(value: Client) {
    const { workshopId, ...client } = value;
    void workshopId;
    return client;
  }
}
