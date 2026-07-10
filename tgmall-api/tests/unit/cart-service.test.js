// 购物车服务单元测试
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createMockRedis } from '../helpers/mocks.js';

const prismaMock = {
  product: {
    findUnique: jest.fn(),
  },
  productSku: {
    findUnique: jest.fn(() => null),
    findFirst: jest.fn(() => null),
    findMany: jest.fn(() => []),
  },
  systemSetting: {
    findMany: jest.fn(() => [{ key: 'exchange_rate', value: '4000' }]),
  },
  userCoupon: {
    findFirst: jest.fn(),
  },
  deliveryRule: {
    findFirst: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/config/database.js', () => ({ default: prismaMock }));

let redisMock;
jest.unstable_mockModule('../../src/config/redis.js', () => ({
  default: {
    get: (key) => redisMock.get(key),
    set: (key, value, ...args) => redisMock.set(key, value, ...args),
    del: (key) => redisMock.del(key),
    eval: (script, numKeys, ...args) => redisMock.eval(script, numKeys, ...args),
  },
}));

const { checkoutPreview, addCartItem } = await import('../../src/services/cart.service.js');

describe('购物车服务', () => {
  beforeEach(() => {
    redisMock = createMockRedis();
    jest.clearAllMocks();
  });

  describe('checkoutPreview', () => {
    it('返回选中项的实时价格与运费', async () => {
      redisMock.set('cart:user1', JSON.stringify([
        { id: 'p1', productId: 'p1', quantity: 2, spec: {} },
        { id: 'p2', productId: 'p2', quantity: 1, spec: { size: 'L' } },
      ]));
      prismaMock.product.findUnique.mockImplementation(({ where }) => {
        if (where.id === 'p1') return Promise.resolve({ id: 'p1', nameKm: 'A', priceUsd: 5, priceKhr: 20000, stock: 10, images: [{ thumb_url: 'a.jpg' }], status: 'active' });
        if (where.id === 'p2') return Promise.resolve({ id: 'p2', nameKm: 'B', priceUsd: 8, priceKhr: 32000, stock: 3, images: [], status: 'active' });
        return Promise.resolve(null);
      });
      prismaMock.deliveryRule.findFirst.mockResolvedValue({
        cityCode: 'phnom_penh', shippingFeeUsd: 1, freeShippingThresholdUsd: 0, minOrderAmountUsd: 4,
      });

      const result = await checkoutPreview('user1', { itemIds: ['p1', 'p2'], cityCode: 'phnom_penh' });

      expect(result.items).toHaveLength(2);
      expect(result.priceBreakdown.subtotalUsd).toBe(18);
      expect(result.priceBreakdown.shippingFeeUsd).toBe(1);
      expect(result.priceBreakdown.totalUsd).toBe(19);
      expect(result.priceBreakdown.minOrderAmountUsd).toBe(4);
      expect(result.priceBreakdown.shortfallUsd).toBe(0);
    });

    it('应用有效优惠券', async () => {
      redisMock.set('cart:user1', JSON.stringify([{ id: 'p1', productId: 'p1', quantity: 1, spec: {} }]));
      prismaMock.product.findUnique.mockResolvedValue({ id: 'p1', nameKm: 'A', priceUsd: 20, priceKhr: 80000, stock: 10, images: [], status: 'active' });
      prismaMock.userCoupon.findFirst.mockResolvedValue({
        id: 'uc1',
        userId: 'user1',
        status: 'unused',
        coupon: { id: 'c1', status: 'active', type: 'fixed', value: 5, minSpend: 10, startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 86400000), titleKm: '券' },
      });
      prismaMock.deliveryRule.findFirst.mockResolvedValue({ cityCode: 'pp', shippingFeeUsd: 0, freeShippingThresholdUsd: 0, minOrderAmountUsd: 0 });

      const result = await checkoutPreview('user1', { itemIds: ['p1'], couponId: 'uc1' });

      expect(result.priceBreakdown.discountUsd).toBe(5);
      expect(result.priceBreakdown.totalUsd).toBe(15);
      expect(result.coupon).not.toBeNull();
    });

    it('库存不足时标记为无效项', async () => {
      redisMock.set('cart:user1', JSON.stringify([{ id: 'p1', productId: 'p1', quantity: 5, spec: {} }]));
      prismaMock.product.findUnique.mockResolvedValue({ id: 'p1', nameKm: 'A', priceUsd: 2, priceKhr: 8000, stock: 2, images: [], status: 'active' });
      prismaMock.deliveryRule.findFirst.mockResolvedValue({ cityCode: 'pp', shippingFeeUsd: 0, freeShippingThresholdUsd: 0, minOrderAmountUsd: 0 });

      const result = await checkoutPreview('user1', { itemIds: ['p1'] });

      expect(result.invalidItems).toHaveLength(1);
      expect(result.invalidItems[0].stockStatus).toBe('insufficient');
    });

    it('未选中商品时抛出错误', async () => {
      await expect(checkoutPreview('user1', { itemIds: [] })).rejects.toMatchObject({ errorCode: 'VALIDATION_ERROR' });
    });
  });

  describe('addCartItem', () => {
    it('新商品加入购物车', async () => {
      prismaMock.product.findUnique.mockResolvedValue({ id: 'p1', status: 'active' });
      const result = await addCartItem('user1', { product_id: 'p1', quantity: 2, spec: {} });
      expect(result.cartTotalItems).toBe(2);
    });
  });
});
