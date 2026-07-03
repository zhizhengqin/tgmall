// 支付服务 — KHQR 支付统一入口 + 回调处理
import prisma from '../config/database.js';
import redis from '../config/redis.js';
import { AppError } from '../utils/AppError.js';
import * as bakong from '../integrations/bakong.js';
import * as abaPay from '../integrations/aba_pay.js';
import * as wingPay from '../integrations/wing_pay.js';
import { sendOrderNotification } from '../integrations/telegram.js';

/**
 * 生成 KHQR 支付二维码
 * POST /payments/khqr
 *
 * 流程：
 * 1. 查询订单并校验归属 + 状态
 * 2. 调用 Bakong API 生成 KHQR 二维码
 * 3. 返回二维码数据给前端展示
 */
export async function createKHQRPayment(userId, orderId) {
  // 1. 查询订单
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
  });

  if (!order) {
    throw new AppError('订单不存在', 404, 'NOT_FOUND');
  }

  // 2. 校验订单状态
  if (order.status === 'cancelled') {
    throw new AppError('订单已取消', 400, 'ORDER_CANCELLED');
  }

  if (order.paymentStatus === 'success') {
    throw new AppError('订单已支付，无需重复支付', 400, 'ORDER_ALREADY_PAID');
  }

  if (order.status !== 'pending_payment') {
    throw new AppError('订单状态不支持支付', 400, 'ORDER_NOT_PAYABLE');
  }

  // 3. 校验支付方式
  if (order.paymentMethod !== 'khqr') {
    throw new AppError('该订单未选择 KHQR 支付方式', 400, 'VALIDATION_ERROR');
  }

  // 4. 检查支付是否超时
  if (order.paymentTimeout && new Date() > order.paymentTimeout) {
    throw new AppError('支付已超时，请重新下单', 400, 'ORDER_CANCELLED');
  }

  // 5. 调用 Bakong 生成 KHQR
  let qrResult;
  try {
    qrResult = await bakong.generateKHQR({
      orderNumber: order.orderNumber,
      amountUsd: Number(order.totalUsd),
      amountKhr: order.totalKhr,
      expiresAt: order.paymentTimeout || new Date(Date.now() + 15 * 60 * 1000),
    });
  } catch (err) {
    console.error('Bakong KHQR 生成失败:', err.message);
    throw new AppError(
      '支付服务暂不可用，请稍后重试或选择其他支付方式',
      503,
      'PAYMENT_SERVICE_UNAVAILABLE',
    );
  }

  // 6. 缓存支付信息到 Redis（供后续状态查询和防重放）
  const paymentKey = `payment:${order.id}`;
  await redis.set(paymentKey, JSON.stringify({
    transactionId: qrResult.transactionId,
    amountUsd: Number(order.totalUsd),
    amountKhr: order.totalKhr,
    createdAt: new Date().toISOString(),
    expiresAt: order.paymentTimeout?.toISOString() || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  }), 'EX', 1800); // 30 分钟过期

  // 7. 返回给前端的支付信息
  return {
    orderNumber: order.orderNumber,
    qrImageUrl: qrResult.qrImageUrl,
    qrData: qrResult.qrData,
    amountUsd: Number(order.totalUsd),
    amountKhr: order.totalKhr,
    expiresAt: order.paymentTimeout || new Date(Date.now() + 15 * 60 * 1000),
    supportedBanks: [
      { name: 'ABA Bank', icon: 'https://cdn.shop.xinhua-tech.kh/banks/aba.png' },
      { name: 'ACLEDA Bank', icon: 'https://cdn.shop.xinhua-tech.kh/banks/acleda.png' },
      { name: 'Wing Bank', icon: 'https://cdn.shop.xinhua-tech.kh/banks/wing.png' },
    ],
  };
}

/**
 * 发起 ABA Pay 支付 — 生成 Deep Link 跳转 ABA Mobile App
 * POST /payments/aba_pay
 *
 * 验证逻辑与 createKHQRPayment 相同，但返回 Deep Link 而非 QR 码。
 * 支付完成后通过统一 Webhook 回调确认。
 */
