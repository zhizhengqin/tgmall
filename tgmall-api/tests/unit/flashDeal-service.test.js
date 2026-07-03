// 限时专区服务单元测试
import { describe, it, expect } from '@jest/globals';

/**
 * 模拟 listActiveFlashDeals 核心过滤逻辑（纯函数测试）
 * service 依赖 Prisma，这里提取过滤条件做独立测试
 */

function isDealActive(deal, now, cityCode) {
  // 状态检查
  if (deal.status !== 'active') return false;

  // 库存检查
  if (deal.dealStock <= deal.soldCount) return false;

  // 城市检查
  if (deal.cityCode !== null && deal.cityCode !== cityCode) return false;

  // 时间范围检查
  if (deal.startAt && new Date(deal.startAt) > now) return false;
  if (deal.endAt && new Date(deal.endAt) < now) return false;

  // 关联商品检查
  if (deal.product?.status !== 'active') return false;

  return true;
}

function validateDuplicateActiveDeal(existingDeals, productId) {
  return existingDeals.some((d) => d.productId === productId && d.status === 'active');
}

describe('限时专区服务 (flashDeal.service)', () => {
  const NOW = new Date('2026-07-15T12:00:00Z');
  const CITY = 'phnom_penh';

  describe('listActiveFlashDeals 过滤逻辑', () => {
    it('status=active + 库存>0 + 城市匹配 + 时间有效 → 应展示', () => {
      const deal = {
        status: 'active',
        dealStock: 100,
        soldCount: 30,
        cityCode: null,
        startAt: '2026-07-01T00:00:00Z',
        endAt: '2026-07-30T00:00:00Z',
        product: { status: 'active' },
      };
      expect(isDealActive(deal, NOW, CITY)).toBe(true);
    });

    it('status=inactive 不应展示', () => {
      const deal = { status: 'inactive', dealStock: 100, soldCount: 0, cityCode: null, startAt: null, endAt: null, product: { status: 'active' } };
      expect(isDealActive(deal, NOW, CITY)).toBe(false);
    });

    it('dealStock <= soldCount (售罄) 不应展示', () => {
      const deal = { status: 'active', dealStock: 50, soldCount: 50, cityCode: null, startAt: null, endAt: null, product: { status: 'active' } };
      expect(isDealActive(deal, NOW, CITY)).toBe(false);
    });

    it('dealStock > soldCount 应展示', () => {
      const deal = { status: 'active', dealStock: 50, soldCount: 49, cityCode: null, startAt: null, endAt: null, product: { status: 'active' } };
      expect(isDealActive(deal, NOW, CITY)).toBe(true);
    });

    it('cityCode 不匹配且不为 null 不应展示', () => {
      const deal = { status: 'active', dealStock: 100, soldCount: 0, cityCode: 'siem_reap', startAt: null, endAt: null, product: { status: 'active' } };
      expect(isDealActive(deal, NOW, CITY)).toBe(false);
    });

    it('cityCode=null 全城通用应展示', () => {
      const deal = { status: 'active', dealStock: 100, soldCount: 0, cityCode: null, startAt: null, endAt: null, product: { status: 'active' } };
      expect(isDealActive(deal, NOW, CITY)).toBe(true);
    });

    it('startAt 未到 → 不应展示', () => {
      const deal = { status: 'active', dealStock: 100, soldCount: 0, cityCode: null, startAt: '2026-08-01T00:00:00Z', endAt: null, product: { status: 'active' } };
      expect(isDealActive(deal, NOW, CITY)).toBe(false);
    });

    it('endAt 已过 → 不应展示', () => {
      const deal = { status: 'active', dealStock: 100, soldCount: 0, cityCode: null, startAt: null, endAt: '2026-06-01T00:00:00Z', product: { status: 'active' } };
      expect(isDealActive(deal, NOW, CITY)).toBe(false);
    });

    it('关联商品已下架 → 不应展示', () => {
      const deal = { status: 'active', dealStock: 100, soldCount: 0, cityCode: null, startAt: null, endAt: null, product: { status: 'inactive' } };
      expect(isDealActive(deal, NOW, CITY)).toBe(false);
    });

    it('startAt=null 且 endAt=null 不限时应展示', () => {
      const deal = { status: 'active', dealStock: 100, soldCount: 0, cityCode: 'phnom_penh', startAt: null, endAt: null, product: { status: 'active' } };
      expect(isDealActive(deal, NOW, CITY)).toBe(true);
    });
  });

  describe('重复 active 专区校验', () => {
    it('同一商品已有 active 专区 → 应拒绝', () => {
      const existing = [
        { productId: 'p1', status: 'active' },
      ];
      expect(validateDuplicateActiveDeal(existing, 'p1')).toBe(true);
    });

    it('同一商品仅有历史 inactive 专区 → 应允许', () => {
      const existing = [
        { productId: 'p1', status: 'inactive' },
      ];
      expect(validateDuplicateActiveDeal(existing, 'p1')).toBe(false);
    });

    it('不同商品 → 应允许', () => {
      const existing = [
        { productId: 'p1', status: 'active' },
      ];
      expect(validateDuplicateActiveDeal(existing, 'p2')).toBe(false);
    });
  });
});
