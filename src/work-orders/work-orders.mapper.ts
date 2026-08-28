import { Injectable } from '@nestjs/common';
import type { WorkOrder } from '@prisma/client';
@Injectable()
export class WorkOrdersMapper {
  toPublic(v: WorkOrder) {
    const { workshopId, orderNumber, ...rest } = v;
    void workshopId;
    return {
      ...rest,
      number: `ORD-${String(orderNumber).padStart(6, '0')}`,
      estimatedBudget: v.estimatedBudget?.toString() ?? null,
      finalPrice: v.finalPrice?.toString() ?? null,
    };
  }
}
