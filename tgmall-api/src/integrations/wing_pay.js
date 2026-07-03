// Wing Pay 集成模块 — Deep Link 生成 + Mock/Real 双模式
import crypto from 'crypto';
import { config } from '../config/index.js';

function isMockMode() {
  return config.paymentMockMode;
}

/**
 * 生成 Wing Pay 支付 Deep Link
 */
export async function generateDeepLink({ orderNumber, amountUsd, amountKhr, expiresAt }) {
  if (isMockMode()) {
    return generateMockDeepLink({ orderNumber, amountUsd, amountKhr, expiresAt });
  }
  return generateRealDeepLink({ orderNumber, amountUsd, amountKhr, expiresAt });
}

/**
 * 真实 Wing Pay Deep Link
 * Scheme: wingbank://, universal: https://wingmoney.com.kh/pay
 */
function generateRealDeepLink({ orderNumber, amountUsd, amountKhr, expiresAt }) {
  const params = new URLSearchParams({
    amount: amountUsd.toFixed(2),
    currency: 'USD',
    amountKhr: String(amountKhr),
    orderId: orderNumber,
    expires: expiresAt.toISOString(),
  }).toString();

  const deepLink = `wingbank://payment?${params}`;
  const universalLink = `https://wingmoney.com.kh/pay?${params}`;
  const transactionId = `WING-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  return { deepLink, universalLink, transactionId };
}

function generateMockDeepLink({ orderNumber, amountUsd, amountKhr, expiresAt }) {
  const params = new URLSearchParams({
    amount: amountUsd.toFixed(2),
    currency: 'USD',
    orderId: orderNumber,
    mock: 'true',
  }).toString();

  const transactionId = `MOCK-WING-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  return {
    deepLink: `wingbank://mock-payment?${params}`,
    universalLink: `https://mock-pay.tgmall.dev/wing-pay?order=${orderNumber}&amount=${amountKhr}&expires=${expiresAt.toISOString()}`,
    transactionId,
  };
}

export default { generateDeepLink, isMockMode };
