// Bakong KHQR API 封装 — 支持模拟模式和真实 API
import crypto from 'crypto';
import { config } from '../config/index.js';

/**
 * 判断是否使用模拟模式
 * 在以下情况启用模拟模式：
 * 1. 显式设置 PAYMENT_MOCK_MODE=true
 * 2. NODE_ENV 不是 production（development/staging 默认模拟）
 */
function isMockMode() {
  return config.paymentMockMode;
}

/**
 * 生成 KHQR 支付二维码
 * @param {Object} params
 * @param {string} params.orderNumber - 订单号
 * @param {number} params.amountUsd  - USD 金额
 * @param {number} params.amountKhr  - KHR 金额
 * @param {Date}   params.expiresAt  - 过期时间
 * @returns {Promise<{ qrImageUrl: string, qrData: string, transactionId: string }>}
 */
export async function generateKHQR({ orderNumber, amountUsd, amountKhr, expiresAt }) {
  if (isMockMode()) {
    return generateMockKHQR({ orderNumber, amountUsd, amountKhr, expiresAt });
  }
  return generateRealKHQR({ orderNumber, amountUsd, amountKhr, expiresAt });
}

/**
 * 真实 Bakong API 调用 — 生成 KHQR
 */
async function generateRealKHQR({ orderNumber, amountUsd, amountKhr }) {
  if (!config.bakongApiUrl) {
    throw new Error('BAKONG_API_URL 未配置');
  }

  const payload = {
    merchantId: config.bakongMerchantId,
    orderId: orderNumber,
    amount: amountUsd.toFixed(2),
    currency: 'USD',
    amountKhr,
    description: `Order ${orderNumber}`,
  };

  const response = await fetch(`${config.bakongApiUrl}/v1/khqr/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.bakongWebhookSecret}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Bakong KHQR 生成失败 (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  return {
    qrImageUrl: data.qr || data.qr_image_url || data.qrCode,
    qrData: data.qr_data || data.md5 || '',
    transactionId: data.transaction_id || data.txnId || `BAKONG-${Date.now()}`,
  };
}

/**
 * 模拟模式 — 生成 KHQR 数据（开发和 Staging 使用）
 */
function generateMockKHQR({ orderNumber, amountUsd, amountKhr, expiresAt }) {
  // 构造符合 KHQR 标准格式的模拟数据
  // KHQR 格式: 00 + 01 + 商户信息 + 金额 + 订单号
  const mockMD5 = crypto.createHash('md5').update(`${orderNumber}-${Date.now()}`).digest('hex');
  const qrData = buildMockKHQRData({
    merchantId: config.bakongMerchantId,
    orderNumber,
    amountUsd,
    amountKhr,
    mockMD5,
  });

  const transactionId = `MOCK-BAKONG-${Date.now()}-${mockMD5.slice(0, 8)}`;

  // 生成一个模拟的二维码图片 URL — 使用本地静态资源或 placeholder
  // 实际场景中可以使用 qrcode 包动态生成，这里返回一个带参数的占位 URL
  const qrImageUrl = `${config.cdnBaseUrl}/qr/mock-khqr.png?order=${orderNumber}&amount=${amountUsd}&expires=${expiresAt.toISOString()}`;

  return {
    qrImageUrl,
    qrData,
    transactionId,
  };
}

/**
 * 构造 Mock KHQR 标准格式数据字符串
 * KHQR 标准 Tag-Length-Value (TLV) 格式
 */
function buildMockKHQRData({ merchantId, orderNumber, amountUsd, amountKhr, mockMD5 }) {
  // 简化版 KHQR 格式
  const dataParts = [
    '000201',                                           // Payload Format Indicator
    '010212',                                           // Point of Initiation Method (dynamic)
    `01${String(merchantId.length).padStart(2, '0')}${merchantId}`,  // 商户 ID
    `02${String(orderNumber.length).padStart(2, '0')}${orderNumber}`, // 订单号
    `54${String(amountUsd.toFixed(2).length).padStart(2, '0')}${amountUsd.toFixed(2)}`, // 金额 USD
    `55${String(String(amountKhr).length).padStart(2, '0')}${amountKhr}`, // 金额 KHR
    `99${String(mockMD5.length).padStart(2, '0')}${mockMD5}`, // 校验/ID
  ];

  return dataParts.join('');
}

/**
 * 验证支付回调签名
 * @param {Object} payload   - 回调请求体
 * @param {string} signature - 外部传入的签名
 * @param {string} provider  - 支付服务商标识: 'bakong' | 'aba_pay' | 'wing_pay'
 * @returns {boolean}
 */
export function verifySignature(payload, signature, provider = 'bakong') {
  if (isMockMode()) {
    // 模拟模式下放宽签名校验：接受 'mock-signature' 或标准 HMAC 格式
    if (signature === 'mock-signature' || signature?.startsWith('MOCK-')) {
      return true;
    }
  }

  const secretMap = {
    bakong: config.bakongWebhookSecret,
    aba_pay: config.abaPaySecret,
    wing_pay: config.wingPaySecret,
  };

  const secret = secretMap[provider];
  if (!secret) {
    console.error(`未配置 ${provider} 的签名密钥，拒绝回调`);
    return false;
  }

  // 构造待签名字符串：按 key 字母序排序后拼接
  const { signature: _sig, ...payloadFields } = payload;
  const dataCheckString = Object.keys(payloadFields)
    .sort()
    .map((key) => `${key}=${payloadFields[key]}`)
    .join('&');

  const computed = crypto
    .createHmac('sha256', secret)
    .update(dataCheckString)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(computed, 'utf8'),
    Buffer.from(signature, 'utf8'),
  );
}

/**
 * 查询 Bakong 交易状态（真实模式）
 * @param {string} transactionId
 */
export async function queryTransaction(transactionId) {
  if (isMockMode()) {
    // 模拟模式：直接返回 success
    return { status: 'success', transactionId };
  }

  if (!config.bakongApiUrl) {
    throw new Error('BAKONG_API_URL 未配置');
  }

  const response = await fetch(
    `${config.bakongApiUrl}/v1/transactions/${transactionId}`,
    {
      headers: {
        'Authorization': `Bearer ${config.bakongWebhookSecret}`,
      },
    },
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Bakong 交易查询失败 (${response.status}): ${errBody}`);
  }

  return response.json();
}

export default {
  generateKHQR,
  verifySignature,
  queryTransaction,
  isMockMode,
};
