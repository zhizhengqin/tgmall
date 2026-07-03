// 优惠券服务
import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';

export async function getAvailableCoupons() {
  return prisma.coupon.findMany({
    where: {
      status: 'active',
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function claimCoupon(userId, couponId) {
  return prisma.$transaction(async (tx) => {
    // 1. 锁定优惠券行，防止并发超发
    const [coupon] = await tx.$queryRaw`
      SELECT id, status, end_date, used_count, total_qty
      FROM coupons
      WHERE id = ${couponId}::uuid
      FOR UPDATE
    `;
    if (!coupon) throw new AppError('优惠券不存在', 404, 'NOT_FOUND');
    if (coupon.status !== 'active' || new Date(coupon.end_date) < new Date()) {
      throw new AppError('优惠券已过期', 400, 'COUPON_EXPIRED');
    }
    if (coupon.used_count >= coupon.total_qty) {
      throw new AppError('优惠券已抢光', 400, 'COUPON_SOLD_OUT');
    }

    // 2. 检查是否已领取
    const existing = await tx.userCoupon.findUnique({
      where: { userId_couponId: { userId, couponId } },
    });
    if (existing) throw new AppError('已领取过此券', 400, 'COUPON_ALREADY_CLAIMED');

    // 3. 原子领取 + 计数递增
    await tx.userCoupon.create({ data: { userId, couponId } });
    await tx.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } },
    });

    return { message: '领取成功' };
  });
}

export async function getUserCoupons(userId, status = 'unused') {
  return prisma.userCoupon.findMany({
    where: { userId, status },
    include: { coupon: true },
    orderBy: { receivedAt: 'desc' },
  });
}

// ── 管理端优惠券 CRUD ──

/** GET /admin/coupons — 优惠券列表（含已停用/已过期） */
export async function adminListCoupons({ status, page, limit }) {
  const skip = (page - 1) * limit;
  const where = {};
  if (status) where.status = status;
  const [items, total] = await Promise.all([
    prisma.coupon.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.coupon.count({ where }),
  ]);
  return { items, total };
}

/** POST /admin/coupons — 创建优惠券 */
export async function adminCreateCoupon(data) {
  const { titleKm, titleEn, titleZh, type, value, minSpend, totalQty, startDate, endDate } = data;
  if (!titleKm || !type || value == null || !totalQty || !startDate || !endDate) {
    throw new AppError('缺少必填字段 (titleKm, type, value, totalQty, startDate, endDate)', 400, 'VALIDATION_ERROR');
  }
  if (!['fixed', 'percent'].includes(type)) {
    throw new AppError('type 必须为 fixed 或 percent', 400, 'VALIDATION_ERROR');
  }
  return prisma.coupon.create({
    data: {
      titleKm, titleEn, titleZh,
      type,
      value: type === 'percent' ? Math.min(100, Math.max(0, value)) : value,
      minSpend: minSpend || 0,
      totalQty,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
  });
}

/** PUT /admin/coupons/:id — 更新优惠券 */
export async function adminUpdateCoupon(id, data) {
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw new AppError('优惠券不存在', 404, 'NOT_FOUND');

  const { titleKm, titleEn, titleZh, type, value, minSpend, totalQty, startDate, endDate } = data;
  const updateData = {};
  if (titleKm !== undefined) updateData.titleKm = titleKm;
  if (titleEn !== undefined) updateData.titleEn = titleEn;
  if (titleZh !== undefined) updateData.titleZh = titleZh;
  if (type !== undefined) updateData.type = type;
  if (value !== undefined) updateData.value = data.type === 'percent' ? Math.min(100, Math.max(0, value)) : value;
  if (minSpend !== undefined) updateData.minSpend = minSpend;
  if (totalQty !== undefined) updateData.totalQty = totalQty;
  if (startDate !== undefined) updateData.startDate = new Date(startDate);
  if (endDate !== undefined) updateData.endDate = new Date(endDate);

  return prisma.coupon.update({ where: { id }, data: updateData });
}

/** PATCH /admin/coupons/:id/status — 启用/停用优惠券 */
export async function adminToggleCouponStatus(id, status) {
  if (!['active', 'inactive'].includes(status)) {
    throw new AppError('status 必须为 active 或 inactive', 400, 'VALIDATION_ERROR');
  }
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw new AppError('优惠券不存在', 404, 'NOT_FOUND');

  return prisma.coupon.update({ where: { id }, data: { status } });
}
