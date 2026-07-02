// 管理员服务 — 平台看板、商家列表、用户列表
import prisma from '../config/database.js';

// GET /admin/dashboard — Platform-level analytics
export async function getPlatformDashboard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [gmvToday, gmvMonth, totalUsers, totalOrders] = await Promise.all([
    prisma.order.aggregate({ _sum: { totalUsd: true }, where: { paidAt: { gte: today }, status: { in: ['paid', 'shipped', 'completed'] } } }),
    prisma.order.aggregate({ _sum: { totalUsd: true }, where: { paidAt: { gte: monthStart }, status: { in: ['paid', 'shipped', 'completed'] } } }),
    prisma.user.count({ where: { status: 'active' } }),
    prisma.order.count(),
  ]);

  // Recent 7 days trend
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); sevenDaysAgo.setHours(0, 0, 0, 0);
  const [recentOrders, recentUsers] = await Promise.all([
    prisma.order.findMany({ where: { paidAt: { gte: sevenDaysAgo }, status: { in: ['paid', 'shipped', 'completed'] } }, select: { totalUsd: true, paidAt: true } }),
    prisma.user.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { createdAt: true } }),
  ]);

  const dailyMap = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo); d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0];
    dailyMap[key] = { date: key, gmv: 0, orders: 0, newUsers: 0 };
  }
  for (const o of recentOrders) {
    const key = o.paidAt.toISOString().split('T')[0];
    if (dailyMap[key]) { dailyMap[key].gmv += Number(o.totalUsd); dailyMap[key].orders += 1; }
  }
  for (const u of recentUsers) {
    const key = u.createdAt.toISOString().split('T')[0];
    if (dailyMap[key]) dailyMap[key].newUsers += 1;
  }

  return {
    gmvToday: Number(gmvToday._sum.totalUsd || 0),
    gmvThisMonth: Number(gmvMonth._sum.totalUsd || 0),
    totalMerchants: 0, pendingAudit: 0, totalUsers, totalOrders,
    recent7DaysTrend: Object.values(dailyMap),
  };
}

// GET /admin/merchants — V2 公司自营模式，无商户列表
export async function getMerchants({ page, limit }) {
  return { items: [], total: 0, page, limit };
}

// GET /admin/users
export async function getUsers({ q, page, limit }) {
  const where = {};
  if (q) { where.OR = [{ firstName: { contains: q } }, { lastName: { contains: q } }, { phone: { contains: q } }]; }
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, select: { id: true, telegramId: true, firstName: true, lastName: true, phone: true, status: true, createdAt: true } }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page, limit };
}
