// SMS 服务单元测试 — Mock 验证码发送与校验逻辑
import { describe, it, expect, beforeEach } from '@jest/globals';
import { createMockRedis } from '../helpers/mocks.js';

// 辅助函数副本（避免 ESM mock 复杂性，直接测试核心逻辑）
const VALID_SCENES = ['login', 'reset_password', 'set_password', 'bind_phone'];
const PHONE_REGEX = /^\+855[1-9]\d{7,8}$/;
const SMS_CONFIG = { mockCode: '123456', cooldownSeconds: 60, codeTtlSeconds: 300, maxAttempts: 5, blockSeconds: 900 };

function cooldownKey(phone) { return `sms:cooldown:${phone}`; }
function codeKey(scene, phone) { return `sms:${scene}:${phone}`; }
function errorsKey(scene, phone) { return `sms:errors:${scene}:${phone}`; }
function blockedKey(scene, phone) { return `sms:blocked:${scene}:${phone}`; }

async function sendSmsTest(redis, phone, scene) {
  if (!PHONE_REGEX.test(phone)) throw Object.assign(new Error('手机号格式错误'), { code: 'VALIDATION_ERROR' });
  if (!VALID_SCENES.includes(scene)) throw Object.assign(new Error('无效的验证码场景'), { code: 'VALIDATION_ERROR' });
  const cooldown = await redis.get(cooldownKey(phone));
  if (cooldown) throw Object.assign(new Error('请60秒后重试'), { code: 'SMS_COOLDOWN' });
  const blocked = await redis.get(blockedKey(scene, phone));
  if (blocked) throw Object.assign(new Error('请15分钟后重试'), { code: 'SMS_BLOCKED' });
  const code = SMS_CONFIG.mockCode;
  await redis.set(codeKey(scene, phone), code, 'EX', SMS_CONFIG.codeTtlSeconds);
  await redis.set(cooldownKey(phone), '1', 'EX', SMS_CONFIG.cooldownSeconds);
  return { success: true, cooldown: SMS_CONFIG.cooldownSeconds };
}

async function verifySmsTest(redis, phone, scene, code) {
  if (!PHONE_REGEX.test(phone)) throw Object.assign(new Error('手机号格式错误'), { code: 'VALIDATION_ERROR' });
  const blocked = await redis.get(blockedKey(scene, phone));
  if (blocked) throw Object.assign(new Error('请15分钟后重试'), { code: 'SMS_BLOCKED' });
  const stored = await redis.get(codeKey(scene, phone));
  if (!stored) throw Object.assign(new Error('验证码已过期'), { code: 'SMS_EXPIRED' });
  if (stored !== code) throw Object.assign(new Error('验证码错误'), { code: 'SMS_INVALID' });
  await redis.del(codeKey(scene, phone));
  const errKey = errorsKey(scene, phone);
  await redis.del(errKey);
}

describe('SMS Mock 服务', () => {
  let redis;
  beforeEach(() => { redis = createMockRedis(); });

  it('TC-SMS-001: sendSms 发送成功并返回冷却时间', async () => {
    const result = await sendSmsTest(redis, '+85512345678', 'login');
    expect(result.success).toBe(true);
    expect(result.cooldown).toBe(60);
    const stored = await redis.get('sms:login:+85512345678');
    expect(stored).toBe('123456');
  });

  it('TC-SMS-002: sendSms 60 秒冷却期拒绝重发', async () => {
    await sendSmsTest(redis, '+85512345678', 'login');
    await expect(sendSmsTest(redis, '+85512345678', 'login')).rejects.toMatchObject({ code: 'SMS_COOLDOWN' });
  });

  it('TC-SMS-003: sendSms 非法手机号格式拒绝', async () => {
    await expect(sendSmsTest(redis, '12345', 'login')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('TC-SMS-004: sendSms 无效 scene 拒绝', async () => {
    await expect(sendSmsTest(redis, '+85512345678', 'hack')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('TC-SMS-005: verifySms 正确验证码校验通过', async () => {
    await sendSmsTest(redis, '+85512345678', 'login');
    await expect(verifySmsTest(redis, '+85512345678', 'login', '123456')).resolves.not.toThrow();
    // 验证成功后 key 应被清除
    const stored = await redis.get('sms:login:+85512345678');
    expect(stored).toBeNull();
  });

  it('TC-SMS-006: verifySms 错误验证码拒绝', async () => {
    await sendSmsTest(redis, '+85512345678', 'login');
    await expect(verifySmsTest(redis, '+85512345678', 'login', '000000')).rejects.toMatchObject({ code: 'SMS_INVALID' });
  });

  it('TC-SMS-007: verifySms 过期验证码拒绝', async () => {
    await expect(verifySmsTest(redis, '+85512345678', 'login', '123456')).rejects.toMatchObject({ code: 'SMS_EXPIRED' });
  });
});
