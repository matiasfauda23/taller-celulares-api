import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkshopsService } from '../workshops/workshops.service';
import { PaginationDto } from '../common/dto';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientsMapper } from './clients.mapper';
const ACTIVE = [
  WorkOrderStatus.RECEIVED,
  WorkOrderStatus.DIAGNOSING,
  WorkOrderStatus.WAITING_PARTS,
  WorkOrderStatus.REPAIRING,
  WorkOrderStatus.READY,
];
@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private workshops: WorkshopsService,
    private mapper: ClientsMapper,
  ) {}
  private async workshopId(accountId: string) {
    const w = await this.workshops.findByAccountId(accountId);
    if (!w) throw new NotFoundException();
    return w.id;
  }
  async create(accountId: string, dto: CreateClientDto) {
    const workshopId = await this.workshopId(accountId);
    return this.mapper.toPublic(
      await this.prisma.client.create({
        data: Object.assign({}, dto, { workshopId }),
      }),
    );
  }
  async list(accountId: string, q: PaginationDto) {
    const workshopId = await this.workshopId(accountId);
    const where = { workshopId, archivedAt: null };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.client.count({ where }),
    ]);
    return {
      data: rows.map((x) => this.mapper.toPublic(x)),
      meta: { page: q.page, limit: q.limit, total },
    };
  }
  async get(accountId: string, id: string) {
    const workshopId = await this.workshopId(accountId);
    const row = await this.prisma.client.findFirst({
      where: { id, workshopId },
    });
    if (!row) throw new NotFoundException();
    return this.mapper.toPublic(row);
  }
  async update(accountId: string, id: string, dto: UpdateClientDto) {
    const workshopId = await this.workshopId(accountId);
    const row = await this.prisma.client.findFirst({
      where: { id, workshopId },
    });
    if (!row) throw new NotFoundException();
    if (row.archivedAt) throw new ConflictException();
    return this.mapper.toPublic(
      await this.prisma.client.update({ where: { id }, data: dto }),
    );
  }
  async archive(accountId: string, id: string) {
    const workshopId = await this.workshopId(accountId);
    const row = await this.prisma.client.findFirst({
      where: { id, workshopId },
    });
    if (!row) throw new NotFoundException();
    if (row.archivedAt) return this.mapper.toPublic(row);
    const active = await this.prisma.workOrder.count({
      where: { workshopId, status: { in: ACTIVE }, device: { clientId: id } },
    });
    if (active) throw new ConflictException();
    return this.mapper.toPublic(
      await this.prisma.client.update({
        where: { id },
        data: { archivedAt: new Date() },
      }),
    );
  }
}
