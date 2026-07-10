// 支付路由 — /api/v1/payments/*
import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  khqrPaymentSchema,
  abaPayPaymentSchema,
  wingPayPaymentSchema,
  telegramInvoicePaymentSchema,
  mockConfirmPaymentSchema,
} from '../validators/payment.schema.js';
import { config } from '../config/index.js';
import * as ctrl from '../controllers/payment.controller.js';

const router = Router();

// 所有支付接口需要认证
router.use(auth);

// 生成 KHQR 支付二维码
router.post('/khqr', validate(khqrPaymentSchema), ctrl.khqr);

// 查询支付状态（前端轮询）
router.get('/status/:orderId', ctrl.status);

router.post('/aba_pay', validate(abaPayPaymentSchema), ctrl.abaPay);
router.post('/wing_pay', validate(wingPayPaymentSchema), ctrl.wingPay);
router.post('/telegram_invoice', validate(telegramInvoicePaymentSchema), ctrl.telegramInvoice);

// 演示模式：模拟支付确认（仅 PAYMENT_MOCK_MODE=true 时可见）
if (config.paymentMockMode) {
  router.post('/mock-confirm', validate(mockConfirmPaymentSchema), ctrl.mockConfirmPayment);
}

export default router;
