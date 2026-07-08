// SMS 服务 — 验证码发送与校验
import crypto from 'crypto';
import redis from '../config/redis.js';
import { config } from '../config/index.js';
import { AppError } from '../utils/AppError.js';
import { createSmsProvider } from '../integrations/sms/index.js';

const VALID_SCENES = ['login', 'reset_password', 'set_password', 'bind_phone', 'admin_login'];
const PHONE_REGEX = /^\+855[1-9]\d{7,8}$/;

function cooldownKey(phone) { return `sms:cooldown:${phone}`; }
function codeKey(scene, phone) { return `sms:${scene}:${phone}`; }
function errorsKey(scene, phone) { return `sms:errors:${scene}:${phone}`; }
function blockedKey(scene, phone) { return `sms:blocked:${scene}:${phone}`; }

let providerInstance = null;
function getProvider() {
  if (!providerInstance) {
    providerInstance = createSmsProvider(config.sms);
  }
  return providerInstance;
}

/**
 * 生成 6 位数字验证码
 */
function generateCode() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * 发送短信验证码
 * @param {string} phone — 手机号，格式 +855xxxxxxxx
 * @param {string} scene — login | reset_password | set_password | bind_phone
 * @returns {{ success: boolean, cooldown: number }}
 */
export async function sendSms(phone, scene) {
  if (!PHONE_REGEX.test(phone)) throw new AppError('手机号格式错误', 400, 'VALIDATION_ERROR');
  if (!VALID_SCENES.includes(scene)) throw new AppError('无效的验证码场景', 400, 'VALIDATION_ERROR');

  // 60 秒冷却
  const cooldown = await redis.get(cooldownKey(phone));
  if (cooldown) throw new AppError('请 60 秒后重试', 429, 'SMS_COOLDOWN');

  // 15 分钟锁定
  const blocked = await redis.get(blockedKey(scene, phone));
  if (blocked) throw new AppError('验证码错误次数过多，请 15 分钟后重试', 429, 'SMS_BLOCKED');

  const { provider, mockEnabled } = config.sms;

  // 生产环境未配置真实短信网关时拒绝发送
  if (config.nodeEnv === 'production' && provider === 'mock' && !mockEnabled) {
    throw new AppError('短信服务未配置', 503, 'SMS_GATEWAY_NOT_CONFIGURED');
  }

  const code = generateCode();
  const providerClient = getProvider();
  await providerClient.send(phone, `Your TG Mall code is ${code}`);

  await redis.set(codeKey(scene, phone), code, 'EX', config.sms.codeTtlSeconds);
  await redis.set(cooldownKey(phone), '1', 'EX', config.sms.cooldownSeconds);

  return { success: true, cooldown: config.sms.cooldownSeconds };
}

/**
 * 校验短信验证码
 * @param {string} phone — 手机号
 * @param {string} scene — 场景
 * @param {string} code — 用户输入的验证码
 * @throws {AppError} 验证码错误/过期/锁定
 */
export async function verifySms(phone, scene, code) {
  if (!PHONE_REGEX.test(phone)) throw new AppError('手机号格式错误', 400, 'VALIDATION_ERROR');

  // 检查 15 分钟锁定
  const blocked = await redis.get(blockedKey(scene, phone));
  if (blocked) throw new AppError('验证码错误次数过多，请 15 分钟后重试', 429, 'SMS_BLOCKED');

  const stored = await redis.get(codeKey(scene, phone));
  if (!stored) throw new AppError('验证码已过期，请重新获取', 400, 'SMS_EXPIRED');

  if (stored !== code) {
    // 增加错误计数
    const attempts = await redis.incr(errorsKey(scene, phone));
    if (attempts === 1) await redis.expire(errorsKey(scene, phone), config.sms.codeTtlSeconds);
    if (attempts >= config.sms.maxAttempts) {
      await redis.set(blockedKey(scene, phone), '1', 'EX', config.sms.blockSeconds);
      await redis.del(codeKey(scene, phone));
      await redis.del(errorsKey(scene, phone));
      throw new AppError('验证码错误次数过多，请 15 分钟后重试', 429, 'SMS_BLOCKED');
    }
    throw new AppError('验证码错误', 400, 'SMS_INVALID');
  }

  // 校验成功，清理 Redis
  await redis.del(codeKey(scene, phone));
  await redis.del(errorsKey(scene, phone));
}
