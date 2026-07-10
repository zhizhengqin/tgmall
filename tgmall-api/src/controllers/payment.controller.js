// 支付控制器 — KHQR / ABA Pay / Wing Pay
import * as paymentService from '../services/payment.service.js';
import { config } from '../config/index.js';
import prisma from '../config/database.js';

/** POST /payments/khqr — 生成 KHQR 支付二维码 */
export async function khqr(req, res, next) {
  try {
    const result = await paymentService.createKHQRPayment(
      req.user.userId,
      req.validatedBody.order_id,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** POST /payments/aba_pay — 发起 ABA Pay 支付（Deep Link） */
export async function abaPay(req, res, next) {
  try {
    const result = await paymentService.createABAPayPayment(
      req.user.userId,
      req.validatedBody.order_id,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** POST /payments/wing_pay — 发起 Wing Pay 支付（Deep Link） */
export async function wingPay(req, res, next) {
  try {
    const result = await paymentService.createWingPayPayment(
      req.user.userId,
      req.validatedBody.order_id,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** POST /payments/telegram_invoice — 发起 Telegram Invoice 支付 */
export async function telegramInvoice(req, res, next) {
  try {
    const result = await paymentService.createTelegramInvoicePayment(
      req.user.userId,
      req.validatedBody.order_id,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** GET /payments/status/:orderId — 查询支付状态（前端轮询） */
export async function status(req, res, next) {
  try {
    const result = await paymentService.getPaymentStatus(
      req.user.userId,
      req.params.orderId,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** provider 映射表：前端/订单使用的 key → handlePaymentCallback 内部 key */
const PROVIDER_MAP = { khqr: 'bakong' };

/** POST /payments/mock-confirm — 演示模式模拟支付确认 */
export async function mockConfirmPayment(req, res, next) {
  try {
    const { orderId, provider } = req.validatedBody;

    // 路由层已守卫，控制器二次校验
    if (!config.paymentMockMode) {
      return res.status(404).json({ success: false, message: '接口不存在' });
    }

    // 查询订单获取必要字段
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    // 映射 provider：khqr → bakong，其余不变
    const mappedProvider = PROVIDER_MAP[provider] || provider;

    // 构造模拟回调 payload，复用 handlePaymentCallback 全流程
    const payload = {
      provider: mappedProvider,
      transaction_id: `mock-${Date.now()}-${orderId}`,
      order_number: order.orderNumber,
      amount: order.totalUsd,
      status: 'success',
      paid_at: new Date().toISOString(),
      signature: 'mock-signature',
    };

    const result = await paymentService.handlePaymentCallback(payload);
    res.json({ success: true, data: { ...result, isMock: true } });
  } catch (err) {
    next(err);
  }
}
