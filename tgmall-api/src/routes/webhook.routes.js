// Webhook 回调路由 — /api/v1/webhooks/*
// 支付服务商回调通知入口，无需 JWT 认证，使用签名校验
import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { paymentWebhookSchema, telegramUpdateSchema } from '../validators/payment.schema.js';
import * as paymentService from '../services/payment.service.js';

const router = Router();

/**
 * POST /webhooks/payment
 * 支付回调统一入口（Bakong / ABA Pay / Wing Pay）
 *
 * 安全机制：
 * - 签名校验：在 service 层使用对应服务商的 Secret Key 验证
 * - 幂等处理：Redis 幂等键防重复回调
 */
router.post('/payment', validate(paymentWebhookSchema), async (req, res, next) => {
  try {
    const result = await paymentService.handlePaymentCallback(req.validatedBody);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /webhooks/telegram
 * Telegram Bot 更新入口（含 Telegram Payments 的 pre_checkout_query / successful_payment）
 */
router.post('/telegram', validate(telegramUpdateSchema), async (req, res, next) => {
  try {
    const result = await paymentService.handleTelegramPaymentUpdate(req.validatedBody);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
