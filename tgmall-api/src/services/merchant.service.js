// 商家服务 — 入驻申请、登录、看板、商品管理、订单处理、审核
import prisma from '../config/database.js';
import { config } from '../config/index.js';
import { signToken } from '../utils/jwt.js';
import { verifyInitData } from '../integrations/telegram.js';
import { AppError } from '../utils/AppError.js';

// ============================================================
// 商家入驻申请
// ============================================================
export async function registerMerchant(userId, body) {
  // 1. 查找用户获取 telegramId
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('用户不存在', 404, 'NOT_FOUND');

  // 2. 检查是否已有同 telegramId 的商家记录（防重复入驻）
  const existing = await prisma.merchant.findFirst({
    where: { phone: body.phone },
  });
  if (existing) {
    if (existing.status === 'pending') {
      throw new AppError('您的入驻申请正在审核中，请勿重复提交', 409, 'DUPLICATE_MERCHANT');
    }
    if (existing.status === 'active') {
      throw new AppError('该手机号对应的商家已存在', 409, 'DUPLICATE_MERCHANT');
    }
    // rejected 可重新提交
  }

  // 3. 创建商家记录（status = pending）
  const merchant = await prisma.merchant.create({
    data: {
      nameKm: body.name_km,
      nameEn: body.name_en || null,
      ownerName: body.owner_name,
      phone: body.phone,
      address: body.address,
      category: body.category,
      description: body.description || null,
      telegramId: user.telegramId,
      status: 'pending',
    },
  });

  return {
    id: merchant.id,
    nameKm: merchant.nameKm,
    status: merchant.status,
    createdAt: merchant.createdAt,
  };
}

// ============================================================
// 商家登录（获取 merchant 角色 JWT）
// ============================================================
export async function merchantLogin(initData) {
  // 1. 校验 initData 签名
  let userData;
  try {
    userData = verifyInitData(initData);
  } catch (err) {
    throw new AppError(err.message, 401, 'INVALID_INIT_DATA');
  }

  // 2. 查找/创建用户
  let user = await prisma.user.findUnique({
    where: { telegramId: userData.telegramId },
  });
  if (!user) {
    const langMap = { km: 'km', en: 'en', zh: 'zh' };
    const inferredLang = langMap[userData.languageCode?.slice(0, 2)] || 'km';
    user = await prisma.user.create({
      data: {
        telegramId: userData.telegramId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        language: inferredLang,
      },
    });
  }

  // 3. 查找该用户对应的 active 商家
  const merchant = await prisma.merchant.findFirst({
    where: {
      telegramId: userData.telegramId,
      status: 'active',
    },
  });

  if (!merchant) {
    const pending = await prisma.merchant.findFirst({
      where: { telegramId: userData.telegramId, status: 'pending' },
    });
    if (pending) {
      throw new AppError('您的商家账号正在审核中，请等待审核通过', 403, 'FORBIDDEN');
    }
    throw new AppError('未找到已激活的商家账号，请先申请入驻', 404, 'NOT_FOUND');
  }

  // 4. 签发 merchant 角色 JWT
  const token = signToken({
    userId: user.id,
    telegramId: user.telegramId,
    merchantId: merchant.id,
    role: 'merchant',
  });

  return {
    token,
    merchant: {
      id: merchant.id,
      nameKm: merchant.nameKm,
      nameEn: merchant.nameEn,
      phone: merchant.phone,
      category: merchant.category,
      status: merchant.status,
    },
  };
}

// ============================================================
// 商家数据看板
// ============================================================
export async function getDashboard(merchantId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [productCount, pendingOrders, shippedOrders, completedOrders,
    todayRevenue, totalRevenue] = await Promise.all([
    // 在售商品数
    prisma.product.count({ where: { merchantId, status: 'active' } }),
    // 待发货订单数
    prisma.order.count({ where: { merchantId, status: 'paid' } }),
    // 已发货订单数
    prisma.order.count({ where: { merchantId, status: 'shipped' } }),
    // 已完成订单数（本月）
    prisma.order.count({
      where: {
        merchantId,
        status: 'completed',
        completedAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
      },
    }),
    // 今日销售额
    prisma.order.aggregate({
      where: {
        merchantId,
        status: { in: ['paid', 'shipped', 'completed'] },
        createdAt: { gte: today },
      },
      _sum: { totalUsd: true },
    }),
    // 总销售额
    prisma.order.aggregate({
      where: {
        merchantId,
        status: { in: ['paid', 'shipped', 'completed'] },
      },
      _sum: { totalUsd: true },
    }),
  ]);

  return {
    productCount,
    pendingOrders,
    shippedOrders,
    completedOrdersThisMonth: completedOrders,
    todayRevenueUsd: Number(todayRevenue._sum?.totalUsd || 0),
    totalRevenueUsd: Number(totalRevenue._sum?.totalUsd || 0),
  };
}

