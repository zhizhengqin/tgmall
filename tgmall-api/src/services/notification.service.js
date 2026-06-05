// 通知服务 — Bot 消息发送 + 消息记录 + 频率控制
import prisma from '../config/database.js';
import redis from '../config/redis.js';
import * as telegram from '../integrations/telegram.js';

/**
 * 创建通知记录
 * @param {Object} params
 * @returns {Promise<Object>}
 */
export async function createNotification({ userId, type, templateId, params, status = 'pending' }) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      templateId,
      params: params || {},
      status,
    },
  });
}

/**
 * 更新通知状态
 */
export async function updateNotificationStatus(notificationId, { status, content, error, sentAt }) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: {
      status,
      ...(content !== undefined && { content }),
      ...(error !== undefined && { error }),
      ...(sentAt !== undefined && { sentAt }),
      ...(status === 'sent' && { sentAt: new Date() }),
      ...(status === 'failed' && { failedAt: new Date(), retryCount: { increment: 1 } }),
    },
  });
}

/**
 * 频率控制检查
 * @param {string} userId
 * @param {string} type
 * @returns {Promise<boolean>} true = 允许发送
 */
async function checkRateLimit(userId, type) {
  // 商家新订单通知不限制频率（合并通知由调用方控制）
  if (type === 'merchant_new_order' || type === 'merchant_order_paid') {
    return true;
  }

  const key = `notify:ratelimit:${userId}:${type}`;
  const exists = await redis.get(key);
  if (exists) {
    return false; // 1 分钟内已发送过
  }
  // 设置 60 秒过期
  await redis.set(key, '1', 'EX', 60);
  return true;
}

/**
 * 发送通知（核心函数）
 * 流程：1. 创建通知记录 → 2. 频率检查 → 3. 发送 Bot 消息 → 4. 更新记录
 */
export async function sendNotification({ userId, telegramId, type, templateId, params, text }) {
  // 1. 创建通知记录
  const notification = await createNotification({ userId, type, templateId, params });

  // 2. 频率检查
  const allowed = await checkRateLimit(userId, type);
  if (!allowed) {
    await updateNotificationStatus(notification.id, { status: 'failed', error: 'RATE_LIMITED' });
    return { ok: false, error: 'RATE_LIMITED' };
  }

  // 3. 发送 Bot 消息
  const result = await telegram.sendMessage(telegramId, text);

  // 4. 更新记录
  if (result.ok) {
    await updateNotificationStatus(notification.id, {
      status: 'sent',
      content: text,
    });
  } else {
    await updateNotificationStatus(notification.id, {
      status: 'failed',
      error: result.error,
    });
  }

  return result;
}

/**
 * 重试失败的通知
 * @param {string} notificationId
 * @param {string} telegramId
 * @param {string} text
 * @returns {Promise<Object>}
 */
export async function retryNotification(notificationId, telegramId, text) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.retryCount >= 3) {
    return { ok: false, error: 'MAX_RETRIES_EXCEEDED' };
  }

  // 更新状态为 retrying
  await prisma.notification.update({
    where: { id: notificationId },
    data: { status: 'retrying', retryCount: { increment: 1 } },
  });

  // 重新发送
  const result = await telegram.sendMessage(telegramId, text);

  if (result.ok) {
    await updateNotificationStatus(notificationId, {
      status: 'sent',
      content: text,
    });
  } else {
    await updateNotificationStatus(notificationId, {
      status: 'failed',
      error: result.error,
    });
  }

  return result;
}

/**
 * 获取需要重试的失败通知
 * @returns {Promise<Array>}
 */
export async function getFailedNotificationsForRetry() {
  return prisma.notification.findMany({
    where: {
      status: 'failed',
      retryCount: { lt: 3 },
      failedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // 24 小时内
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });
}

/**
 * 消费者订单通知
 */
export async function notifyUserOrder(user, order, type) {
  const result = await telegram.sendOrderNotification(user, order, type);
  return sendNotification({
    userId: user.userId,
    telegramId: user.telegramId,
    type: `user_${type}`,
    templateId: `order_${type}`,
    params: { orderNumber: order.orderNumber, amount: order.totalUsd },
    text: result.text || '',
  });
}

/**
 * 商家订单通知
 */
export async function notifyMerchantOrder(merchant, order, type) {
  const result = await telegram.sendMerchantOrderNotification(merchant, order, type);
  return sendNotification({
    userId: merchant.userId,
    telegramId: merchant.telegramId,
    type: `merchant_${type}`,
    templateId: `merchant_${type}`,
    params: { orderNumber: order.orderNumber, amount: order.totalUsd },
    text: result.text || '',
  });
}

/**
 * 审核结果通知
 */
export async function notifyAuditResult(merchant, status, reason) {
  const result = await telegram.sendAuditNotification(merchant, status, reason);
  return sendNotification({
    userId: merchant.userId,
    telegramId: merchant.telegramId,
    type: `audit_${status}`,
    templateId: `audit_${status}`,
    params: { reason },
    text: result.text || '',
  });
}
