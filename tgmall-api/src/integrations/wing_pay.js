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

/**
 * 验证 Wing Pay 回调签名
 * 真实算法需对接 Wing 官方文档；目前未实现真实验签，生产环境应拒绝。
 */
export function verifySignature(payload, signature) {
  if (isMockMode()) {
    return signature === 'mock-signature' || signature?.startsWith('MOCK-');
  }
  console.error('Wing Pay 真实回调验签未实现，拒绝回调');
  return false;
}

export default { generateDeepLink, isMockMode, verifySignature };
