import { ConflictException } from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';
import {
  assertArchivable,
  assertStatusTransition,
} from '../../../src/work-orders/work-order-rules';

describe('work order rules', () => {
  it.each<[WorkOrderStatus, WorkOrderStatus]>([
    ['RECEIVED', 'DIAGNOSING'],
    ['RECEIVED', 'CANCELLED'],
    ['DIAGNOSING', 'WAITING_PARTS'],
    ['DIAGNOSING', 'REPAIRING'],
    ['WAITING_PARTS', 'REPAIRING'],
    ['REPAIRING', 'WAITING_PARTS'],
    ['REPAIRING', 'READY'],
    ['READY', 'DELIVERED'],
    ['READY', 'REPAIRING'],
  ])('allows %s to %s', (current, next) => {
    expect(() => {
      assertStatusTransition(current, next, 'diagnosed', 'repaired');
    }).not.toThrow();
  });
  it('requires diagnosis before leaving diagnosing for work', () => {
    expect(() => {
      assertStatusTransition('DIAGNOSING', 'WAITING_PARTS', ' ', null);
    }).toThrow(ConflictException);
  });
  it('requires performed work before ready', () => {
    expect(() => {
      assertStatusTransition('REPAIRING', 'READY', 'diagnosed', '');
    }).toThrow(ConflictException);
  });
  it.each<[WorkOrderStatus, WorkOrderStatus]>([
    ['RECEIVED', 'READY'],
    ['DELIVERED', 'REPAIRING'],
    ['CANCELLED', 'RECEIVED'],
  ])('rejects %s to %s', (current, next) => {
    expect(() => {
      assertStatusTransition(current, next, 'diagnosed', 'repaired');
    }).toThrow(ConflictException);
  });
  it.each<WorkOrderStatus>(['DELIVERED', 'CANCELLED'])(
    'allows archiving %s',
    (status) => {
      expect(() => {
        assertArchivable(status);
      }).not.toThrow();
    },
  );
  it('rejects archiving active orders', () => {
    expect(() => {
      assertArchivable('READY');
    }).toThrow(ConflictException);
  });
});
