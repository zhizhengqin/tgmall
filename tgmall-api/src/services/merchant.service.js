// 商家服务 — 公司自营商品管理、订单处理
import prisma from '../config/database.js';
import { sendShippedNotification } from '../integrations/telegram.js';
import { AppError } from '../utils/AppError.js';


// ============================================================
// 商家商品列表（含搜索 + 分页 + 状态筛选）
// ============================================================
export async function getProducts({ q, category, status, page, limit }) {
  const where = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (q) {
    where.OR = [
      { nameKm: { contains: q, mode: 'insensitive' } },
      { nameEn: { contains: q, mode: 'insensitive' } },
      { nameZh: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        nameKm: true,
        nameEn: true,
        nameZh: true,
        priceUsd: true,
        priceKhr: true,
        stock: true,
        images: true,
        category: true,
        status: true,
        salesCount: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      ...item,
      priceUsd: Number(item.priceUsd),
      thumbnail: item.images?.[0]?.thumb_url || item.images?.[0]?.url || null,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
  };
}

// ============================================================
// 获取单个商品（商家归属校验）
// ============================================================
export async function getProductById(productId) {
  const product = await prisma.product.findFirst({
    where: { id: productId },
  });
  if (!product) throw new AppError('商品不存在或不属于您的店铺', 404, 'NOT_FOUND');
  return product;
}

// ============================================================
// 上架商品
// ============================================================
export async function createProduct(body) {
  const product = await prisma.product.create({
    data: {
      nameKm: body.name_km,
      nameEn: body.name_en || null,
      nameZh: body.name_zh || null,
      descriptionKm: body.description_km || null,
      descriptionEn: body.description_en || null,
      descriptionZh: body.description_zh || null,
      priceUsd: body.price_usd,
      priceKhr: body.price_khr,
      stock: body.stock,
      alertThreshold: body.alert_threshold ?? null,
      images: body.images || [],
      specs: body.specs || [],
      tags: body.tags || [],
      category: body.category,
      status: body.status || 'active',
    },
    select: {
      id: true,
      nameKm: true,
      priceUsd: true,
      stock: true,
      status: true,
      createdAt: true,
    },
  });

  return {
    ...product,
    priceUsd: Number(product.priceUsd),
  };
}

// ============================================================
// 编辑商品
// ============================================================
export async function updateProduct(productId, body) {
  // 1. 校验商品归属
  const existing = await prisma.product.findFirst({
    where: { id: productId },
  });
  if (!existing) throw new AppError('商品不存在或不属于您的店铺', 404, 'NOT_FOUND');

  // 2. 更新
  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      nameKm: body.name_km,
      nameEn: body.name_en ?? existing.nameEn,
      nameZh: body.name_zh ?? existing.nameZh,
      descriptionKm: body.description_km ?? existing.descriptionKm,
      descriptionEn: body.description_en ?? existing.descriptionEn,
      descriptionZh: body.description_zh ?? existing.descriptionZh,
      priceUsd: body.price_usd,
      priceKhr: body.price_khr,
      stock: body.stock,
      alertThreshold: body.alert_threshold ?? existing.alertThreshold,
      images: body.images ?? existing.images,
      specs: body.specs ?? existing.specs,
      tags: body.tags ?? existing.tags,
      category: body.category,
      status: body.status ?? existing.status,
    },
    select: {
      id: true,
      nameKm: true,
      priceUsd: true,
      stock: true,
      status: true,
      updatedAt: true,
    },
  });

  return {
    ...updated,
    priceUsd: Number(updated.priceUsd),
  };
}

// ============================================================
// 上下架切换
// ============================================================
export async function toggleProduct(productId) {
  const product = await prisma.product.findFirst({
    where: { id: productId },
  });
  if (!product) throw new AppError('商品不存在或不属于您的店铺', 404, 'NOT_FOUND');

  const newStatus = product.status === 'active' ? 'inactive' : 'active';

  const updated = await prisma.product.update({
    where: { id: productId },
    data: { status: newStatus },
    select: { id: true, nameKm: true, status: true },
  });

  return updated;
}

