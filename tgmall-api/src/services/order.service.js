// 订单服务 — 创建、查询、取消、确认
import crypto from 'crypto';
import prisma from '../config/database.js';
import redis from '../config/redis.js';
import { AppError } from '../utils/AppError.js';
import { generateOrderNumber } from '../utils/orderNumber.js';
import { sendOrderNotification } from '../integrations/telegram.js';
import { calculateShippingFee } from './shopConfig.service.js';

export async function createOrder(userId, body) {
  const { items: rawItems, shipping_address_id, coupon_id, payment_method, notes } = body;
  const shippingAddressId = shipping_address_id;
  const couponId = coupon_id;
  const paymentMethod = payment_method;
  // 将 snake_case 的 items 转为 camelCase
  const items = rawItems.map(i => ({ ...i, productId: i.product_id, quantity: i.quantity, spec: i.spec }));

  // 1. 验证收货地址
  const address = await prisma.address.findFirst({ where: { id: shippingAddressId, userId } });
  if (!address) throw new AppError('收货地址不存在', 404, 'NOT_FOUND');

  // 2. 分布式锁（防同用户并发下单）
  const lockKey = `lock:order:${userId}`;
  const lockToken = crypto.randomUUID();
  const locked = await redis.set(lockKey, lockToken, 'NX', 'EX', 30);
  if (!locked) throw new AppError('请勿重复提交订单', 409, 'DUPLICATE_ORDER');

  try {
    // 3. 使用事务：校验库存 → 预扣 → 创建订单
    const order = await prisma.$transaction(async (tx) => {
      // 3a. 逐商品校验库存并计算价格
      let totalUsd = 0;
      let totalKhr = 0;
      const itemDetails = []; // 记录每个商品的单价快照

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new AppError(`商品不存在: ${item.productId}`, 404, 'NOT_FOUND');
        if (product.status !== 'active') throw new AppError('商品已下架', 410, 'PRODUCT_INACTIVE');
        if (product.stock < item.quantity) {
          throw new AppError(`"${product.nameKm}"库存不足，仅剩${product.stock}件`, 400, 'INSUFFICIENT_STOCK');
        }

        const unitPriceUsd = Number(product.priceUsd);
        const unitPriceKhr = product.priceKhr;
        totalUsd += unitPriceUsd * item.quantity;
        totalKhr += unitPriceKhr * item.quantity;
        itemDetails.push({ ...item, unitPriceUsd, unitPriceKhr });
      }

      // 1.1 校验地址城市与配送规则
      const cityCode = address.cityCode || normalizeProvinceToCityCode(address.province);
      const deliveryRule = await prisma.deliveryRule.findFirst({ where: { cityCode, status: 'active' } });
      if (!deliveryRule) throw new AppError('当前地址暂不支持配送', 400, 'DELIVERY_NOT_AVAILABLE');

      // 3b. 校验优惠券
      let discountUsd = 0;
      let selectedCouponId = couponId;

      // 未指定优惠券时，自动匹配最优可用券
      if (!selectedCouponId) {
        const autoCoupon = await findBestCoupon(tx, userId, totalUsd);
        if (autoCoupon) {
          selectedCouponId = autoCoupon.id;
        }
      }

      if (selectedCouponId) {
        const userCoupon = await tx.userCoupon.findFirst({
          where: { userId, couponId: selectedCouponId, status: 'unused' },
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

      // 3c. 预扣库存 + 写 StockLog
      for (const item of items) {
        const productBefore = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stock: true },
        });
        const newStock = productBefore.stock - item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: newStock, ...(newStock === 0 ? { status: 'inactive' } : {}) },
        });

        await tx.stockLog.create({
          data: {
            productId: item.productId,
            beforeQty: productBefore.stock,
            afterQty: newStock,
            changeQty: -item.quantity,
            reason: 'order_create',
          },
        });

        // 库存归零自动下架
        if (newStock === 0) {
          await tx.stockLog.create({
            data: {
              productId: item.productId,
              beforeQty: 0, afterQty: 0, changeQty: 0,
              reason: 'auto_delist',
              note: '库存归零自动下架',
            },
          });
        }
      }

      const shippingFeeUsd = calculateShippingFee(totalUsd, deliveryRule);
      const minOrderAmountUsd = Number(deliveryRule.minOrderAmountUsd);
      if (totalUsd < minOrderAmountUsd) {
        throw new AppError(`订单金额未满 $${minOrderAmountUsd} 起送`, 400, 'ORDER_MIN_AMOUNT_NOT_MET');
      }

      // 3d. 创建订单 — 折扣按原价比例分摊，确保总额精确
      const orderNumber = generateOrderNumber();
      const finalTotalUsd = Math.round((totalUsd - discountUsd + shippingFeeUsd) * 100) / 100;
      const finalTotalKhr = Math.round(totalKhr - (discountUsd * 4000) + (shippingFeeUsd * 4000));

      // 按原价比例分摊折扣金额
      const discountPerUsd = totalUsd > 0 ? discountUsd / totalUsd : 0;

      // 先计算各 item 分摊后的价格
      const itemPrices = itemDetails.map((item) => {
        const unitPriceUsd = Number(item.unitPriceUsd || 0);
        const unitPriceKhr = item.unitPriceKhr || 0;
        const itemTotalUsd = unitPriceUsd * item.quantity;
        const itemDiscountUsd = itemTotalUsd * discountPerUsd;
        return {
          ...item,
          unitPriceUsd,
          unitPriceKhr,
          itemTotalUsd,
          itemDiscountUsd,
        };
      });

      // 计算分摊后的 USD 总价（用于最大余数法调整）
      let distributedUsd = itemPrices.map((ip) =>
        Math.round((ip.itemTotalUsd - ip.itemDiscountUsd) * 100) / 100
      );
      const distributedTotalUsd = distributedUsd.reduce((s, v) => s + v, 0);
      const usdDiff = Math.round((finalTotalUsd - distributedTotalUsd) * 100) / 100;

      // 最大余数法：将差额加到最大 item 上
      if (usdDiff !== 0) {
        const maxIdx = distributedUsd.indexOf(Math.max(...distributedUsd));
        distributedUsd[maxIdx] = Math.round((distributedUsd[maxIdx] + usdDiff) * 100) / 100;
      }

      // KHR 同理
      let distributedKhr = itemPrices.map((ip) =>
        Math.round((ip.unitPriceKhr * ip.quantity) - (ip.itemDiscountUsd * 4000))
      );
      const distributedTotalKhr = distributedKhr.reduce((s, v) => s + v, 0);
      const khrDiff = finalTotalKhr - distributedTotalKhr;
      if (khrDiff !== 0) {
        const maxIdx = distributedKhr.indexOf(Math.max(...distributedKhr));
        distributedKhr[maxIdx] += khrDiff;
      }

      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          totalUsd: finalTotalUsd,
          totalKhr: finalTotalKhr,
          discountUsd,
          shippingFeeUsd,
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
            create: itemDetails.map((item, idx) => ({
              productId: item.productId,
              quantity: item.quantity,
              priceUsd: distributedUsd[idx],
              priceKhr: distributedKhr[idx],
              spec: item.spec || {},
            })),
          },
        },
      });

      return { ...order, shippingFeeUsd };
    });

    // 4. 清除购物车
    await redis.del(`cart:${userId}`);

    // 5. Bot 通知（fire and forget，不阻塞业务）
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { telegramId: true, language: true },
      });
      if (user?.telegramId) {
        sendOrderNotification(
          { telegramId: user.telegramId, languageCode: user.language },
          order,
          'created',
        ).catch((e) => console.error('[Bot] 下单通知失败:', e.message));
      }
    } catch (e) {
      console.error('[Bot] 通知查询失败:', e.message);
    }

    return { ...order, shippingFeeUsd: Number(order.shippingFeeUsd) };
  } finally {
    // 安全释放锁：只有持有自己 token 时才删除
    const currentToken = await redis.get(lockKey);
    if (currentToken === lockToken) {
      await redis.del(lockKey);
    }
  }
}

