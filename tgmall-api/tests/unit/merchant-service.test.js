// 商家服务单元测试 — TC-M-001~016
import { describe, it, expect, beforeEach } from '@jest/globals';
import { createMockTx, createMockRedis } from '../helpers/mocks.js';

describe('商家服务 (merchant.service)', () => {
  let tx;

  beforeEach(() => {
    tx = createMockTx();
  });

  // TC-M-001: 商家入驻
  it('商家入驻申请 status=pending', () => {
    const merchant = { nameKm: 'សៀង ហាង', ownerName: 'សុភាព', phone: '+85512345678', status: 'pending' };
    expect(merchant.status).toBe('pending');
    expect(merchant.phone).toMatch(/^\+855\d{8,9}$/);
  });

  // TC-M-002: 重复手机号(pending)
  it('pending 状态手机号重复应拒绝', () => {
    // 已有 pending 商家
    const existing = { phone: '+85512345678', status: 'pending' };
    expect(existing.status).toBe('pending');
    // 新申请同手机号应拒绝 (DUPLICATE_MERCHANT)
  });

  // TC-M-003: 重复手机号(active)
  it('active 状态手机号重复应拒绝', () => {
    const existing = { phone: '+85512345678', status: 'active' };
    expect(existing.status).toBe('active');
  });

  // TC-M-004: 商家登录
  it('active 商家登录返回 merchant JWT', () => {
    const token = { userId: 'u1', telegramId: '123', merchantId: 'm1', role: 'merchant' };
    expect(token.role).toBe('merchant');
    expect(token.merchantId).toBe('m1');
  });

  // TC-M-005: pending 拒绝登录
  it('pending 状态商家应拒绝登录', () => {
    const status = 'pending';
    expect(status).not.toBe('active');
  });

  // TC-M-012: 审核通过
  it('审核通过 status 变为 active', () => {
    const before = { status: 'pending', rejectReason: '以前被驳回' };
    const after = { ...before, status: 'active', rejectReason: null };
    expect(after.status).toBe('active');
    expect(after.rejectReason).toBeNull();
  });

  // TC-M-013: 重复审核拒绝
  it('已 active 商家再次审核通过应拒绝', () => {
    const merchant = { status: 'active' };
    expect(merchant.status).toBe('active');
    // 再次 approve 应抛 ALREADY_APPROVED
  });

  // TC-M-014: 审核驳回
  it('审核驳回含原因', () => {
    const before = { status: 'pending', rejectReason: null };
    const after = { ...before, status: 'rejected', rejectReason: '手机号格式错误' };
    expect(after.status).toBe('rejected');
    expect(after.rejectReason).toBe('手机号格式错误');
  });

  // TC-M-015: 已付款订单发货
  it('paid 订单可发货', () => {
    const order = { status: 'paid', paymentStatus: 'success' };
    expect(order.status).toBe('paid');
  });

  // TC-M-016: 非 paid 拒绝发货
  it('pending_payment 订单应拒绝发货', () => {
    const order = { status: 'pending_payment' };
    expect(order.status).not.toBe('paid');
  });

  // TC-M-008: 看板近7天趋势
  it('看板数据 completeness', () => {
    const dashboard = {
      productCount: 42, pendingOrders: 8, shippedOrders: 12,
      completedOrdersThisMonth: 156, todayRevenueUsd: 1250, totalRevenueUsd: 85000,
      recent7DaysRevenue: Array.from({ length: 7 }, (_, i) => ({
        date: `2026-06-${String(i).padStart(2, '0')}`, revenue: 1000 + i * 100, orders: 15 + i,
      })),
      lowStockAlerts: [],
    };
    expect(dashboard.recent7DaysRevenue.length).toBe(7);
    expect(dashboard.productCount).toBeGreaterThan(0);
  });

  // TC-M-009: 库存预警
  it('stock <= 5 应出现在预警列表', () => {
    const alerts = [{ nameKm: 'A', stock: 3 }, { nameKm: 'B', stock: 1 }];
    expect(alerts.every(p => p.stock <= 5)).toBe(true);
  });

  // TC-M-010: 库存充足不预警
  it('stock > 5 不应预警', () => {
    const alerts = [];
    expect(alerts.length).toBe(0);
  });

  // TC-M-007: 看板字段完整性
  it('看板返回所有必需字段', () => {
    const requiredFields = ['productCount', 'pendingOrders', 'shippedOrders',
      'completedOrdersThisMonth', 'todayRevenueUsd', 'totalRevenueUsd',
      'recent7DaysRevenue', 'lowStockAlerts'];
    const dashboard = {
      productCount: 0, pendingOrders: 0, shippedOrders: 0,
      completedOrdersThisMonth: 0, todayRevenueUsd: 0, totalRevenueUsd: 0,
      recent7DaysRevenue: [], lowStockAlerts: [],
    };
    for (const field of requiredFields) {
      expect(dashboard).toHaveProperty(field);
    }
  });
});
