// Telegram Bot API + initData 校验
import crypto from 'crypto';
import { config } from '../config/index.js';

/** 校验 Telegram Mini App initData 签名 */
export function verifyInitData(initData) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');

  // 按 key 字母序排序拼接
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  // HMAC-SHA256 计算签名
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(config.botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computedHash !== hash) {
    throw new Error('initData 签名校验失败');
  }

  // 检查 auth_date 时效（24小时）
  const authDate = parseInt(params.get('auth_date'), 10);
  if (Math.floor(Date.now() / 1000) - authDate > 86400) {
    throw new Error('initData 已过期');
  }

  const user = JSON.parse(params.get('user') || '{}');
  return {
    telegramId: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    languageCode: user.language_code || 'km',
  };
}

/** 解析 initData 中的用户信息（不验证签名，仅提取字段） */
export function parseInitDataUnsafe(initData) {
  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get('user') || '{}');
  return {
    telegramId: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    languageCode: user.language_code,
  };
}
