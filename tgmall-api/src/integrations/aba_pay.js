// ABA Pay 集成模块 — Deep Link 生成 + Mock/Real 双模式
import crypto from 'crypto';
import { config } from '../config/index.js';

function isMockMode() {
  return config.paymentMockMode;
}

/**
 * 生成 ABA Pay 支付 Deep Link
 */
export async function generateDeepLink({ orderNumber, amountUsd, amountKhr, expiresAt }) {
  if (isMockMode()) {
    return generateMockDeepLink({ orderNumber, amountUsd, amountKhr, expiresAt });
  }
  return generateRealDeepLink({ orderNumber, amountUsd, amountKhr, expiresAt });
}

/**
 * 真实 ABA Pay Deep Link
 * Scheme: aba:// — 在 Telegram WebApp 中用 universal link 兜底
 */
function generateRealDeepLink({ orderNumber, amountUsd, amountKhr, expiresAt }) {
  const params = new URLSearchParams({
    amount: amountUsd.toFixed(2),
    currency: 'USD',
    amountKhr: String(amountKhr),
    ref: orderNumber,
    expires: expiresAt.toISOString(),
  }).toString();

  const deepLink = `aba://payment?${params}`;
  const universalLink = `https://abapay.aba.com.kh/pay?${params}`;
  const transactionId = `ABA-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  return { deepLink, universalLink, transactionId };
}

function generateMockDeepLink({ orderNumber, amountUsd, amountKhr, expiresAt }) {
  const params = new URLSearchParams({
    amount: amountUsd.toFixed(2),
    currency: 'USD',
    ref: orderNumber,
    mock: 'true',
  }).toString();

  const transactionId = `MOCK-ABA-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  return {
    deepLink: `aba://mock-payment?${params}`,
    universalLink: `https://mock-pay.tgmall.dev/aba-pay?order=${orderNumber}&amount=${amountKhr}&expires=${expiresAt.toISOString()}`,
    transactionId,
  };
}

export default { generateDeepLink, isMockMode };
