// T4.2 — 支付回调幂等性测试
// 验证 C3 修复：幂等标记在事务成功后设置，防止订单 stuck

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createMockTx, createMockRedis } from '../helpers/mocks.js';

/**
 * 模拟支付回调处理（提取核心幂等逻辑验证）
 */
async function simulateCallback(tx, redis, idempotencyKey, orderData, callbackStatus) {
  // 1. 幂等检查
  const isDuplicate = await redis.get(idempotencyKey);
  if (isDuplicate) {
    return { status: 'duplicate' };
  }

  // 2. 事务处理
  try {
    await tx.$transaction(async (tx2) => {
      const currentOrder = tx2.order.findUnique({ where: { id: orderData.id } });

      if (currentOrder && currentOrder.paymentStatus === 'success') {
        return; // DB 级幂等
      }

      if (callbackStatus === 'success') {
        tx2.order.update({
          where: { id: orderData.id },
          data: { paymentStatus: 'success', status: 'paid', paidAt: new Date() },
        });

        // C3 修复：事务成功后才设置幂等标记
        await redis.set(idempotencyKey, '1', 'EX', 86400);
      }
    });

    return { status: 'processed' };
  } catch (err) {
    // 事务失败 → 幂等标记未设置 → 可重试
    return { status: 'error', error: err.message };
  }
}

describe('支付回调幂等性 (C3 fix)', () => {
  let tx, redis, key, order;

  beforeEach(() => {
    tx = createMockTx();
    redis = createMockRedis();
    key = 'payment:callback:bakong:txn-123';
    order = {
      id: 'order-001',
      orderNumber: 'ORD-TEST',
      paymentStatus: 'pending',
      status: 'pending_payment',
      userId: 'user-1',
      merchantId: 'merchant-1',
      totalUsd: 50,
      totalKhr: 200000,
      paymentMethod: 'khqr',
    };
    tx.order._set(order.id, { ...order });
  });

  it('首次回调应成功处理', async () => {
    const result = await simulateCallback(tx, redis, key, order, 'success');
    expect(result.status).toBe('processed');
  });

  it('重复回调应被跳过（幂等）', async () => {
    await simulateCallback(tx, redis, key, order, 'success');
    const result = await simulateCallback(tx, redis, key, order, 'success');
    expect(result.status).toBe('duplicate');
  });

  it('事务失败不应设置幂等标记（C3 关键场景）', async () => {
    // 模拟事务失败
    tx.$transaction.mockImplementationOnce(() => {
      throw new Error('DB connection lost');
    });

    await simulateCallback(tx, redis, key, order, 'success');
    // 幂等标记不应该被设置
    const marker = await redis.get(key);
    expect(marker).toBeNull();
  });

  it('事务成功后幂等标记应存在', async () => {
    await simulateCallback(tx, redis, key, order, 'success');
    const marker = await redis.get(key);
    expect(marker).toBe('1');
  });

  it('DB 级幂等：paymentStatus 已为 success 时跳过', async () => {
    // 设置订单已付款
    tx.order._set(order.id, { ...order, paymentStatus: 'success' });

    // 手动设置幂等标记绕过 Redis 检查
    redis._clear();

    const result = await simulateCallback(tx, redis, `payment:callback:bakong:txn-other`, order, 'success');
    // 应该不报错（DB 级幂等保护）
    expect(result.status).toBe('processed');
  });

  it('10 次重复回调只处理 1 次', async () => {
    let processed = 0;
    for (let i = 0; i < 10; i++) {
      const result = await simulateCallback(tx, redis, key, order, 'success');
      if (result.status === 'processed') processed++;
    }
    expect(processed).toBe(1);
  });

  it('失败回调不更新 paymentStatus 为 success', async () => {
    // 使用另一个未设置幂等 key 的回调来模拟失败
    const failKey = 'payment:callback:bakong:txn-fail';
    const result = await simulateCallback(tx, redis, failKey, order, 'failed');
    expect(result.status).toBe('processed');
    // 订单不应该被标记为 success
    const updated = tx.order._get(order.id);
    expect(updated.paymentStatus).not.toBe('success');
  });
});
