// 订单超时自动取消 Cron Job（每分钟执行）
import cron from 'node-cron';
import prisma from '../config/database.js';
import logger from '../config/logger.js';
import * as cache from '../services/cache.service.js';

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
        try {
          await prisma.$transaction(async (tx) => {
            // 原子更新：只有仍是 pending_payment 时才取消，防止与用户手动取消并发重复恢复库存
            const statusUpdate = await tx.order.updateMany({
              where: { id: order.id, status: 'pending_payment' },
              data: { status: 'cancelled', cancelledAt: new Date(), cancelReason: '支付超时' },
            });
            if (statusUpdate.count === 0) {
              return; // 已处理，跳过
            }

            // 恢复库存（加行级锁）
            for (const item of order.items) {
              const [product] = await tx.$queryRaw`
                SELECT id, stock FROM products WHERE id = ${item.productId}::uuid FOR UPDATE
              `;
              if (product) {
                await tx.product.update({
                  where: { id: item.productId },
                  data: { stock: product.stock + item.quantity },
                });
              }

              if (item.skuId) {
                const [sku] = await tx.$queryRaw`
                  SELECT id, stock FROM product_skus WHERE id = ${item.skuId}::uuid FOR UPDATE
                `;
                if (sku) {
                  await tx.productSku.update({
                    where: { id: sku.id },
                    data: { stock: sku.stock + item.quantity },
                  });
                }
              }
            }

            // 退还优惠券
            if (order.couponId) {
              await tx.userCoupon.updateMany({
                where: { userId: order.userId, couponId: order.couponId, status: 'used' },
                data: { status: 'unused', usedAt: null },
              });
            }
          });

          // 失效相关商品缓存
          await cache.bumpProductListVersion();
          await Promise.all(order.items.map((i) => cache.invalidateProductCache(i.productId)));

          logger.info({ orderNumber: order.orderNumber }, '订单支付超时已自动取消');
        } catch (innerErr) {
          logger.error({ orderNumber: order.orderNumber, error: innerErr.message }, '单笔超时订单取消失败');
        }
      }

      if (expired.length > 0) {
        logger.info(`共处理 ${expired.length} 笔超时订单`);
      }
    } catch (err) {
      logger.error({ error: err.message }, '订单超时取消任务失败');
    }
  });

  logger.info('订单超时自动取消任务已启动（每分钟）');
}
