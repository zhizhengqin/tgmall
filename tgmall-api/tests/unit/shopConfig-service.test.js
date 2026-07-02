import { describe, it, expect, jest } from '@jest/globals';
import {
  calculateShippingFee,
  listActiveBanners,
  getActiveDeliveryRule,
} from '../../src/services/shopConfig.service.js';

function matchesCity(b, orClause, cityCode) {
  if (!orClause) return true;
  return orClause.some((o) => {
    if (o.cityCode === null) return b.cityCode === null;
    if (o.cityCode === cityCode) return b.cityCode === cityCode;
    return false;
  });
}

function matchesDate(b, andClause, now) {
  if (!andClause) return true;
  return andClause.every((clause) => {
    if (!clause.OR) return true;
    return clause.OR.some((cond) => {
      if (cond.startAt === null) return b.startAt === null;
      if (cond.startAt?.lte) return b.startAt === null || new Date(b.startAt) <= now;
      if (cond.endAt === null) return b.endAt === null;
      if (cond.endAt?.gte) return b.endAt === null || new Date(b.endAt) >= now;
      return false;
    });
  });
}

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
            if (!matchesCity(b, where.OR, 'phnom_penh')) return false;
            if (!matchesDate(b, where.AND, new Date('2030-01-01'))) return false;
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

  it('listActiveBanners: 根据 startAt/endAt 过滤生效时间', async () => {
    const allBanners = [
      { id: 'b1', titleKm: 'A', cityCode: null, status: 'active', sortOrder: 1, startAt: null, endAt: null },
      { id: 'b2', titleKm: 'B', cityCode: null, status: 'active', sortOrder: 2, startAt: '2030-01-01', endAt: '2030-01-31' },
      { id: 'b3', titleKm: 'C', cityCode: null, status: 'active', sortOrder: 3, startAt: '2030-02-01', endAt: null },
      { id: 'b4', titleKm: 'D', cityCode: null, status: 'active', sortOrder: 4, startAt: null, endAt: '2029-12-31' },
    ];
    const prismaMock = {
      banner: {
        findMany: jest.fn(({ where }) => {
          const now = new Date('2030-01-15');
          return allBanners.filter((b) => {
            if (where.status && b.status !== where.status) return false;
            if (!matchesCity(b, where.OR, undefined)) return false;
            if (!matchesDate(b, where.AND, now)) return false;
            return true;
          });
        }),
      },
    };
    const now = new Date('2030-01-15');
    const result = await listActiveBanners(prismaMock, undefined, now);
    expect(result.map((b) => b.id)).toEqual(['b1', 'b2']);
  });

  it('getActiveDeliveryRule: 未找到规则返回 null', async () => {
    const prismaMock = { deliveryRule: { findFirst: jest.fn(() => null) } };
    const result = await getActiveDeliveryRule(prismaMock, 'unknown');
    expect(result).toBeNull();
  });
});
