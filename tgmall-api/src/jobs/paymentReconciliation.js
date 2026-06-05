// 支付对账 Cron Job（每 5 分钟执行）
// 功能：
//   1. 处理超时未支付的 pending 订单 → 标记 paymentStatus=failed
//   2. 处理长时间 processing 的订单 → 调用 Bakong 查询实际状态
//   3. 补充 orderExpiry 未覆盖的边缘场景（如 webhook 丢失）
import cron from 'node-cron';
import prisma from '../config/database.js';
import redis from '../config/redis.js';
import logger from '../config/logger.js';
import * as bakong from '../integrations/bakong.js';

// 超过此时间的 processing 订单将被主动查询 Bakong
const PROCESSING_TIMEOUT_MINUTES = 15;

export function startPaymentReconciliationJob() {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      const processingCutoff = new Date(now.getTime() - PROCESSING_TIMEOUT_MINUTES * 60 * 1000);

      // ---- 1. 查找待对账的订单 ----
      // paymentStatus = 'pending' 且已过 paymentTimeout 的（orderExpiry 会把 status 改成 cancelled，
      // 但 paymentStatus 可能仍为 pending，这里做二次确认）
      const overduePendingOrders = await prisma.order.findMany({
        where: {
          paymentStatus: 'pending',
          paymentTimeout: { lt: now },
          status: { not: 'cancelled' },
        },
        select: { id: true, orderNumber: true, paymentTimeout: true, paymentMethod: true },
      });

      for (const order of overduePendingOrders) {
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'failed' },
        });
        logger.info(
          { orderNumber: order.orderNumber, paymentTimeout: order.paymentTimeout },
          '支付对账：超时 pending 订单已标记为 failed',
        );
      }

      // ---- 2. 处理长时间处于 processing 的订单 ----
      const stalledProcessingOrders = await prisma.order.findMany({
        where: {
          paymentStatus: 'processing',
          createdAt: { lt: processingCutoff },
          status: { not: 'cancelled' },
        },
        select: {
          id: true,
          orderNumber: true,
          paymentMethod: true,
          totalUsd: true,
          createdAt: true,
        },
        take: 20,
      });

      for (const order of stalledProcessingOrders) {
        // 从 Redis 获取缓存的交易 ID
        const paymentKey = `payment:${order.id}`;
        const cachedPayment = await redis.get(paymentKey);

        if (!cachedPayment) {
          // 无缓存信息，标记为 failed（webhook 可能丢失）
          await prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: 'failed' },
          });
          logger.warn(
            { orderNumber: order.orderNumber },
            '支付对账：长时间 processing 且无缓存 → 标记 failed',
          );
          continue;
        }

        const paymentInfo = JSON.parse(cachedPayment);
        const { transactionId } = paymentInfo;

        // 调用 Bakong 查询实际状态（仅在非 mock 模式下实际调用）
        try {
          const txStatus = await bakong.queryTransaction(transactionId);

          if (txStatus.status === 'success') {
            // Bakong 返回成功，但 webhook 未到达 → 手动完成支付
            await prisma.$transaction(async (tx) => {
              const currentOrder = await tx.order.findUnique({
                where: { id: order.id },
              });

              if (currentOrder.paymentStatus === 'success') return;

              await tx.order.update({
                where: { id: order.id },
                data: {
                  paymentStatus: 'success',
                  status: 'paid',
                  paidAt: new Date(),
                },
              });

              // 增加销量
              const items = await tx.orderItem.findMany({
                where: { orderId: order.id },
                select: { productId: true, quantity: true },
              });
              for (const item of items) {
                await tx.product.update({
                  where: { id: item.productId },
                  data: { salesCount: { increment: item.quantity } },
                });
              }
            });

            logger.info(
              { orderNumber: order.orderNumber, transactionId },
              '支付对账：Bakong 确认已支付，手动完成订单',
            );
          } else if (txStatus.status === 'failed') {
            await prisma.order.update({
              where: { id: order.id },
              data: { paymentStatus: 'failed' },
            });
            logger.info(
              { orderNumber: order.orderNumber },
              '支付对账：Bakong 返回失败，标记 failed',
            );
          }
          // pending/processing: 继续等待，不做变更
        } catch (queryErr) {
          // Bakong 查询失败（网络问题或模拟模式） — 继续等待
          logger.warn(
            { orderNumber: order.orderNumber, error: queryErr.message },
            '支付对账：Bakong 查询失败，跳过本次对账',
          );
        }
      }

      // ---- 3. 汇总日志 ----
      if (overduePendingOrders.length > 0 || stalledProcessingOrders.length > 0) {
        logger.info(
          {
            overduePending: overduePendingOrders.length,
            stalledProcessing: stalledProcessingOrders.length,
          },
          '支付对账周期完成',
        );
      }
    } catch (err) {
      logger.error({ error: err.message, stack: err.stack }, '支付对账任务异常');
    }
  });

  logger.info('支付对账任务已启动（每 5 分钟）');
}
