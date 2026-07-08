// SMS 服务集成测试 — 验证 provider 抽象与真实服务调用
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const redisStore = new Map();
const redisMock = {
  get: jest.fn((key) => Promise.resolve(redisStore.get(key) || null)),
  set: jest.fn((key, value, ...args) => {
    redisStore.set(key, value);
    return Promise.resolve('OK');
  }),
  del: jest.fn((key) => {
    redisStore.delete(key);
    return Promise.resolve(1);
  }),
  incr: jest.fn((key) => {
    const next = (redisStore.get(key) || 0) + 1;
    redisStore.set(key, next);
    return Promise.resolve(next);
  }),
  expire: jest.fn(() => Promise.resolve(1)),
  _clear: () => redisStore.clear(),
};

const configMock = {
  nodeEnv: 'test',
  sms: {
    provider: 'mock',
    mockEnabled: true,
    apiKey: '',
    apiSecret: '',
    senderId: '',
    accountSid: '',
    authToken: '',
    from: '',
    cooldownSeconds: 60,
    codeTtlSeconds: 300,
    maxAttempts: 5,
    blockSeconds: 900,
  },
};

jest.unstable_mockModule('../../src/config/redis.js', () => ({ default: redisMock }));
jest.unstable_mockModule('../../src/config/index.js', () => ({ config: configMock }));

const { sendSms, verifySms } = await import('../../src/services/sms.service.js');

describe('SMS 服务集成', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisStore.clear();
  });

  it('TC-SMS-I01: sendSms 使用 mock provider 成功并写入 Redis', async () => {
    const result = await sendSms('+85512345678', 'login');
    expect(result.success).toBe(true);
    expect(result.cooldown).toBe(60);
    expect(redisStore.get('sms:login:+85512345678')).toMatch(/^\d{6}$/);
    expect(redisStore.get('sms:cooldown:+85512345678')).toBe('1');
  });

  it('TC-SMS-I02: sendSms 冷却期内拒绝', async () => {
    redisStore.set('sms:cooldown:+85512345678', '1');
    await expect(sendSms('+85512345678', 'login')).rejects.toMatchObject({ errorCode: 'SMS_COOLDOWN' });
  });

  it('TC-SMS-I03: sendSms 锁定状态下拒绝', async () => {
    redisStore.set('sms:blocked:login:+85512345678', '1');
    await expect(sendSms('+85512345678', 'login')).rejects.toMatchObject({ errorCode: 'SMS_BLOCKED' });
  });

  it('TC-SMS-I04: verifySms 正确验证码通过并清理', async () => {
    redisStore.set('sms:login:+85512345678', '123456');
    await expect(verifySms('+85512345678', 'login', '123456')).resolves.not.toThrow();
    expect(redisStore.has('sms:login:+85512345678')).toBe(false);
  });

  it('TC-SMS-I05: verifySms 错误验证码递增错误次数', async () => {
    redisStore.set('sms:login:+85512345678', '123456');
    await expect(verifySms('+85512345678', 'login', '000000')).rejects.toMatchObject({ errorCode: 'SMS_INVALID' });
    expect(redisStore.get('sms:errors:login:+85512345678')).toBe(1);
  });
});
