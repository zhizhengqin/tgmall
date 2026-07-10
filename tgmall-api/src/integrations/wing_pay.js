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
 * 生产环境默认使用 HMAC-SHA256（常见模式），真实算法需按 Wing 官方文档调整。
 * 未配置 WING_PAY_SECRET 时拒绝回调，防止伪造。
 */
export function verifySignature(payload, signature) {
  if (isMockMode()) {
    return signature === 'mock-signature' || signature?.startsWith('MOCK-');
  }

  const secret = config.wingPaySecret;
  if (!secret) {
    console.error('Wing Pay 未配置 WING_PAY_SECRET，拒绝回调');
    return false;
  }

  const signString = Object.keys(payload)
    .filter((k) => k !== 'signature')
    .sort()
    .map((k) => `${k}=${payload[k]}`)
    .join('&');

  const expected = crypto.createHmac('sha256', secret).update(signString).digest('hex');
  const safeSignature = String(signature || '');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(safeSignature));
  } catch {
    return false;
  }
}

export default { generateDeepLink, isMockMode, verifySignature };
