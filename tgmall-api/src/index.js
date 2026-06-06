// 应用入口 — 启动 Express 服务器
import app from './app.js';
import { config } from './config/index.js';
import { startOrderExpiryJob } from './jobs/orderExpiry.js';
import { startPaymentReconciliationJob } from './jobs/paymentReconciliation.js';
import { setMiniAppMenuButton } from './integrations/telegram.js';

app.listen(config.port, async () => {
  console.log(`🚀 TG Mall API 已启动 → http://localhost:${config.port}`);
  console.log(`   健康检查: http://localhost:${config.port}/api/v1/health`);
  console.log(`   环境: ${config.nodeEnv}`);

  // 启动时自动设置 Bot Mini App 菜单按钮
  await setMiniAppMenuButton();

  startOrderExpiryJob();
  startPaymentReconciliationJob();
});
