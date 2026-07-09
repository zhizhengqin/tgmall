// 订单服务真实 createOrder 配送规则集成测试
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const productStore = new Map();

jest.unstable_mockModule('../../src/config/database.js', () => ({
  default: {
    address: { findFirst: jest.fn() },
    deliveryRule: { findFirst: jest.fn() },
    systemSetting: { findMany: jest.fn(() => [{ key: 'exchange_rate', value: '4000' }]) },
    product: {
      findUnique: jest.fn(({ where }) => productStore.get(where.id) || null),
      update: jest.fn(({ where, data }) => {
        const p = productStore.get(where.id);
        if (!p) return null;
        if (data.stock?.decrement) p.stock -= data.stock.decrement;
        return p;
      }),
    },
    $transaction: jest.fn(async (fn) => fn({
      product: {
        findUnique: jest.fn(({ where }) => productStore.get(where.id) || null),
        update: jest.fn(({ where, data }) => {
          const p = productStore.get(where.id);
          if (!p) return null;
          if (data.stock?.decrement) p.stock -= data.stock.decrement;
          else if (data.stock?.increment) p.stock += data.stock.increment;
          else if (typeof data.stock === 'number') p.stock = data.stock;
          if (typeof data.status === 'string') p.status = data.status;
          return p;
        }),
      },
      $queryRaw: jest.fn((_strings, ...values) => {
        const productId = values[0];
        const p = productStore.get(productId);
        if (!p) return [];
        return [{
          id: p.id,
          name_km: p.nameKm,
          name_en: p.nameEn || null,
          name_zh: p.nameZh || null,
          price_usd: p.priceUsd,
          price_khr: p.priceKhr,
          stock: p.stock,
          status: p.status,
          images: p.images || null,
        }];
      }),
      productSku: { findFirst: jest.fn(() => null), findMany: jest.fn(() => []), update: jest.fn() },
      userCoupon: { findFirst: jest.fn(() => null), findMany: jest.fn(() => []) },
      order: {
        create: jest.fn(({ data }) => ({ id: 'order-1', ...data })),
      },
      stockLog: { create: jest.fn() },
    })),
    user: { findUnique: jest.fn(() => null), findFirst: jest.fn(() => null) },
  },
}));

jest.unstable_mockModule('../../src/config/redis.js', () => ({
  default: {
    set: jest.fn(() => 'OK'),
    get: jest.fn(() => null),
    del: jest.fn(() => 1),
  },
}));

jest.unstable_mockModule('../../src/utils/orderNumber.js', () => ({
  generateOrderNumber: jest.fn(() => 'ORD-TEST-001'),
}));

const { createOrder } = await import('../../src/services/order.service.js');
const prisma = (await import('../../src/config/database.js')).default;

describe('createOrder 配送规则集成', () => {
  beforeEach(() => {
    productStore.clear();
    jest.clearAllMocks();
  });

  function mockAddress(overrides = {}) {
    prisma.address.findFirst.mockResolvedValue({
      id: 'addr-1',
      userId: 'user-1',
      recipientName: 'Sopheap',
      phone: '+85512345678',
      province: 'Phnom Penh',
      district: 'Chamkarmon',
      detail: 'Street 228',
      cityCode: 'phnom_penh',
      ...overrides,
    });
  }

  function mockDeliveryRule(overrides = {}) {
    prisma.deliveryRule.findFirst.mockResolvedValue({
      cityCode: 'phnom_penh',
      minOrderAmountUsd: 4,
      shippingFeeUsd: 1,
      freeShippingThresholdUsd: 0,
      status: 'active',
      ...overrides,
    });
  }

  it('将配送费计入订单总价', async () => {
    mockAddress();
    mockDeliveryRule();
    productStore.set('prod-1', { id: 'prod-1', nameKm: 'A', priceUsd: 5, priceKhr: 20000, stock: 10, status: 'active' });

    const order = await createOrder('user-1', {
      items: [{ product_id: 'prod-1', quantity: 1 }],
      shipping_address_id: 'addr-1',
      payment_method: 'khqr',
    });

    expect(order.shippingFeeUsd).toBe(1);
    expect(order.totalUsd).toBe(6);
    expect(order.status).toBe('pending_payment');
  });

  it('地址无 cityCode 时根据 province 归一化匹配配送规则', async () => {
    mockAddress({ cityCode: null, province: '金边' });
    mockDeliveryRule();
    productStore.set('prod-1', { id: 'prod-1', nameKm: 'A', priceUsd: 6, priceKhr: 24000, stock: 10, status: 'active' });

    const order = await createOrder('user-1', {
      items: [{ product_id: 'prod-1', quantity: 1 }],
      shipping_address_id: 'addr-1',
      payment_method: 'cod',
    });

    expect(order.totalUsd).toBe(7);
    expect(order.status).toBe('confirmed');
  });

  it('子订单金额未满起送额时拒绝下单', async () => {
    mockAddress();
    mockDeliveryRule();
    productStore.set('prod-1', { id: 'prod-1', nameKm: 'A', priceUsd: 3, priceKhr: 12000, stock: 10, status: 'active' });

    await expect(createOrder('user-1', {
      items: [{ product_id: 'prod-1', quantity: 1 }],
      shipping_address_id: 'addr-1',
      payment_method: 'khqr',
    })).rejects.toMatchObject({ errorCode: 'ORDER_MIN_AMOUNT_NOT_MET' });
  });

  it('满足免邮门槛时运费为 0', async () => {
    mockAddress();
    mockDeliveryRule({ shippingFeeUsd: 2, freeShippingThresholdUsd: 30 });
    productStore.set('prod-1', { id: 'prod-1', nameKm: 'A', priceUsd: 35, priceKhr: 140000, stock: 10, status: 'active' });

    const order = await createOrder('user-1', {
      items: [{ product_id: 'prod-1', quantity: 1 }],
      shipping_address_id: 'addr-1',
      payment_method: 'khqr',
    });

    expect(order.shippingFeeUsd).toBe(0);
    expect(order.totalUsd).toBe(35);
  });

  it('地址所在城市无配送规则时拒绝下单', async () => {
    mockAddress({ cityCode: 'unknown_city' });
    prisma.deliveryRule.findFirst.mockResolvedValue(null);
    productStore.set('prod-1', { id: 'prod-1', nameKm: 'A', priceUsd: 10, priceKhr: 40000, stock: 10, status: 'active' });

    await expect(createOrder('user-1', {
      items: [{ product_id: 'prod-1', quantity: 1 }],
      shipping_address_id: 'addr-1',
      payment_method: 'khqr',
    })).rejects.toMatchObject({ errorCode: 'DELIVERY_NOT_AVAILABLE' });
  });
});
