// 订单超时自动取消 Cron Job（每分钟执行）
import cron from 'node-cron';
import prisma from '../config/database.js';
import logger from '../config/logger.js';

export function startOrderExpiryJob() {
  cron.schedule('* * * * *', async () => {
    try {
      const expired = await prisma.order.findMany({
        where: {
          status: 'pending_payment',
          paymentTimeout: { lt: new Date() },
        },
        include: { items: true },
      });

      for (const order of expired) {
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
              where: { userId: order.userId, couponId: order.couponId, status: 'used' },
              data: { status: 'unused', usedAt: null },
            });
          }
          // 更新状态
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'cancelled', cancelledAt: new Date(), cancelReason: '支付超时' },
          });
        });

        logger.info({ orderNumber: order.orderNumber }, '订单支付超时已自动取消');
      }

      if (expired.length > 0) {
        logger.info(`共取消 ${expired.length} 笔超时订单`);
      }
    } catch (err) {
      logger.error({ error: err.message }, '订单超时取消任务失败');
    }
  });

  logger.info('订单超时自动取消任务已启动（每分钟）');
}