// ============================================================
// 商家商品列表（含搜索 + 分页 + 状态筛选）
// ============================================================
export async function getProducts(merchantId, { q, category, status, page, limit }) {
  const where = { merchantId };
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
// 上架商品
// ============================================================
export async function createProduct(merchantId, body) {
  const product = await prisma.product.create({
    data: {
      merchantId,
      nameKm: body.name_km,
      nameEn: body.name_en || null,
      nameZh: body.name_zh || null,
      descriptionKm: body.description_km || null,
      descriptionEn: body.description_en || null,
      descriptionZh: body.description_zh || null,
      priceUsd: body.price_usd,
      priceKhr: body.price_khr,
      stock: body.stock,
      images: body.images || [],
      specs: body.specs || [],
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
export async function updateProduct(merchantId, productId, body) {
  // 1. 校验商品归属
  const existing = await prisma.product.findFirst({
    where: { id: productId, merchantId },
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
      images: body.images ?? existing.images,
      specs: body.specs ?? existing.specs,
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
export async function toggleProduct(merchantId, productId) {
  const product = await prisma.product.findFirst({
    where: { id: productId, merchantId },
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
export async function getOrderDetail(merchantId, orderId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, merchantId },
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
export async function getOrders(merchantId, { status, startDate, endDate, page, limit }) {
  const where = { merchantId };
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
export async function shipOrder(merchantId, orderId, logisticsInfo) {
  // 1. 校验订单归属 + 状态
  const order = await prisma.order.findFirst({
    where: { id: orderId, merchantId },
    include: {
      user: { select: { telegramId: true, language: true } },
    },
  });
  if (!order) throw new AppError('订单不存在或不属于您的店铺', 404, 'NOT_FOUND');
  if (order.status !== 'paid') {
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

// ============================================================
// 管理员审核通过
// ============================================================
export async function approveMerchant(merchantId) {
  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
  if (!merchant) throw new AppError('商家不存在', 404, 'NOT_FOUND');
  if (merchant.status === 'active') throw new AppError('该商家已通过审核', 400, 'ALREADY_APPROVED');

  const updated = await prisma.merchant.update({
    where: { id: merchantId },
    data: { status: 'active', rejectReason: null },
    select: { id: true, nameKm: true, status: true, updatedAt: true },
  });

  // Bot 通知商家审核通过
  if (merchant.telegramId) {
    sendApprovalNotification(merchant.telegramId, merchant.nameKm, true)
      .catch((err) => console.error('[Bot] 审核通知失败:', err.message));
  }

  return updated;
}

// ============================================================
// 管理员审核驳回
// ============================================================
export async function rejectMerchant(merchantId, reason) {
  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
  if (!merchant) throw new AppError('商家不存在', 404, 'NOT_FOUND');
  if (merchant.status !== 'pending') {
    throw new AppError('只能驳回待审核的商家', 400, 'MERCHANT_NOT_PENDING');
  }

  const updated = await prisma.merchant.update({
    where: { id: merchantId },
    data: { status: 'rejected', rejectReason: reason },
    select: { id: true, nameKm: true, status: true, rejectReason: true, updatedAt: true },
  });

  // Bot 通知商家审核被驳回
  if (merchant.telegramId) {
    sendApprovalNotification(merchant.telegramId, merchant.nameKm, false, reason)
      .catch((err) => console.error('[Bot] 审核通知失败:', err.message));
  }

  return updated;
}

// ============================================================
// Telegram Bot 通知辅助函数
// ============================================================

/** 发送发货通知给消费者 */
async function sendShippedNotification(telegramId, orderNumber, language) {
  const messages = {
    km: `📦 ការបញ្ជាទិញ #${orderNumber} ត្រូវបានដឹកជញ្ជូនហើយ!\nសូមតាមដានស្ថានភាពដឹកជញ្ជូននៅក្នុងកម្មវិធី។`,
    en: `📦 Order #${orderNumber} has been shipped!\nTrack your delivery status in the app.`,
    zh: `📦 订单 #${orderNumber} 已发货！\n请在应用中跟踪物流状态。`,
  };
  const text = messages[language] || messages.km;
  await sendTelegramMessage(telegramId, text);
}

/** 发送审核结果通知给商家 */
async function sendApprovalNotification(telegramId, merchantName, approved, reason) {
  let text;
  if (approved) {
    text = `✅ ហាង "${merchantName}" ត្រូវបានអនុម័ត!\nឥឡូវអ្នកអាចប្រើប្រាស់ផ្ទាំងគ្រប់គ្រងរបស់អ្នកបាន។`;
  } else {
    text = `❌ ហាង "${merchantName}" មិនត្រូវបានអនុម័ត។\nមូលហេតុ: ${reason}`;
  }
  await sendTelegramMessage(telegramId, text);
}

/** 底层 Telegram Bot API 消息发送 */
async function sendTelegramMessage(telegramId, text) {
  const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: telegramId,
      text,
      parse_mode: 'HTML',
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Telegram API 返回 ${response.status}: ${errBody}`);
  }
}
