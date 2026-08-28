import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkshopsService } from '../workshops/workshops.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { WorkOrderQueryDto } from './dto/work-order-query.dto';
import { assertArchivable, assertStatusTransition } from './work-order-rules';
import { WorkOrdersMapper } from './work-orders.mapper';
@Injectable()
export class WorkOrdersService {
  constructor(
    private prisma: PrismaService,
    private workshops: WorkshopsService,
    private mapper: WorkOrdersMapper,
  ) {}
  private async wid(a: string) {
    const w = await this.workshops.findByAccountId(a);
    if (!w) throw new NotFoundException();
    return w.id;
  }
  private async row(w: string, id: string) {
    const x = await this.prisma.workOrder.findFirst({
      where: { id, workshopId: w },
    });
    if (!x) throw new NotFoundException();
    return x;
  }
  private writable(x: { archivedAt: Date | null; status: WorkOrderStatus }) {
    if (x.archivedAt || x.status === 'DELIVERED' || x.status === 'CANCELLED')
      throw new ConflictException();
  }
  async create(a: string, d: CreateWorkOrderDto) {
    const workshopId = await this.wid(a);
    const device = await this.prisma.device.findFirst({
      where: {
        id: d.deviceId,
        workshopId,
        archivedAt: null,
        client: { archivedAt: null },
      },
    });
    if (!device) throw new NotFoundException();
    const row = await this.prisma.$transaction(async (tx) => {
      const workshop = await tx.workshop.update({
        where: { id: workshopId },
        data: { nextOrderNumber: { increment: 1 } },
        select: { nextOrderNumber: true },
      });
      const { receivedAt, estimatedAt, ...data } = d;
      return tx.workOrder.create({
        data: {
          ...data,
          workshopId,
          orderNumber: workshop.nextOrderNumber - 1,
          receivedAt: receivedAt ? new Date(receivedAt) : undefined,
          estimatedAt: estimatedAt ? new Date(estimatedAt) : undefined,
        },
      });
    });
    return this.mapper.toPublic(row);
  }
  async list(a: string, q: WorkOrderQueryDto) {
    const workshopId = await this.wid(a);
    const where: Prisma.WorkOrderWhereInput = {
      workshopId,
      archivedAt: null,
      status: q.status,
      deviceId: q.deviceId,
      device: q.clientId ? { clientId: q.clientId } : undefined,
      receivedAt:
        q.from || q.to
          ? {
              gte: q.from ? new Date(q.from) : undefined,
              lte: q.to ? new Date(q.to) : undefined,
            }
          : undefined,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.workOrder.findMany({
        where,
        orderBy: [{ receivedAt: 'desc' }, { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.workOrder.count({ where }),
    ]);
    return {
      data: rows.map((x) => this.mapper.toPublic(x)),
      meta: { page: q.page, limit: q.limit, total },
    };
  }
  async get(a: string, id: string) {
    return this.mapper.toPublic(await this.row(await this.wid(a), id));
  }
  async update(a: string, id: string, d: UpdateWorkOrderDto) {
    const workshopId = await this.wid(a),
      x = await this.row(workshopId, id);
    this.writable(x);
    const { estimatedAt, ...data } = d;
    return this.mapper.toPublic(
      await this.prisma.workOrder.update({
        where: { id },
        data: {
          ...data,
          estimatedAt: estimatedAt ? new Date(estimatedAt) : estimatedAt,
        },
      }),
    );
  }
  async status(a: string, id: string, d: UpdateStatusDto) {
    const workshopId = await this.wid(a);
    const updated = await this.prisma.$transaction(async (tx) => {
      const x = await tx.workOrder.findFirst({ where: { id, workshopId } });
      if (!x) throw new NotFoundException();
      this.writable(x);
      assertStatusTransition(x.status, d.status, x.diagnosis, x.workPerformed);
      return tx.workOrder.update({
        where: { id },
        data: {
          status: d.status,
          deliveredAt: d.status === 'DELIVERED' ? new Date() : undefined,
        },
      });
    });
    return this.mapper.toPublic(updated);
  }
  async archive(a: string, id: string) {
    const workshopId = await this.wid(a),
      x = await this.row(workshopId, id);
    if (x.archivedAt) return this.mapper.toPublic(x);
    assertArchivable(x.status);
    return this.mapper.toPublic(
      await this.prisma.workOrder.update({
        where: { id },
        data: { archivedAt: new Date() },
      }),
    );
  }
}
