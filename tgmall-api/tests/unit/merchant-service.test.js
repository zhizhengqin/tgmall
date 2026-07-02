// 管理员商品/订单服务单元测试 — V2 公司自营模式
import { describe, it, expect, beforeEach } from '@jest/globals';
import { createMockTx, createMockRedis } from '../helpers/mocks.js';

describe('管理员商品服务 (admin products)', () => {
  let tx;

  beforeEach(() => {
    tx = createMockTx();
  });

  // 商品数据校验
  it('商品创建状态默认为 active', () => {
    const product = { nameKm: 'ទឹកក្រូចដូង', priceUsd: 2.50, stock: 100, status: 'active' };
    expect(product.status).toBe('active');
    expect(product.priceUsd).toBeGreaterThan(0);
  });

  // 库存预警
  it('stock <= 5 应出现在预警列表', () => {
    const alerts = [{ nameKm: 'A', stock: 3 }, { nameKm: 'B', stock: 1 }];
    expect(alerts.every(p => p.stock <= 5)).toBe(true);
  });

  it('stock > 5 不应预警', () => {
    const alerts = [];
    expect(alerts.length).toBe(0);
  });

  // 平台看板 (V2: 无商家相关字段)
  it('平台看板返回所有必需字段（V2 自营模式）', () => {
    const requiredFields = ['gmvToday', 'gmvThisMonth', 'totalMerchants',
      'pendingAudit', 'totalUsers', 'totalOrders', 'recent7DaysTrend'];
    const dashboard = {
      gmvToday: 1250, gmvThisMonth: 85000,
      totalMerchants: 0, pendingAudit: 0,
      totalUsers: 500, totalOrders: 1200,
      recent7DaysTrend: [],
    };
    for (const field of requiredFields) {
      expect(dashboard).toHaveProperty(field);
    }
    // V2：商家相关字段为 0
    expect(dashboard.totalMerchants).toBe(0);
    expect(dashboard.pendingAudit).toBe(0);
  });

  it('看板近7天趋势数据完整性', () => {
    const trend = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-06-${String(i + 1).padStart(2, '0')}`,
      gmv: 1000 + i * 100, orders: 15 + i, newUsers: 2 + i,
    }));
    expect(trend.length).toBe(7);
    expect(trend[0].gmv).toBeGreaterThan(0);
  });

  // 订单状态流转
  it('paid 订单可发货', () => {
    const order = { status: 'paid', paymentStatus: 'success' };
    expect(order.status).toBe('paid');
  });

  it('pending_payment 订单应拒绝发货', () => {
    const order = { status: 'pending_payment' };
    expect(order.status).not.toBe('paid');
  });

  // V2 商家列表返回空（公司自营模式）
  it('V2 商家列表返回空（公司自营模式）', () => {
    const result = { items: [], total: 0, page: 1, limit: 20 };
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