export async function createABAPayPayment(userId, orderId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
  });

  if (!order) throw new AppError('订单不存在', 404, 'NOT_FOUND');
  if (order.status === 'cancelled') throw new AppError('订单已取消', 400, 'ORDER_CANCELLED');
  if (order.paymentStatus === 'success') throw new AppError('订单已支付，无需重复支付', 400, 'ORDER_ALREADY_PAID');
  if (order.status !== 'pending_payment') throw new AppError('订单状态不支持支付', 400, 'ORDER_NOT_PAYABLE');
  if (order.paymentMethod !== 'aba_pay') throw new AppError('该订单未选择 ABA Pay 支付方式', 400, 'VALIDATION_ERROR');
  if (order.paymentTimeout && new Date() > order.paymentTimeout) throw new AppError('支付已超时，请重新下单', 400, 'ORDER_CANCELLED');

  let result;
  try {
    result = await abaPay.generateDeepLink({
      orderNumber: order.orderNumber,
      amountUsd: Number(order.totalUsd),
      amountKhr: order.totalKhr,
      expiresAt: order.paymentTimeout || new Date(Date.now() + 15 * 60 * 1000),
    });
  } catch (err) {
    console.error('ABA Pay Deep Link 生成失败:', err.message);
    throw new AppError('支付服务暂不可用，请稍后重试或选择其他支付方式', 503, 'PAYMENT_SERVICE_UNAVAILABLE');
  }

  // 缓存支付信息到 Redis
  const paymentKey = `payment:${order.id}`;
  await redis.set(paymentKey, JSON.stringify({
    transactionId: result.transactionId,
    amountUsd: Number(order.totalUsd),
    amountKhr: order.totalKhr,
    createdAt: new Date().toISOString(),
    expiresAt: order.paymentTimeout?.toISOString() || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  }), 'EX', 1800);

  return {
    orderNumber: order.orderNumber,
    deepLink: result.deepLink,
    universalLink: result.universalLink,
    transactionId: result.transactionId,
    amountUsd: Number(order.totalUsd),
    amountKhr: order.totalKhr,
    expiresAt: order.paymentTimeout || new Date(Date.now() + 15 * 60 * 1000),
  };
}

/**
 * 发起 Wing Pay 支付 — 生成 Deep Link 跳转 Wing Bank App
 * POST /payments/wing_pay
 */
export async function createWingPayPayment(userId, orderId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
  });

  if (!order) throw new AppError('订单不存在', 404, 'NOT_FOUND');
  if (order.status === 'cancelled') throw new AppError('订单已取消', 400, 'ORDER_CANCELLED');
  if (order.paymentStatus === 'success') throw new AppError('订单已支付，无需重复支付', 400, 'ORDER_ALREADY_PAID');
  if (order.status !== 'pending_payment') throw new AppError('订单状态不支持支付', 400, 'ORDER_NOT_PAYABLE');
  if (order.paymentMethod !== 'wing_pay') throw new AppError('该订单未选择 Wing Pay 支付方式', 400, 'VALIDATION_ERROR');
  if (order.paymentTimeout && new Date() > order.paymentTimeout) throw new AppError('支付已超时，请重新下单', 400, 'ORDER_CANCELLED');

  let result;
  try {
    result = await wingPay.generateDeepLink({
      orderNumber: order.orderNumber,
      amountUsd: Number(order.totalUsd),
      amountKhr: order.totalKhr,
      expiresAt: order.paymentTimeout || new Date(Date.now() + 15 * 60 * 1000),
    });
  } catch (err) {
    console.error('Wing Pay Deep Link 生成失败:', err.message);
    throw new AppError('支付服务暂不可用，请稍后重试或选择其他支付方式', 503, 'PAYMENT_SERVICE_UNAVAILABLE');
  }

  // 缓存支付信息到 Redis
  const paymentKey = `payment:${order.id}`;
  await redis.set(paymentKey, JSON.stringify({
    transactionId: result.transactionId,
    amountUsd: Number(order.totalUsd),
    amountKhr: order.totalKhr,
    createdAt: new Date().toISOString(),
    expiresAt: order.paymentTimeout?.toISOString() || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  }), 'EX', 1800);

  return {
    orderNumber: order.orderNumber,
    deepLink: result.deepLink,
    universalLink: result.universalLink,
    transactionId: result.transactionId,
    amountUsd: Number(order.totalUsd),
    amountKhr: order.totalKhr,
    expiresAt: order.paymentTimeout || new Date(Date.now() + 15 * 60 * 1000),
  };
}

/**
 * 查询支付状态
 * GET /payments/status/:orderId
 *
 * 前端轮询此接口（建议每 3 秒），检测支付是否完成。
 */
export async function getPaymentStatus(userId, orderId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: {
      orderNumber: true,
      status: true,
      paymentStatus: true,
      paidAt: true,
      paymentTimeout: true,
      totalUsd: true,
    },
  });

  if (!order) {
    throw new AppError('订单不存在', 404, 'NOT_FOUND');
  }

  // 检查支付超时：如果 pending 状态且已超时，返回 failed
  const isExpired = order.paymentTimeout && new Date() > order.paymentTimeout;
  if (order.paymentStatus === 'pending' && isExpired) {
    return {
      orderNumber: order.orderNumber,
      paymentStatus: 'failed',
      orderStatus: order.status,
      failureReason: '支付超时',
      amountUsd: Number(order.totalUsd),
    };
  }

  return {
    orderNumber: order.orderNumber,
    paymentStatus: order.paymentStatus,
    orderStatus: order.status,
    paidAt: order.paidAt,
    amountUsd: Number(order.totalUsd),
  };
}

/**
 * 处理支付回调（统一入口）
 * POST /webhooks/payment
 *
 * 安全要求：
 * 1. 验签 — 防伪造回调
 * 2. 幂等 — 防重复回调（同一笔交易只处理一次）
 * 3. 事务 — 确保订单状态和库存一致
 */
