// 订单服务 — 创建、查询、取消、确认
import crypto from 'crypto';
import prisma from '../config/database.js';
import redis from '../config/redis.js';
import { AppError } from '../utils/AppError.js';
import { generateOrderNumber } from '../utils/orderNumber.js';
import * as notificationService from './notification.service.js';
import * as cache from './cache.service.js';
import { calculateShippingFee } from './shopConfig.service.js';
import { getExchangeRate } from './systemConfig.service.js';

function specKey(spec) {
  if (!spec || Object.keys(spec).length === 0) return '';
  return Object.keys(spec)
    .sort()
    .map((k) => `${k}:${spec[k]}`)
    .join('|');
}

async function resolveOrderSku(tx, item) {
  if (item.skuId) {
    return tx.productSku.findFirst({ where: { id: item.skuId, productId: item.productId, status: 'active' } });
  }
  const sortedSpec = specKey(item.spec || {});
  if (!sortedSpec) {
    return tx.productSku.findFirst({ where: { productId: item.productId, skuCode: 'DEFAULT', status: 'active' } });
  }
  const skus = await tx.productSku.findMany({ where: { productId: item.productId, status: 'active' } });
  return skus.find((s) => specKey(s.spec) === sortedSpec) || null;
}

export async function createOrder(userId, body) {
  const { items: rawItems, shipping_address_id, coupon_id, payment_method, notes } = body;
  const shippingAddressId = shipping_address_id;
  const couponId = coupon_id;
  const paymentMethod = payment_method;
  // 将 snake_case 的 items 转为 camelCase
  const items = rawItems.map(i => ({ ...i, productId: i.product_id, quantity: i.quantity, spec: i.spec, skuId: i.sku_id }));

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
      // 3a. 逐商品校验库存并计算价格（加 SELECT FOR UPDATE 防止并发超卖）
      let totalUsd = 0;
      let totalKhr = 0;
      const itemDetails = []; // 记录每个商品的单价快照
      const productMap = new Map(); // 锁定后的商品快照，供后续扣减库存使用
      const skuMap = new Map(); // 锁定后的 SKU 快照

      for (const item of items) {
        const [product] = await tx.$queryRaw`
          SELECT id, name_km, name_en, name_zh, price_usd, price_khr, stock, status, images
          FROM products
          WHERE id = ${item.productId}::uuid
          FOR UPDATE
        `;
        if (!product) throw new AppError(`商品不存在: ${item.productId}`, 404, 'NOT_FOUND');
        if (product.status !== 'active') throw new AppError('商品已下架', 410, 'PRODUCT_INACTIVE');

        // 解析 SKU：优先使用传入 skuId，否则按 spec 匹配
        const sku = await resolveOrderSku(tx, item);
        const skuStock = sku ? sku.stock : product.stock;
        const skuPriceUsd = sku ? Number(sku.priceUsd) : Number(product.price_usd);
        const skuPriceKhr = sku ? sku.priceKhr : product.price_khr;

        if (skuStock < item.quantity) {
          throw new AppError(`"${product.name_km}"库存不足，仅剩${skuStock}件`, 400, 'INSUFFICIENT_STOCK');
        }

        totalUsd += skuPriceUsd * item.quantity;
        totalKhr += skuPriceKhr * item.quantity;
        itemDetails.push({ ...item, unitPriceUsd: skuPriceUsd, unitPriceKhr: skuPriceKhr, skuId: sku?.id });
        productMap.set(item.productId, product);
        if (sku) skuMap.set(sku.id, sku);
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
        const productBefore = productMap.get(item.productId);
        const newProductStock = productBefore.stock - item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: newProductStock, ...(newProductStock === 0 ? { status: 'inactive' } : {}) },
        });

        await tx.stockLog.create({
          data: {
            productId: item.productId,
            beforeQty: productBefore.stock,
            afterQty: newProductStock,
            changeQty: -item.quantity,
            reason: 'order_create',
          },
        });

        // 库存归零自动下架
        if (newProductStock === 0) {
          await tx.stockLog.create({
            data: {
              productId: item.productId,
              beforeQty: 0, afterQty: 0, changeQty: 0,
              reason: 'auto_delist',
              note: '库存归零自动下架',
            },
          });
        }

        // 扣减 SKU 库存
        const skuId = itemDetails.find((d) => d.productId === item.productId && JSON.stringify(d.spec) === JSON.stringify(item.spec))?.skuId;
        if (skuId) {
          const skuBefore = skuMap.get(skuId);
          await tx.productSku.update({
            where: { id: skuId },
            data: { stock: skuBefore.stock - item.quantity },
          });
        }
      }

      const shippingFeeUsd = calculateShippingFee(totalUsd, deliveryRule);
      const minOrderAmountUsd = Number(deliveryRule.minOrderAmountUsd);
      if (totalUsd < minOrderAmountUsd) {
        throw new AppError(`订单金额未满 $${minOrderAmountUsd} 起送`, 400, 'ORDER_MIN_AMOUNT_NOT_MET');
      }

      // 获取当前 USD→KHR 汇率
      const exchangeRate = await getExchangeRate();

      // 3d. 创建订单 — 折扣按原价比例分摊，确保总额精确
      const orderNumber = generateOrderNumber();
      const finalTotalUsd = Math.round((totalUsd - discountUsd + shippingFeeUsd) * 100) / 100;
      const finalTotalKhr = Math.round(totalKhr - (discountUsd * exchangeRate) + (shippingFeeUsd * exchangeRate));

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
        Math.round((ip.unitPriceKhr * ip.quantity) - (ip.itemDiscountUsd * exchangeRate))
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
          status: paymentMethod === 'cod' ? 'confirmed' : 'pending_payment',
          paymentStatus: paymentMethod === 'cod' ? 'pending_cod' : 'pending',
          paymentMethod,
          paymentTimeout: paymentMethod !== 'cod' ? new Date(Date.now() + 15 * 60 * 1000) : null,
          couponId,
          shippingAddress: {
            recipient_name: address.recipientName,
            phone: address.phone,
            city_code: address.cityCode || normalizeProvinceToCityCode(address.province),
            province: address.province,
            district: address.district,
            detail: address.detail,
          },
          notes,
          items: {
            create: itemDetails.map((item, idx) => ({
              productId: item.productId,
              skuId: item.skuId || null,
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

    // 5. 失效相关商品缓存
    await cache.bumpProductListVersion();
    await Promise.all(rawItems.map((i) => cache.invalidateProductCache(i.product_id)));

    // 6. Bot 通知（fire and forget，不阻塞业务）
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, telegramId: true, language: true },
      });
      if (user?.telegramId) {
        notificationService.notifyUserOrder(
          { userId: user.id, telegramId: user.telegramId, languageCode: user.language },
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
      itemCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
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
        include: { product: { select: { nameKm: true, nameEn: true, nameZh: true, images: true } } },
      },
      coupon: { select: { titleKm: true, titleEn: true, titleZh: true, type: true, value: true } },
    },
  });
  if (!order) throw new AppError('订单不存在', 404, 'NOT_FOUND');

  // 当前状态允许的操作
  const actions = {
    canCancel: ['pending_payment', 'confirmed'].includes(order.status),
    canConfirm: order.status === 'shipped' || (order.paymentMethod === 'cod' && order.status === 'paid'),
  };

  // 构建价格明细
  const subtotalUsd = Number(order.totalUsd) + Number(order.discountUsd) - Number(order.shippingFeeUsd);
  const priceBreakdown = {
    subtotalUsd: Math.max(0, Math.round(subtotalUsd * 100) / 100),
    discountUsd: Number(order.discountUsd),
    shippingFeeUsd: Number(order.shippingFeeUsd),
    totalUsd: Number(order.totalUsd),
    totalKhr: order.totalKhr,
  };

  // 收货地址 snake_case → camelCase
  const rawAddr = order.shippingAddress || {};
  const shippingAddress = {
    recipientName: rawAddr.recipient_name || '',
    phone: rawAddr.phone || '',
    province: rawAddr.province || '',
    district: rawAddr.district || '',
    detail: rawAddr.detail || '',
  };

  // 商品清单补齐名称/缩略图
  const items = order.items.map((item) => {
    const product = item.product || {};
    const firstImage = Array.isArray(product.images) ? product.images[0] : null;
    return {
      ...item,
      productName: product.nameKm || product.nameEn || '',
      thumbnail: firstImage?.thumb_url || firstImage?.url || '',
      priceUsd: Number(item.priceUsd),
      priceKhr: item.priceKhr,
    };
  });

  // 物流信息字段名与前端对齐（兼容旧键）
  const info = order.logisticsInfo || {};
  const logistics = {
    logistics_company: info.logistics_company || info.company || '',
    tracking_number: info.tracking_number || info.trackingNumber || '',
    estimatedDelivery: info.estimatedDelivery || '',
    trackingUrl: info.trackingUrl || '',
  };

  // 订单时间线
  const timeline = [];
  const statusSteps = [
    { key: 'createdAt', label: 'orders.timeline.created' },
    { key: 'paidAt', label: 'orders.timeline.paid' },
    { key: 'shippedAt', label: 'orders.timeline.shipped' },
    { key: 'completedAt', label: 'orders.timeline.completed' },
    { key: 'cancelledAt', label: 'orders.timeline.cancelled' },
  ];
  for (const step of statusSteps) {
    const time = order[step.key];
    if (time) {
      timeline.push({ label: step.label, time });
    }
  }

  return {
    ...order,
    totalUsd: Number(order.totalUsd),
    discountUsd: Number(order.discountUsd),
    shippingFeeUsd: Number(order.shippingFeeUsd),
    shippingAddress,
    logistics,
    items,
    priceBreakdown,
    timeline,
    actions,
  };
}