// ============================================================
// 商家订单详情
// ============================================================
export async function getOrderDetail(orderId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { select: { nameKm: true, nameEn: true, images: true } },
        },
      },
      user: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          telegramId: true,
        },
      },
    },
  });

  if (!order) throw new AppError('订单不存在或不属于您的店铺', 404, 'NOT_FOUND');

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    totalUsd: Number(order.totalUsd),
    totalKhr: order.totalKhr,
    shippingAddress: order.shippingAddress,
    logisticsInfo: order.logisticsInfo,
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.product?.nameKm || item.productName,
      productNameEn: item.product?.nameEn,
      thumbnail: item.product?.images?.[0]?.thumb_url || '',
      quantity: item.quantity,
      unitPriceUsd: Number(item.priceUsd) / item.quantity,
      unitPriceKhr: Math.round(item.priceKhr / item.quantity),
      totalPriceUsd: Number(item.priceUsd),
      totalPriceKhr: item.priceKhr,
    })),
    customer: {
      name: [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ') || '—',
      phone: order.user?.phone || '—',
      telegramId: order.user?.telegramId,
    },
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    shippedAt: order.shippedAt,
    completedAt: order.completedAt,
    cancelledAt: order.cancelledAt,
  };
}

// ============================================================
// 商家订单列表（按状态 Tab + 日期筛选）
// ============================================================
export async function getOrders({ status, startDate, endDate, page, limit }) {
  const where = {};
  if (status) where.status = status;
  if (startDate) {
    where.createdAt = { ...(where.createdAt || {}), gte: new Date(startDate) };
  }
  if (endDate) {
    // 将 endDate 设为当天 23:59:59
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { ...(where.createdAt || {}), lte: end };
  }

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        items: {
          take: 1,
          include: { product: { select: { nameKm: true, images: true } } },
        },
        user: { select: { firstName: true, lastName: true, phone: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    items: items.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      totalUsd: Number(o.totalUsd),
      totalKhr: o.totalKhr,
      itemCount: o.items.length,
      thumbnail: o.items[0]?.product?.images?.[0]?.thumb_url || '',
      customerName: [o.user?.firstName, o.user?.lastName].filter(Boolean).join(' ') || '—',
      customerPhone: o.user?.phone || '—',
      shippingAddress: o.shippingAddress,
      logisticsInfo: o.logisticsInfo,
      createdAt: o.createdAt,
      paidAt: o.paidAt,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
  };
}

// ============================================================
// 确认发货 + Bot 通知消费者
// ============================================================
export async function shipOrder(orderId, logisticsInfo) {
  // 1. 校验订单归属 + 状态
  const order = await prisma.order.findFirst({
    where: { id: orderId },
    include: {
      user: { select: { telegramId: true, language: true } },
    },
  });
  if (!order) throw new AppError('订单不存在或不属于您的店铺', 404, 'NOT_FOUND');
  if (order.paymentMethod === 'cod') {
    if (!['confirmed', 'paid'].includes(order.status)) {
      throw new AppError('COD 订单需处于待发货或已收款状态才能发货', 400, 'ORDER_CANNOT_SHIP');
    }
  } else if (order.status !== 'paid') {
    throw new AppError('只有已付款订单才能发货', 400, 'ORDER_CANNOT_SHIP');
  }

  // 2. 更新订单状态 + 物流信息
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'shipped',
      shippedAt: new Date(),
      logisticsInfo: logisticsInfo || {},
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      shippedAt: true,
      logisticsInfo: true,
    },
  });

  // 3. Bot 通知消费者（异步，不阻塞响应）
  if (order.user?.telegramId) {
    sendShippedNotification(order.user.telegramId, order.orderNumber, order.user.language)
      .catch((err) => console.error('[Bot] 发货通知失败:', err.message));
  }

  return updated;
}

