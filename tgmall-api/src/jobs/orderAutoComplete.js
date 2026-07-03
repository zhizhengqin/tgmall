// 自动确认收货 Cron Job（每天凌晨 3 点执行）
// 在线支付: shipped + shippedAt > 7 天 → completed
// COD:       paid + paidAt > 7 天 → completed
import cron from 'node-cron';
import prisma from '../config/database.js';
import logger from '../config/logger.js';

const AUTO_COMPLETE_DAYS = 7;

/**
 * 查询并自动完成到期的订单（纯函数，便于测试）
 * @param {object} db - Prisma 客户端或 Mock 事务对象
 * @param {Date} cutoff - 截止时间（shippedAt/paidAt 在此之前则自动完成）
 * @returns {Promise<{completed: number, errors: string[]}>}
 */
export async function autoCompleteOrders(db, cutoff = new Date(Date.now() - AUTO_COMPLETE_DAYS * 24 * 60 * 60 * 1000)) {
  const result = { completed: 0, errors: [] };

  // 1. 在线支付：已发货超过 7 天
  const shippedOrders = await db.order.findMany({
    where: {
      status: 'shipped',
      shippedAt: { lt: cutoff },
      paymentMethod: { not: 'cod' },
    },
    select: { id: true, orderNumber: true },
  });

  for (const order of shippedOrders) {
    try {
      await db.order.update({
        where: { id: order.id },
        data: { status: 'completed', completedAt: new Date() },
      });
      result.completed++;
      logger.info({ orderNumber: order.orderNumber }, '在线支付订单已自动确认收货（shipped 超 7 天）');
    } catch (err) {
      result.errors.push(`shipped ${order.orderNumber}: ${err.message}`);
      logger.error({ orderNumber: order.orderNumber, error: err.message }, '自动确认收货失败');
    }
  }

  // 2. COD：已收款超过 7 天（COD 的 paid 状态等同于已收货付款）
  const paidCODOrders = await db.order.findMany({
    where: {
      status: 'paid',
      paidAt: { lt: cutoff },
      paymentMethod: 'cod',
    },
    select: { id: true, orderNumber: true },
  });

  for (const order of paidCODOrders) {
    try {
      await db.order.update({
        where: { id: order.id },
        data: { status: 'completed', completedAt: new Date() },
      });
      result.completed++;
      logger.info({ orderNumber: order.orderNumber }, 'COD 订单已自动确认收货（paid 超 7 天）');
    } catch (err) {
      result.errors.push(`cod ${order.orderNumber}: ${err.message}`);
      logger.error({ orderNumber: order.orderNumber, error: err.message }, '自动确认收货失败');
    }
  }

  return result;
}

export function startOrderAutoCompleteJob() {
  // 每天凌晨 3:00 执行（避开午夜高峰）
  cron.schedule('0 3 * * *', async () => {
    try {
      const result = await autoCompleteOrders(prisma);
      if (result.completed > 0) {
        logger.info(`自动确认收货完成：${result.completed} 笔订单已完成`);
      }
      if (result.errors.length > 0) {
        logger.warn(`自动确认收货有 ${result.errors.length} 笔失败`);
      }
    } catch (err) {
      logger.error({ error: err.message, stack: err.stack }, '自动确认收货任务异常');
    }
  });

  logger.info('自动确认收货任务已启动（每天 3:00 AM）');
}
