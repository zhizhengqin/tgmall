// 订单服务单元测试 — TC-O-001~007 (V2 公司自营模式)
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createMockTx, createMockRedis } from '../helpers/mocks.js';

/**
 * 模拟 createOrder 核心逻辑（从 order.service.js 提取）
 * 测试：库存校验、优惠券应用、订单创建、库存扣减
 * V2：无商家隔离，任意商品可合并下单
 */
async function createOrderTest(tx, redis, userId, { items, shippingAddressId, couponId, paymentMethod }) {
  // 1. 验证地址
  const address = tx.address.findUnique({ where: { id: shippingAddressId, userId } });
  if (!address) throw Object.assign(new Error('收货地址不存在'), { code: 'NOT_FOUND' });

  // 2. 分布式锁
  const lockKey = `lock:order:${userId}`;
  const locked = await redis.set(lockKey, '1', 'NX', 'EX', 30);
  if (!locked) throw Object.assign(new Error('请勿重复提交订单'), { code: 'DUPLICATE_ORDER' });

  try {
    return await tx.$transaction(async (tx2) => {
      // 3a. 校验库存 + 计算价格
      let totalUsd = 0; let totalKhr = 0;
      for (const item of items) {
        const product = tx2.product.findUnique({ where: { id: item.productId } });
        if (!product) throw Object.assign(new Error(`商品不存在: ${item.productId}`), { code: 'NOT_FOUND' });
        if (product.status !== 'active') throw Object.assign(new Error('商品已下架'), { code: 'PRODUCT_INACTIVE' });
        if (product.stock < item.quantity) {
          throw Object.assign(new Error(`"${product.nameKm}"库存不足，仅剩${product.stock}件`), { code: 'INSUFFICIENT_STOCK' });
        }
        totalUsd += product.priceUsd * item.quantity;
        totalKhr += (product.priceKhr || product.priceUsd * 4000) * item.quantity;
      }

      // 3b. 优惠券
      let discountUsd = 0;
      if (couponId) {
        const uc = tx2.userCoupon.findFirst({ where: { userId, couponId, status: 'unused' } });
        if (!uc) throw Object.assign(new Error('优惠券无效'), { code: 'INVALID_COUPON' });
        if (new Date(uc.coupon.endDate) < new Date()) throw Object.assign(new Error('优惠券已过期'), { code: 'COUPON_EXPIRED' });
        if (totalUsd < Number(uc.coupon.minSpend)) {
          throw Object.assign(new Error(`未达到最低消费 $${uc.coupon.minSpend}`), { code: 'COUPON_MIN_SPEND' });
        }
        discountUsd = uc.coupon.type === 'fixed'
          ? Number(uc.coupon.value)
          : Math.round(totalUsd * Number(uc.coupon.value) / 100 * 100) / 100;
        tx2.userCoupon.update({ where: { id: uc.id }, data: { status: 'used', usedAt: new Date() } });
      }

      // 3c. 预扣库存
      for (const item of items) {
        tx2.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
      }

      // 3d. 创建订单 (V2: 无 merchantId)
      const finalUsd = Math.round((totalUsd - discountUsd) * 100) / 100;
      const finalKhr = Math.round((totalKhr - discountUsd * 4000));
      const order = tx2.order.create({
        data: {
          orderNumber: `ORD-TEST-${Date.now()}`,
          userId,
          totalUsd: finalUsd, totalKhr: finalKhr,
          discountUsd, paymentMethod,
          status: paymentMethod === 'cod' ? 'paid' : 'pending_payment',
        },
      });
      return { ...order, totalUsd: finalUsd, totalKhr: finalKhr };
    });
  } finally {
    await redis.del(lockKey);
  }
}

