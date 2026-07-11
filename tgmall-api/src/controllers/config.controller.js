// 运行时配置 —— 仅暴露前端可安全感知的开关
import { config } from '../config/index.js';

export function get(req, res) {
  res.json({
    success: true,
    data: {
      paymentMockMode: config.paymentMockMode,
      telegramPaymentsMockMode: config.telegramPaymentsMockMode,
    },
  });
}
