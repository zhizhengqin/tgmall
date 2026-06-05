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
  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!coupon) throw new AppError('优惠券不存在', 404, 'NOT_FOUND');
  if (coupon.status !== 'active' || new Date(coupon.endDate) < new Date()) {
    throw new AppError('优惠券已过期', 400, 'COUPON_EXPIRED');
  }
  if (coupon.usedCount >= coupon.totalQty) {
    throw new AppError('优惠券已抢光', 400, 'COUPON_SOLD_OUT');
  }

  // 检查是否已领取
  const existing = await prisma.userCoupon.findUnique({
    where: { userId_couponId: { userId, couponId } },
  });
  if (existing) throw new AppError('已领取过此券', 400, 'COUPON_ALREADY_CLAIMED');

  // 原子操作：领取 + usedCount +1
  await prisma.$transaction([
    prisma.userCoupon.create({ data: { userId, couponId } }),
    prisma.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } },
    }),
  ]);

  return { message: '领取成功' };
}

export async function getUserCoupons(userId, status = 'unused') {
  return prisma.userCoupon.findMany({
    where: { userId, status },
    include: { coupon: true },
    orderBy: { receivedAt: 'desc' },
  });
}