export async function cancelOrder(userId, orderId, reason) {
  return prisma.$transaction(async (tx) => {
    // 在事务内读取订单并校验状态，防止并发重复取消/重复恢复库存
    const order = await tx.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });
    if (!order) throw new AppError('订单不存在', 404, 'NOT_FOUND');
    if (!['pending_payment', 'confirmed'].includes(order.status)) {
      throw new AppError('只有待付款或待发货订单可以取消', 400, 'ORDER_CANNOT_CANCEL');
    }

    // 原子更新订单状态：只有状态仍是可取消时才更新，避免重复处理
    const updatedOrder = await tx.order.updateMany({
      where: { id: orderId, status: { in: ['pending_payment', 'confirmed'] } },
      data: { status: 'cancelled', cancelledAt: new Date(), cancelReason: reason || '用户取消' },
    });
    if (updatedOrder.count === 0) {
      throw new AppError('订单状态已变更，请刷新后重试', 409, 'ORDER_STATUS_CHANGED');
    }

    // 恢复库存（加行级锁）+ 写 StockLog
    for (const item of order.items) {
      const [product] = await tx.$queryRaw`
        SELECT id, stock
        FROM products
        WHERE id = ${item.productId}::uuid
        FOR UPDATE
      `;
      if (!product) continue;
      const newStock = product.stock + item.quantity;

      await tx.product.update({
        where: { id: item.productId },
        data: { stock: newStock },
      });

      await tx.stockLog.create({
        data: {
          productId: item.productId,
          beforeQty: product.stock,
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

    return { status: 'cancelled' };
  });

  // 失效相关商品缓存
  await cache.bumpProductListVersion();
  await Promise.all(order.items.map((i) => cache.invalidateProductCache(i.productId)));

  return { status: 'cancelled' };
}

export async function confirmOrder(userId, orderId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
  });
  if (!order) throw new AppError('订单不存在', 404, 'NOT_FOUND');
  const canConfirm = order.status === 'shipped' ||
    (order.paymentMethod === 'cod' && order.status === 'paid');
  if (!canConfirm) {
    throw new AppError('只有已发货或 COD 已收款订单可以确认收货', 400, 'ORDER_CANNOT_CONFIRM');
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
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      orderNumber: true, status: true, totalUsd: true, totalKhr: true,
      paymentMethod: true, paidAt: true, createdAt: true,
      shippingAddress: true, items: { select: { productId: true, quantity: true, priceUsd: true } },
    },
    take: 10000,
  });

  const header = 'OrderNumber,Status,TotalUSD,TotalKHR,PaymentMethod,ItemCount,Phone,CreatedAt';
  const rows = orders.map(o => {
    const itemCount = o.items.reduce((s, i) => s + i.quantity, 0);
    const phone = o.shippingAddress?.phone || '';
    return `"${o.orderNumber}","${o.status}",${Number(o.totalUsd).toFixed(2)},${o.totalKhr},"${o.paymentMethod}",${itemCount},"${phone}","${o.createdAt.toISOString()}"`;
  });

  return [header, ...rows].join('\n');
}

/**
 * COD 收款确认 — 管理员手动确认货到付款已收取
 * 状态流转：confirmed/shipped → paid（记录收款信息）
 * 之后由自动确认收货任务或用户手动确认 → completed
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
  if (order.status === 'paid') {
    throw new AppError('COD 货款已确认收取', 400, 'ALREADY_PAID');
  }
  if (!['confirmed', 'shipped'].includes(order.status)) {
    throw new AppError('订单状态不支持收款确认', 400, 'ORDER_CANNOT_COLLECT');
  }

  const collectedAt = new Date();
  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'paid',
      paymentStatus: 'success',
      paidAt: collectedAt,
      logisticsInfo: {
        ...(order.logisticsInfo || {}),
        codCollectionInfo: {
          collectedAt: collectedAt.toISOString(),
          note: '管理员确认已收取 COD 货款',
        },
      },
    },
    select: { id: true, orderNumber: true, status: true, paidAt: true, paymentStatus: true },
  });
}
