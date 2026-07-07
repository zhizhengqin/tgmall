// 应用入口 — 启动 Express 服务器
import app from './app.js';
import { config } from './config/index.js';
import { startOrderExpiryJob } from './jobs/orderExpiry.js';
import { startPaymentReconciliationJob } from './jobs/paymentReconciliation.js';
import { startOrderAutoCompleteJob } from './jobs/orderAutoComplete.js';
import { startNotificationRetryJob } from './jobs/notificationRetry.js';
import { setMiniAppMenuButton } from './integrations/telegram.js';

if (config.paymentMockMode) {
  console.warn('⚠️  支付模拟模式已开启：所有支付回调将被放行，仅用于开发/测试环境');
}

app.listen(config.port, async () => {
  console.log(`🚀 TG Mall API 已启动 → http://localhost:${config.port}`);
  console.log(`   健康检查: http://localhost:${config.port}/api/v1/health`);
  console.log(`   环境: ${config.nodeEnv}`);

  // 启动时自动设置 Bot Mini App 菜单按钮
  await setMiniAppMenuButton();

  startOrderExpiryJob();
  startPaymentReconciliationJob();
  startOrderAutoCompleteJob();
  startNotificationRetryJob();
});

// Railway 边缘路由可能固定指向 3000，额外监听该端口做兼容兜底
// 当显式指定 API_PORT 时（Railway Docker + Nginx 代理模式），不再监听 3000，避免与 Nginx 冲突
if (config.port !== 3000 && !process.env.API_PORT) {
  app.listen(3000, () => {
    console.log(`🛡️ 兼容监听端口 3000 → http://localhost:3000`);
  });
}
