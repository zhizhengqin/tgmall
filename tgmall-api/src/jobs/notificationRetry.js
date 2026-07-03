// 通知重试 Cron Job（每 5 分钟执行）
// 重试 24 小时内失败且重试次数 < 3 次的通知
import cron from 'node-cron';
import {
  getFailedNotificationsForRetry,
  retryNotification,
} from '../services/notification.service.js';
import prisma from '../config/database.js';
import logger from '../config/logger.js';

export function startNotificationRetryJob() {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const notifications = await getFailedNotificationsForRetry();
      if (notifications.length === 0) return;

      logger.info({ count: notifications.length }, '通知重试：开始处理失败通知');

      for (const notification of notifications) {
        try {
          // 查询用户 telegramId
          const user = await prisma.user.findUnique({
            where: { id: notification.userId },
            select: { telegramId: true },
          });
          if (!user || !user.telegramId) {
            logger.warn({ notificationId: notification.id }, '通知重试：用户无 telegramId，跳过');
            continue;
          }

          const text = notification.content || buildTextFromParams(notification);
          await retryNotification(notification.id, user.telegramId, text);
        } catch (err) {
          logger.error({ notificationId: notification.id, error: err.message }, '通知重试：单条处理失败');
        }
      }
    } catch (err) {
      logger.error({ error: err.message }, '通知重试：Job 执行失败');
    }
  });
}

function buildTextFromParams(notification) {
  const { type, params } = notification;
  if (type?.startsWith('user_') && params?.orderNumber) {
    return `订单 ${params.orderNumber} 状态更新`;
  }
  if (type?.startsWith('merchant_') && params?.orderNumber) {
    return `新订单 ${params.orderNumber}`;
  }
  return '您有一条新通知';
}
