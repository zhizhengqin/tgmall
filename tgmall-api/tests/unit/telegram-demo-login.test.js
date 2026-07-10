// 演示环境浏览器登录：verifyInitData demo 模式测试
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

  it('paymentMockMode=true 时 demo hash 跳过签名校验并返回用户', async () => {
    configMock.paymentMockMode = true;
    const user = { id: 999999999, first_name: 'Demo', last_name: 'User', username: 'demo_user', language_code: 'zh' };
    const initData = buildDemoInitData(user);

    const result = await telegram.verifyInitData(initData);

    expect(result).toMatchObject({
      telegramId: 999999999,
      firstName: 'Demo',
      lastName: 'User',
      username: 'demo_user',
      languageCode: 'zh',
      photoUrl: null,
    });
  });

  it('demo hash 在 paymentMockMode=false 时仍校验失败', async () => {
    const user = { id: 999999999, first_name: 'Demo' };
    const initData = buildDemoInitData(user);

    await expect(telegram.verifyInitData(initData)).rejects.toThrow('initData 签名校验失败');
  });

  it('demo 模式不过期、不写入重放 key', async () => {
    configMock.paymentMockMode = true;
    const user = { id: 999999999 };
    const initData = buildDemoInitData(user);

    await telegram.verifyInitData(initData);
    const result2 = await telegram.verifyInitData(initData);

    expect(result2.telegramId).toBe(999999999);
    expect(redisStore.size).toBe(0);
  });
});