export async function handlePaymentCallback(payload) {
  const {
    provider,
    transaction_id: transactionId,
    order_number: orderNumber,
    amount,
    status,
    paid_at: paidAt,
    signature,
  } = payload;

  // ---- 1. 按 provider 验签 ----
  const verifyFns = {
    bakong: bakong.verifySignature,
    aba_pay: abaPay.verifySignature,
    wing_pay: wingPay.verifySignature,
  };
  const verifyFn = verifyFns[provider];
  if (!verifyFn) {
    console.error(`未知支付渠道回调: provider=${provider}`);
    throw new AppError('未知的支付渠道', 400, 'INVALID_PROVIDER');
  }
  const isValid = verifyFn(payload, signature);
  if (!isValid) {
    console.error(`支付回调验签失败: provider=${provider}, order=${orderNumber}, txn=${transactionId}`);
    throw new AppError('签名验证失败', 401, 'UNAUTHORIZED');
  }

  // ---- 2. 幂等检查（Redis 分布式防重） ----
  // 注意：幂等标记在事务成功后设置（见第 224 行），避免事务失败导致订单 stuck
  const idempotencyKey = `payment:callback:${provider}:${transactionId}`;
  const isDuplicate = await redis.get(idempotencyKey);
  if (isDuplicate) {
    console.warn(`重复支付回调已忽略: provider=${provider}, order=${orderNumber}, txn=${transactionId}`);
    return { status: 'duplicate', message: '回调已处理过' };
  }

  // ---- 3. 查询订单 ----
  const order = await prisma.order.findUnique({
    where: { orderNumber },
  });

  if (!order) {
    console.error(`支付回调订单不存在: ${orderNumber}`);
    throw new AppError('订单不存在', 404, 'NOT_FOUND');
  }

  // ---- 4. 校验回调金额与订单金额一致 ----
  const callbackAmount = Number(amount);
  const orderAmount = Number(order.totalUsd);
  if (!Number.isNaN(callbackAmount) && callbackAmount !== orderAmount) {
    console.error(`支付回调金额不匹配: provider=${provider}, order=${orderNumber}, txn=${transactionId}, callback=${callbackAmount}, order=${orderAmount}`);
    throw new AppError('支付金额不匹配', 400, 'AMOUNT_MISMATCH');
  }

  // ---- 5. 处理支付结果 ----
  if (status === 'success') {
    let transactionCommitted = false;
    // 成功：更新订单状态
    try {
      await prisma.$transaction(async (tx) => {
        // 5a. 检查订单是否已经被处理过（双重保险：DB 级别幂等）
        const currentOrder = await tx.order.findUnique({
          where: { id: order.id },
        });

        if (currentOrder.paymentStatus === 'success') {
          // 已经处理过，跳过
          return;
        }

        // 5b. 更新订单支付状态
        const parsedPaidAt = paidAt ? new Date(paidAt) : new Date();
        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'success',
            status: 'paid',
            paidAt: parsedPaidAt,
          },
        });

        // 5c. 增加商品销量计数
        const orderItems = await tx.orderItem.findMany({
          where: { orderId: order.id },
          select: { productId: true, quantity: true },
        });

        for (const item of orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { salesCount: { increment: item.quantity } },
          });
        }
        transactionCommitted = true;
      });

      // 5d. 事务成功后才设置幂等标记，防止事务失败导致订单 stuck
      if (transactionCommitted) {
        await redis.set(idempotencyKey, '1', 'EX', 86400);
      }

      console.log(`支付成功: order=${orderNumber}, txn=${transactionId}, amount=${amount}`);

      // 5. Bot 通知（fire and forget，不阻塞回调响应）
      try {
        // 通知消费者支付成功
        const user = await prisma.user.findUnique({
          where: { id: order.userId },
          select: { telegramId: true, language: true },
        });
        if (user?.telegramId) {
          sendOrderNotification(
            { telegramId: user.telegramId, languageCode: user.language },
            order, 'paid',
          ).catch((e) => console.error('[Bot] 支付成功通知失败:', e.message));
        }
        // V2 公司自营模式：平台统一处理订单，无需通知商家
      } catch (e) {
        console.error('[Bot] 支付通知查询失败:', e.message);
      }
    } catch (err) {
      console.error(`支付成功处理异常: ${err.message}`, err);
      // 事务失败时幂等标记不会设置，允许后续真实回调重试
      throw new AppError('支付处理异常，请人工核查', 500, 'INTERNAL_ERROR');
    }
  } else if (status === 'failed') {
    // 失败：标记支付失败
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'failed' },
    });
    console.warn(`支付失败: order=${orderNumber}, txn=${transactionId}`);
  } else {
    // pending / processing：仅记录，不改变状态
    console.log(`支付回调 ${status}: order=${orderNumber}, txn=${transactionId}`);
    if (status === 'processing') {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'processing' },
      });
    }
  }

  return { status: 'processed', message: '回调处理完成' };
}
