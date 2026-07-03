// 自动确认收货单元测试
import { describe, it, expect } from '@jest/globals';
import { createMockTx } from '../helpers/mocks.js';
import { autoCompleteOrders } from '../../src/jobs/orderAutoComplete.js';

describe('自动确认收货 (orderAutoComplete)', () => {
  // 兼容处理：autoCompleteOrders 的 db 参数可能期望纯 Prisma 或 mock tx
  // mock tx 的 findMany 只支持 findFirst 按单字段匹配模式，
  // autoCompleteOrders 用 where 对象查询，需要手动构建支持

  function makeDb(orders) {
    const store = new Map();
    for (const o of orders) {
      store.set(o.id, { ...o });
    }

    return {
      order: {
        findMany: async ({ where }) => {
          const results = [];
          for (const o of store.values()) {
            let match = true;
            for (const [key, condition] of Object.entries(where)) {
              if (typeof condition === 'object' && condition !== null && 'lt' in condition) {
                // 时间比较: { lt: Date }
                const dateVal = o[key];
                if (!dateVal || !(dateVal < condition.lt)) {
                  match = false;
                  break;
                }
              } else if (typeof condition === 'object' && condition !== null && 'not' in condition) {
                // not 条件
                if (o[key] === condition.not) {
                  match = false;
                  break;
                }
              } else {
                // 等值匹配
                if (o[key] !== condition) {
                  match = false;
                  break;
                }
              }
            }
            if (match) results.push({ ...o });
          }
          return results;
        },
        update: async ({ where, data }) => {
          const order = store.get(where.id);
          if (!order) throw new Error('Order not found');
          Object.assign(order, data);
          return order;
        },
      },
    };
  }

  const NOW = new Date('2026-07-03T12:00:00Z');
  const EIGHT_DAYS_AGO = new Date('2026-06-25T10:00:00Z');
  const THREE_DAYS_AGO = new Date('2026-06-30T10:00:00Z');

  // 过期 7 天的 cutoff：NOW - 7 天 = 2026-06-26T12:00:00Z
  const cutoff = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000);

  it('在线支付 shipped > 7 天应自动完成', async () => {
    const db = makeDb([
      { id: 'o1', orderNumber: 'ORD-001', status: 'shipped', paymentMethod: 'khqr', shippedAt: EIGHT_DAYS_AGO, paidAt: null },
    ]);

    const result = await autoCompleteOrders(db, cutoff);
    expect(result.completed).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it('在线支付 shipped ≤ 7 天不应完成', async () => {
    const db = makeDb([
      { id: 'o2', orderNumber: 'ORD-002', status: 'shipped', paymentMethod: 'aba_pay', shippedAt: THREE_DAYS_AGO, paidAt: null },
    ]);

    const result = await autoCompleteOrders(db, cutoff);
    expect(result.completed).toBe(0);
  });

  it('COD paid > 7 天应自动完成', async () => {
    const db = makeDb([
      { id: 'o3', orderNumber: 'ORD-003', status: 'paid', paymentMethod: 'cod', shippedAt: null, paidAt: EIGHT_DAYS_AGO },
    ]);

    const result = await autoCompleteOrders(db, cutoff);
    expect(result.completed).toBe(1);
  });

  it('COD paid ≤ 7 天不应完成', async () => {
    const db = makeDb([
      { id: 'o4', orderNumber: 'ORD-004', status: 'paid', paymentMethod: 'cod', shippedAt: null, paidAt: THREE_DAYS_AGO },
    ]);

    const result = await autoCompleteOrders(db, cutoff);
    expect(result.completed).toBe(0);
  });

  it('在线支付 + COD 混合批量完成', async () => {
    const db = makeDb([
      { id: 'o5', orderNumber: 'ORD-005', status: 'shipped', paymentMethod: 'wing_pay', shippedAt: EIGHT_DAYS_AGO, paidAt: null },
      { id: 'o6', orderNumber: 'ORD-006', status: 'paid', paymentMethod: 'cod', shippedAt: null, paidAt: EIGHT_DAYS_AGO },
      { id: 'o7', orderNumber: 'ORD-007', status: 'shipped', paymentMethod: 'khqr', shippedAt: THREE_DAYS_AGO, paidAt: null },
    ]);

    const result = await autoCompleteOrders(db, cutoff);
    expect(result.completed).toBe(2);
  });

  it('pending_payment / cancelled / completed 订单不应被处理', async () => {
    const db = makeDb([
      { id: 'o8', orderNumber: 'ORD-008', status: 'pending_payment', paymentMethod: 'khqr', shippedAt: EIGHT_DAYS_AGO, paidAt: null },
      { id: 'o9', orderNumber: 'ORD-009', status: 'cancelled', paymentMethod: 'cod', shippedAt: null, paidAt: EIGHT_DAYS_AGO },
      { id: 'o10', orderNumber: 'ORD-010', status: 'completed', paymentMethod: 'khqr', shippedAt: EIGHT_DAYS_AGO, paidAt: null },
    ]);

    const result = await autoCompleteOrders(db, cutoff);
    expect(result.completed).toBe(0);
  });

  it('完成后的订单 status 和 completedAt 应被正确更新', async () => {
    const db = makeDb([
      { id: 'o11', orderNumber: 'ORD-011', status: 'shipped', paymentMethod: 'khqr', shippedAt: EIGHT_DAYS_AGO, paidAt: null },
    ]);

    const model = db.order;
    let updatedId = null;
    let updatedData = null;
    model.update = async ({ where, data }) => {
      updatedId = where.id;
      updatedData = data;
      return { id: where.id, ...data };
    };

    await autoCompleteOrders({ order: model }, cutoff);
    expect(updatedId).toBe('o11');
    expect(updatedData.status).toBe('completed');
    expect(updatedData.completedAt).toBeInstanceOf(Date);
  });
});
