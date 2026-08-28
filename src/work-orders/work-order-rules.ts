import { ConflictException } from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';
const ALLOWED: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  RECEIVED: ['DIAGNOSING', 'CANCELLED'],
  DIAGNOSING: ['WAITING_PARTS', 'REPAIRING', 'CANCELLED'],
  WAITING_PARTS: ['REPAIRING', 'CANCELLED'],
  REPAIRING: ['WAITING_PARTS', 'READY', 'CANCELLED'],
  READY: ['DELIVERED', 'REPAIRING'],
  DELIVERED: [],
  CANCELLED: [],
};
export function assertStatusTransition(
  current: WorkOrderStatus,
  next: WorkOrderStatus,
  diagnosis: string | null,
  workPerformed: string | null,
) {
  if (!ALLOWED[current].includes(next)) throw new ConflictException();
  if (
    current === 'DIAGNOSING' &&
    (next === 'WAITING_PARTS' || next === 'REPAIRING') &&
    !diagnosis?.trim()
  )
    throw new ConflictException();
  if (current === 'REPAIRING' && next === 'READY' && !workPerformed?.trim())
    throw new ConflictException();
}
export function assertArchivable(status: WorkOrderStatus) {
  if (status !== 'DELIVERED' && status !== 'CANCELLED')
    throw new ConflictException();
}
