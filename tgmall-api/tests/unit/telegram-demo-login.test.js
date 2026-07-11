// 演示环境浏览器登录：verifyInitData 不再处理 demo hash，统一走独立 /auth/demo-login 端点
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const botToken = 'test-bot-token';
const configMock = {
  botToken,
  paymentMockMode: false,
};

const redisStore = new Map();
const redisMock = {
  get: jest.fn((key) => Promise.resolve(redisStore.get(key) ?? null)),
  set: jest.fn((key, value, ...args) => {
    redisStore.set(key, value);
    return Promise.resolve('OK');
  }),
  _clear: () => redisStore.clear(),
};

jest.unstable_mockModule('../../src/config/index.js', () => ({ config: configMock }));
jest.unstable_mockModule('../../src/config/redis.js', () => ({ default: redisMock }));

const telegram = await import('../../src/integrations/telegram.js');

function buildDemoInitData(user) {
  const authDate = Math.floor(Date.now() / 1000);
  const params = new URLSearchParams();
  params.set('auth_date', String(authDate));
  params.set('user', JSON.stringify(user));
  params.set('hash', 'demo');
  return params.toString();
}

describe('verifyInitData demo 模式', () => {
  beforeEach(() => {
    redisMock._clear();
    configMock.paymentMockMode = false;
  });

  it('hash=demo 一律按签名校验失败处理（不再因 paymentMockMode 绕过）', async () => {
    configMock.paymentMockMode = true;
    const user = { id: 999999999, first_name: 'Demo', last_name: 'User', username: 'demo_user', language_code: 'zh' };
    const initData = buildDemoInitData(user);

    await expect(telegram.verifyInitData(initData)).rejects.toThrow('initData 签名校验失败');
  });

  it('demo hash 在 paymentMockMode=false 时同样校验失败', async () => {
    const user = { id: 999999999, first_name: 'Demo' };
    const initData = buildDemoInitData(user);

    await expect(telegram.verifyInitData(initData)).rejects.toThrow('initData 签名校验失败');
  });
});
