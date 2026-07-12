// 运行时配置 —— 仅暴露前端可安全感知的字段
import { config } from '../config/index.js';

export function get(req, res) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.json({
    success: true,
    data: {
      paymentMockMode: config.paymentMockMode,
    },
  });
}
