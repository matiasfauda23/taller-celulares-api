import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';
import { PaginationDto } from '../common/dto';
import { PrismaService } from '../prisma/prisma.service';
import { WorkshopsService } from '../workshops/workshops.service';
import { DevicesMapper } from './devices.mapper';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
const ACTIVE = [
  WorkOrderStatus.RECEIVED,
  WorkOrderStatus.DIAGNOSING,
  WorkOrderStatus.WAITING_PARTS,
  WorkOrderStatus.REPAIRING,
  WorkOrderStatus.READY,
];
@Injectable()
export class DevicesService {
  constructor(
    private prisma: PrismaService,
    private workshops: WorkshopsService,
    private mapper: DevicesMapper,
  ) {}
  private async wid(a: string) {
    const w = await this.workshops.findByAccountId(a);
    if (!w) throw new NotFoundException();
    return w.id;
  }
  private async client(w: string, id: string) {
    const c = await this.prisma.client.findFirst({
      where: { id, workshopId: w, archivedAt: null },
    });
    if (!c) throw new NotFoundException();
  }
  async create(a: string, d: CreateDeviceDto) {
    const workshopId = await this.wid(a);
    await this.client(workshopId, d.clientId);
    return this.mapper.toPublic(
      await this.prisma.device.create({
        data: Object.assign({}, d, { workshopId }),
      }),
    );
  }
  async list(a: string, q: PaginationDto) {
    const workshopId = await this.wid(a),
      where = { workshopId, archivedAt: null };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.device.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.device.count({ where }),
    ]);
    return {
      data: rows.map((x) => this.mapper.toPublic(x)),
      meta: { page: q.page, limit: q.limit, total },
    };
  }
  async get(a: string, id: string) {
    const workshopId = await this.wid(a);
    const x = await this.prisma.device.findFirst({ where: { id, workshopId } });
    if (!x) throw new NotFoundException();
    return this.mapper.toPublic(x);
  }
  async update(a: string, id: string, d: UpdateDeviceDto) {
    const workshopId = await this.wid(a);
    const x = await this.prisma.device.findFirst({ where: { id, workshopId } });
    if (!x) throw new NotFoundException();
    if (x.archivedAt) throw new ConflictException();
    if (d.clientId) await this.client(workshopId, d.clientId);
    return this.mapper.toPublic(
      await this.prisma.device.update({ where: { id }, data: d }),
    );
  }
  async archive(a: string, id: string) {
    const workshopId = await this.wid(a);
    const x = await this.prisma.device.findFirst({ where: { id, workshopId } });
    if (!x) throw new NotFoundException();
    if (x.archivedAt) return this.mapper.toPublic(x);
    if (
      await this.prisma.workOrder.count({
        where: { deviceId: id, workshopId, status: { in: ACTIVE } },
      })
    )
      throw new ConflictException();
    return this.mapper.toPublic(
      await this.prisma.device.update({
        where: { id },
        data: { archivedAt: new Date() },
      }),
    );
  }
}
