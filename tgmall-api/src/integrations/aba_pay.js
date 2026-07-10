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

/**
 * 验证 ABA Pay 回调签名
 * 生产环境默认使用 HMAC-SHA256（常见模式），真实算法需按 ABA 官方文档调整。
 * 未配置 ABA_PAY_SECRET 时拒绝回调，防止伪造。
 */
export function verifySignature(payload, signature) {
  if (isMockMode()) {
    return signature === 'mock-signature' || signature?.startsWith('MOCK-');
  }

  const secret = config.abaPaySecret;
  if (!secret) {
    console.error('ABA Pay 未配置 ABA_PAY_SECRET，拒绝回调');
    return false;
  }

  // 按 key 排序后拼接为验签字符串（具体格式需按 ABA 文档替换）
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
