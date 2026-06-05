// 订单服务 — 创建、查询、取消、确认
import prisma from '../config/database.js';
import redis from '../config/redis.js';
import { AppError } from '../utils/AppError.js';
import { generateOrderNumber } from '../utils/orderNumber.js';

export async function createOrder(userId, { items, shippingAddressId, couponId, paymentMethod, notes }) {
  // 1. 验证收货地址
  const address = await prisma.address.findFirst({ where: { id: shippingAddressId, userId } });
  if (!address) throw new AppError('收货地址不存在', 404, 'NOT_FOUND');

  // 2. 分布式锁（防同用户并发下单）
  const lockKey = `lock:order:${userId}`;
  const locked = await redis.set(lockKey, '1', 'NX', 'EX', 30);
  if (!locked) throw new AppError('请勿重复提交订单', 409, 'DUPLICATE_ORDER');

  try {
    // 3. 使用事务：校验库存 → 预扣 → 创建订单
    const order = await prisma.$transaction(async (tx) => {
      // 3a. 逐商品校验库存并计算价格
      let totalUsd = 0;
      let totalKhr = 0;
      let merchantId = null;

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new AppError(`商品不存在: ${item.productId}`, 404, 'NOT_FOUND');
        if (product.status !== 'active') throw new AppError('商品已下架', 410, 'PRODUCT_INACTIVE');
        if (product.stock < item.quantity) {
          throw new AppError(`"${product.nameKm}"库存不足，仅剩${product.stock}件`, 400, 'INSUFFICIENT_STOCK');
        }

        totalUsd += Number(product.priceUsd) * item.quantity;
        totalKhr += product.priceKhr * item.quantity;

        if (!merchantId) merchantId = product.merchantId;
        else if (merchantId !== product.merchantId) {
          throw new AppError('一个订单只能包含同一商家的商品', 400, 'VALIDATION_ERROR');
        }
      }

      // 3b. 校验优惠券
      let discountUsd = 0;
      if (couponId) {
        const userCoupon = await tx.userCoupon.findFirst({
          where: { userId, couponId, status: 'unused' },
          include: { coupon: true },
        });
        if (!userCoupon) throw new AppError('优惠券无效', 400, 'INVALID_COUPON');
        if (new Date(userCoupon.coupon.endDate) < new Date()) {
          throw new AppError('优惠券已过期', 400, 'COUPON_EXPIRED');
        }
        if (totalUsd < Number(userCoupon.coupon.minSpend)) {
          throw new AppError(`未达到最低消费 $${userCoupon.coupon.minSpend}`, 400, 'COUPON_MIN_SPEND');
        }

        discountUsd = userCoupon.coupon.type === 'fixed'
          ? Number(userCoupon.coupon.value)
          : Math.round(totalUsd * Number(userCoupon.coupon.value) / 100 * 100) / 100;

        await tx.userCoupon.update({
          where: { id: userCoupon.id },
          data: { status: 'used', usedAt: new Date() },
        });
      }

      // 3c. 预扣库存
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // 3d. 创建订单
      const orderNumber = generateOrderNumber();
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          merchantId,
          totalUsd: Math.round((totalUsd - discountUsd) * 100) / 100,
          totalKhr: Math.round(totalKhr - (discountUsd * 4000)), // 汇率快照
          discountUsd,
          status: paymentMethod === 'cod' ? 'paid' : 'pending_payment',
          paymentMethod,
          paymentTimeout: paymentMethod !== 'cod' ? new Date(Date.now() + 15 * 60 * 1000) : null,
          couponId,
          shippingAddress: {
            recipient_name: address.recipientName,
            phone: address.phone,
            province: address.province,
            district: address.district,
            detail: address.detail,
          },
          notes,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              priceUsd: totalUsd / items.reduce((s, i) => s + i.quantity, 0) * item.quantity, // 简化：按数量均分
              priceKhr: Math.round(totalKhr / items.reduce((s, i) => s + i.quantity, 0) * item.quantity),
              spec: item.spec || {},
            })),
          },
        },
      });

      return order;
    });

    // 4. 清除购物车
    await redis.del(`cart:${userId}`);

    return order;
  } finally {
    await redis.del(lockKey);
  }
}

export async function getUserOrders(userId, { status, page, limit }) {
  const where = { userId };
  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        items: {
          take: 1,
          include: { product: { select: { images: true } } },
        },
        merchant: { select: { nameKm: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    items: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentMethod: o.paymentMethod,
      totalUsd: Number(o.totalUsd),
      totalKhr: o.totalKhr,
      itemCount: o.items.length,
      thumbnail: o.items[0]?.product?.images?.[0]?.thumb_url || '',
      merchantName: o.merchant?.nameKm || '',
      createdAt: o.createdAt,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
  };
}

export async function getOrderById(userId, orderId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      items: {
        include: { product: { select: { images: true } } },
      },
      merchant: { select: { nameKm: true } },
      coupon: { select: { titleKm: true, type: true, value: true } },
    },
  });
  if (!order) throw new AppError('订单不存在', 404, 'NOT_FOUND');

  // 当前状态允许的操作
  const actions = {
    canCancel: order.status === 'pending_payment',
    canConfirm: order.status === 'shipped',
  };

  return { ...order, totalUsd: Number(order.totalUsd), actions };
}

export async function cancelOrder(userId, orderId, reason) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { items: true },
  });
  if (!order) throw new AppError('订单不存在', 404, 'NOT_FOUND');
  if (order.status !== 'pending_payment') {
    throw new AppError('只有待付款订单可以取消', 400, 'ORDER_CANNOT_CANCEL');
  }

  await prisma.$transaction(async (tx) => {
    // 恢复库存
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
    // 退还优惠券
    if (order.couponId) {
      await tx.userCoupon.updateMany({
        where: { userId, couponId: order.couponId, status: 'used' },
        data: { status: 'unused', usedAt: null },
      });
    }
    // 更新订单状态
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'cancelled', cancelledAt: new Date(), cancelReason: reason || '用户取消' },
    });
  });

  return { status: 'cancelled' };
}

export async function confirmOrder(userId, orderId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
  });
  if (!order) throw new AppError('订单不存在', 404, 'NOT_FOUND');
  if (order.status !== 'shipped') {
    throw new AppError('只有已发货订单可以确认收货', 400, 'ORDER_CANNOT_CONFIRM');
  }

  return prisma.order.update({
    where: { id: orderId },
    data: { status: 'completed', completedAt: new Date() },
  });
}
