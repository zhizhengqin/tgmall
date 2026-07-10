// 支付 Zod Schema 定义
import { z } from 'zod';

/** 发起 KHQR 支付请求 */
export const khqrPaymentSchema = z.object({
  order_id: z.string().uuid('订单 ID 格式无效'),
});

/** 发起 ABA Pay 支付请求 */
export const abaPayPaymentSchema = z.object({
  order_id: z.string().uuid('订单 ID 格式无效'),
});

/** 发起 Wing Pay 支付请求 */
export const wingPayPaymentSchema = z.object({
  order_id: z.string().uuid('订单 ID 格式无效'),
});

/** 发起 Telegram Invoice 支付请求 */
export const telegramInvoicePaymentSchema = z.object({
  order_id: z.string().uuid('订单 ID 格式无效'),
});

/** 支付回调 Webhook 请求（统一入口） */
export const paymentWebhookSchema = z.object({
  provider: z.enum(['bakong', 'aba_pay', 'wing_pay']),
  transaction_id: z.string().min(1, '交易 ID 不能为空'),
  order_number: z.string().min(1, '订单号不能为空'),
  amount: z.number().positive('金额必须大于0'),
  currency: z.enum(['USD', 'KHR']).default('USD'),
  status: z.enum(['success', 'failed', 'pending', 'processing']),
  paid_at: z.string().optional(),
  signature: z.string().min(1, '签名不能为空'),
});

/** Telegram Update Webhook 请求 */
export const telegramUpdateSchema = z.object({
  update_id: z.number().int(),
  pre_checkout_query: z.object({
    id: z.string(),
    from: z.object({ id: z.number().int() }).passthrough(),
    currency: z.string(),
    total_amount: z.number().int(),
    invoice_payload: z.string(),
  }).optional(),
  message: z.object({
    message_id: z.number().int(),
    from: z.object({ id: z.number().int() }).passthrough(),
    date: z.number().int(),
    chat: z.object({ id: z.number().int() }).passthrough(),
    successful_payment: z.object({
      currency: z.string(),
      total_amount: z.number().int(),
      invoice_payload: z.string(),
      telegram_payment_charge_id: z.string(),
      provider_payment_charge_id: z.string(),
    }).optional(),
  }).optional(),
});
