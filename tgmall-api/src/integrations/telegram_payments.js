// Telegram Payments 集成模块 — createInvoiceLink + Webhook 更新处理
import { config } from '../config/index.js';
import { AppError } from '../utils/AppError.js';

const BOT_API_BASE = 'https://api.telegram.org/bot';

function isMockMode() {
  return config.telegramPaymentsMockMode;
}

/**
 * 调用 Telegram Bot API 创建 Invoice Link
 * @param {Object} params
 * @param {string} params.orderNumber — 订单号（用于 payload）
 * @param {number} params.amountUsd — 美元金额
 * @param {string} params.title — 发票标题
 * @param {string} params.description — 发票描述
 * @returns {Promise<{invoiceUrl: string, payload: string}>}
 */
export async function createInvoiceLink({ orderNumber, amountUsd, title, description }) {
  if (isMockMode()) {
    return {
      invoiceUrl: `https://t.me/mock_payment/${orderNumber}?amount=${amountUsd.toFixed(2)}`,
      payload: orderNumber,
    };
  }

  if (!config.botToken || !config.telegramPaymentsProviderToken) {
    throw new AppError('Telegram Payments 未配置', 503, 'PAYMENT_SERVICE_UNAVAILABLE');
  }

  const payload = `tgmall:${orderNumber}:${Date.now()}`;
  const url = `${BOT_API_BASE}${config.botToken}/createInvoiceLink`;

  const body = {
    title: title.slice(0, 32),
    description: description.slice(0, 255),
    payload,
    provider_token: config.telegramPaymentsProviderToken,
    currency: 'USD',
    prices: [{ label: 'Order total', amount: Math.round(amountUsd * 100) }], // Telegram 以最小货币单位计价
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  if (!result.ok) {
    console.error('[Telegram Payments] createInvoiceLink 失败:', result.description);
    throw new AppError(
      `创建 Telegram 发票失败: ${result.description}`,
      503,
      'PAYMENT_SERVICE_UNAVAILABLE',
    );
  }

  return {
    invoiceUrl: result.result,
    payload,
  };
}

/**
 * 确认 pre_checkout_query，必须在 10 秒内响应
 */
export async function answerPreCheckoutQuery(preCheckoutQueryId, ok = true, errorMessage = '') {
  if (isMockMode()) {
    return { ok: true };
  }

  if (!config.botToken) {
    throw new AppError('BOT_TOKEN 未配置', 503, 'PAYMENT_SERVICE_UNAVAILABLE');
  }

  const url = `${BOT_API_BASE}${config.botToken}/answerPreCheckoutQuery`;
  const body = { pre_checkout_query_id: preCheckoutQueryId, ok };
  if (!ok && errorMessage) {
    body.error_message = errorMessage.slice(0, 255);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  if (!result.ok) {
    console.error('[Telegram Payments] answerPreCheckoutQuery 失败:', result.description);
    throw new AppError('确认预结账失败', 503, 'PAYMENT_SERVICE_UNAVAILABLE');
  }
  return { ok: true };
}

/**
 * 解析 Telegram Update，返回统一结构
 * @returns {Object|null}
 *   - type: 'pre_checkout_query' | 'successful_payment'
 *   - payload: 订单 payload
 *   - telegramPaymentChargeId?: string
 *   - providerPaymentChargeId?: string
 *   - totalAmountUsd?: number
 */
export function parseTelegramPaymentUpdate(update) {
  if (update.pre_checkout_query) {
    return {
      type: 'pre_checkout_query',
      preCheckoutQueryId: update.pre_checkout_query.id,
      payload: update.pre_checkout_query.invoice_payload,
      totalAmountUsd: update.pre_checkout_query.total_amount / 100,
      currency: update.pre_checkout_query.currency,
      from: update.pre_checkout_query.from,
    };
  }

  if (update.message?.successful_payment) {
    const payment = update.message.successful_payment;
    return {
      type: 'successful_payment',
      payload: payment.invoice_payload,
      telegramPaymentChargeId: payment.telegram_payment_charge_id,
      providerPaymentChargeId: payment.provider_payment_charge_id,
      totalAmountUsd: payment.total_amount / 100,
      currency: payment.currency,
    };
  }

  return null;
}

export default {
  createInvoiceLink,
  answerPreCheckoutQuery,
  parseTelegramPaymentUpdate,
  isMockMode,
};
