import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  calculateShippingFee,
  listActiveBanners,
  listActiveCategories,
  getActiveDeliveryRule,
  getDefaultCustomerService,
} from '../../src/services/shopConfig.service.js';

describe('shopConfig.service', () => {
  it('calculateShippingFee: 未满免邮门槛收取基础运费', () => {
    const rule = { shippingFeeUsd: 1.5, freeShippingThresholdUsd: 30 };
    expect(calculateShippingFee(20, rule)).toBe(1.5);
  });

  it('calculateShippingFee: 满足免邮门槛运费为0', () => {
    const rule = { shippingFeeUsd: 1.5, freeShippingThresholdUsd: 30 };
    expect(calculateShippingFee(35, rule)).toBe(0);
  });

  it('calculateShippingFee: 免邮门槛为0不触发免邮', () => {
    const rule = { shippingFeeUsd: 1, freeShippingThresholdUsd: 0 };
    expect(calculateShippingFee(100, rule)).toBe(1);
  });

  it('listActiveBanners: 只返回生效中且符合城市的 Banner', async () => {
    const allBanners = [
      { id: 'b1', titleKm: 'A', cityCode: null, status: 'active', sortOrder: 1, startAt: null, endAt: null },
      { id: 'b2', titleKm: 'B', cityCode: 'siem_reap', status: 'active', sortOrder: 2, startAt: null, endAt: null },
    ];
    const prismaMock = {
      banner: {
        findMany: jest.fn(({ where }) => {
          return allBanners.filter((b) => {
            if (where.status && b.status !== where.status) return false;
            if (where.OR) {
              const cityMatch = where.OR.some((o) =>
                o.cityCode === null ? b.cityCode === null : b.cityCode === o.cityCode
              );
              if (!cityMatch) return false;
            }
            return true;
          });
        }),
      },
    };
    const now = new Date('2030-01-01');
    const result = await listActiveBanners(prismaMock, 'phnom_penh', now);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('b1');
  });

  it('getActiveDeliveryRule: 未找到规则返回 null', async () => {
    const prismaMock = { deliveryRule: { findFirst: jest.fn(() => null) } };
    const result = await getActiveDeliveryRule(prismaMock, 'unknown');
    expect(result).toBeNull();
  });
});