/**
 * 自动查找最优可用优惠券
 * 规则：满足最低消费门槛 + 折扣金额最大 + 同金额 fixed 优先 + 同类型最近过期优先
 */
async function findBestCoupon(tx, userId, totalUsd) {
  const now = new Date();
  const userCoupons = await tx.userCoupon.findMany({
    where: {
      userId,
      status: 'unused',
      coupon: {
        status: 'active',
        startDate: { lte: now },
        endDate: { gte: now },
        minSpend: { lte: totalUsd },
      },
    },
    include: { coupon: true },
  });

  if (userCoupons.length === 0) return null;

  // 计算每张券的实际折扣金额，排序取最优
  const ranked = userCoupons
    .map((uc) => {
      const discount = uc.coupon.type === 'fixed'
        ? Number(uc.coupon.value)
        : Math.round(totalUsd * Number(uc.coupon.value) / 100 * 100) / 100;
      return { ...uc, computedDiscount: discount };
    })
    .sort((a, b) => {
      // 折扣金额降序
      const diff = b.computedDiscount - a.computedDiscount;
      if (diff !== 0) return diff;
      // 同金额时 fixed 优先
      if (a.coupon.type === 'fixed' && b.coupon.type !== 'fixed') return -1;
      if (a.coupon.type !== 'fixed' && b.coupon.type === 'fixed') return 1;
      // 同类型时取最近过期的
      return new Date(a.coupon.endDate) - new Date(b.coupon.endDate);
    });

  return ranked[0].coupon;
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
      merchantName: 'TG Mall',
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
    // 恢复库存 + 写 StockLog
    for (const item of order.items) {
      const productBefore = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stock: true },
      });
      const newStock = productBefore.stock + item.quantity;

      await tx.product.update({
        where: { id: item.productId },
        data: { stock: newStock },
      });

      await tx.stockLog.create({
        data: {
          productId: item.productId,
          beforeQty: productBefore.stock,
          afterQty: newStock,
          changeQty: +item.quantity,
          reason: 'order_cancel',
        },
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

function normalizeProvinceToCityCode(province) {
  if (!province) return null;
  const map = {
    'phnom penh': 'phnom_penh',
    'ភ្នំពេញ': 'phnom_penh',
    '金边': 'phnom_penh',
    'siem reap': 'siem_reap',
    'សៀមរាប': 'siem_reap',
    '暹粒': 'siem_reap',
  };
  return map[province.trim().toLowerCase()] || null;
}

// GET /admin/orders/export — 导出订单 CSV
export async function exportOrdersCsv({ status, startDate, endDate }) {
  const where = {};
  if (status && status !== 'all') where.status = status;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      orderNumber: true, status: true, totalUsd: true, totalKhr: true,
      paymentMethod: true, paidAt: true, createdAt: true,
      shippingAddress: true, shippingContact: true, shippingPhone: true,
      items: { select: { productId: true, quantity: true, priceUsd: true } },
    },
    take: 10000,
  });

  const header = 'OrderNumber,Status,TotalUSD,TotalKHR,PaymentMethod,ItemCount,Phone,CreatedAt';
  const rows = orders.map(o => {
    const itemCount = o.items.reduce((s, i) => s + i.quantity, 0);
    return `"${o.orderNumber}","${o.status}",${Number(o.totalUsd).toFixed(2)},${o.totalKhr},"${o.paymentMethod}",${itemCount},"${o.shippingPhone || ''}","${o.createdAt.toISOString()}"`;
  });

  return [header, ...rows].join('\n');
}

/**
 * COD 收款确认 — 管理员手动确认货到付款已收取，将订单标记为已完成
 */
export async function collectCodPayment(orderId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError('订单不存在', 404, 'NOT_FOUND');
  if (order.paymentMethod !== 'cod') {
    throw new AppError('仅 COD 订单支持收款确认', 400, 'INVALID_PAYMENT_METHOD');
  }
  if (order.status === 'completed') {
    throw new AppError('订单已完成，无需重复确认', 400, 'ALREADY_COMPLETED');
  }
  if (order.status === 'cancelled') {
    throw new AppError('已取消的订单不支持收款确认', 400, 'ORDER_CANCELLED');
  }

  return prisma.order.update({
    where: { id: orderId },
    data: { status: 'completed', completedAt: new Date() },
    select: { id: true, orderNumber: true, status: true, completedAt: true },
  });
}