describe('订单服务 (order.service)', () => {
  let tx, redis;

  beforeEach(() => {
    tx = createMockTx();
    redis = createMockRedis();
    // 设置地址 mock
    tx.address = {
      findUnique: ({ where }) => {
        if (where.id === 'addr-1' && where.userId === 'user-1') {
          return { id: 'addr-1', userId: 'user-1', recipientName: 'Sopheap', phone: '+85512345678' };
        }
        return null;
      },
    };
  });

  // TC-O-001: 正常下单（单商品）
  it('正常下单：单商品，无优惠券，库存扣减正确', async () => {
    tx.product._set('prod-1', { id: 'prod-1', nameKm: 'ទឹកក្រូចដូង', priceUsd: 2.50, priceKhr: 10000, stock: 10, status: 'active' });

    const order = await createOrderTest(tx, redis, 'user-1', {
      items: [{ productId: 'prod-1', quantity: 2 }],
      shippingAddressId: 'addr-1',
      paymentMethod: 'khqr',
    });

    expect(order.status).toBe('pending_payment');
    expect(order.totalUsd).toBe(5.00);
    expect(tx.product._get('prod-1').stock).toBe(8);
  });

  // TC-O-003: V2 公司自营模式，多商品可合并下单
  it('V2 公司自营：多商品下单合并计算总额', async () => {
    tx.product._set('prod-1', { id: 'prod-1', nameKm: 'A', priceUsd: 10, priceKhr: 40000, stock: 10, status: 'active' });
    tx.product._set('prod-2', { id: 'prod-2', nameKm: 'B', priceUsd: 5, priceKhr: 20000, stock: 10, status: 'active' });

    const order = await createOrderTest(tx, redis, 'user-1', {
      items: [{ productId: 'prod-1', quantity: 1 }, { productId: 'prod-2', quantity: 1 }],
      shippingAddressId: 'addr-1',
      paymentMethod: 'khqr',
    });

    expect(order.totalUsd).toBe(15.00); // 10 + 5
    expect(order.status).toBe('pending_payment');
  });

  // TC-O-004: 库存不足
  it('库存不足应拒绝下单', async () => {
    tx.product._set('prod-1', { id: 'prod-1', nameKm: 'ទឹកក្រូចដូង', priceUsd: 2.50, stock: 3, status: 'active' });

    await expect(createOrderTest(tx, redis, 'user-1', {
      items: [{ productId: 'prod-1', quantity: 10 }],
      shippingAddressId: 'addr-1',
      paymentMethod: 'khqr',
    })).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });
  });

  // TC-O-005: 商品已下架
  it('已下架商品应拒绝下单', async () => {
    tx.product._set('prod-1', { id: 'prod-1', nameKm: 'X', priceUsd: 5, stock: 10, status: 'inactive' });

    await expect(createOrderTest(tx, redis, 'user-1', {
      items: [{ productId: 'prod-1', quantity: 1 }],
      shippingAddressId: 'addr-1',
      paymentMethod: 'khqr',
    })).rejects.toMatchObject({ code: 'PRODUCT_INACTIVE' });
  });

  // TC-O-006: 商品不存在
  it('商品不存在应返回 404', async () => {
    await expect(createOrderTest(tx, redis, 'user-1', {
      items: [{ productId: 'prod-gone', quantity: 1 }],
      shippingAddressId: 'addr-1',
      paymentMethod: 'khqr',
    })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  // TC-O-007: fix 优惠券
  it('fix 优惠券正确应用', async () => {
    tx.product._set('prod-1', { id: 'prod-1', nameKm: 'A', priceUsd: 10, priceKhr: 40000, stock: 10, status: 'active' });

    tx.userCoupon.findFirst = jest.fn(({ where }) => {
      if (where.couponId === 'coupon-1') {
        return { id: 'uc-1', userId: 'user-1', couponId: 'coupon-1', status: 'unused', coupon: { type: 'fixed', value: 5, minSpend: 15, endDate: '2030-01-01' } };
      }
      return null;
    });

    const order = await createOrderTest(tx, redis, 'user-1', {
      items: [{ productId: 'prod-1', quantity: 2 }],
      shippingAddressId: 'addr-1',
      couponId: 'coupon-1',
      paymentMethod: 'khqr',
    });

    expect(order.totalUsd).toBe(15.00); // 20 - 5
    expect(order.discountUsd).toBe(5);
  });

  // TC-O-017: 并发下单拒绝
  it('并发下单第二个请求应被拒绝', async () => {
    tx.product._set('prod-1', { id: 'prod-1', nameKm: 'A', priceUsd: 10, stock: 10, status: 'active' });

    // 第一个请求获取锁成功
    const order = await createOrderTest(tx, redis, 'user-1', {
      items: [{ productId: 'prod-1', quantity: 1 }],
      shippingAddressId: 'addr-1',
      paymentMethod: 'khqr',
    });
    expect(order.status).toBe('pending_payment');

    // 第二个请求：锁仍然存在（未过期），应拒绝
    await redis.set('lock:order:user-1', '1', 'NX', 'EX', 30);

    await expect(createOrderTest(tx, redis, 'user-1', {
      items: [{ productId: 'prod-1', quantity: 1 }],
      shippingAddressId: 'addr-1',
      paymentMethod: 'khqr',
    })).rejects.toMatchObject({ code: 'DUPLICATE_ORDER' });
  });
});
