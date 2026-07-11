// 演示环境浏览器登录：独立 /auth/demo-login 服务端单元测试
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

const configMock = {
  paymentMockMode: true,
  nodeEnv: 'test',
};

const prismaMock = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const jwtMock = {
  signToken: jest.fn(() => 'mock-jwt-token'),
};

jest.unstable_mockModule('../../src/config/index.js', () => ({ config: configMock }));
jest.unstable_mockModule('../../src/config/database.js', () => ({ default: prismaMock }));
jest.unstable_mockModule('../../src/utils/jwt.js', () => jwtMock);

const authService = await import('../../src/services/auth.service.js');

// 演示用户 ID 必须落在真实 Telegram ID 范围（约 2^31）之外
const DEMO_TELEGRAM_ID_STRING = '999999999999999999';
const DEMO_TELEGRAM_ID_BIGINT = 999999999999999999n;

function createDbUser(overrides = {}) {
  return {
    id: 'u-demo-1',
    telegramId: DEMO_TELEGRAM_ID_BIGINT,
    firstName: 'Demo',
    lastName: 'User',
    username: 'demo_user',
    phone: null,
    language: 'zh',
    avatarUrl: null,
    createdAt: new Date('2026-07-11T00:00:00Z'),
    ...overrides,
  };
}

const demoUserPayload = {
  id: DEMO_TELEGRAM_ID_STRING,
  first_name: 'Demo',
  last_name: 'User',
  username: 'demo_user',
  language_code: 'zh',
  photo_url: null,
};

function p2002Error() {
  const err = new Error('Unique constraint failed');
  err.code = 'P2002';
  return err;
}

describe('auth.service.js demoLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configMock.paymentMockMode = true;
    configMock.nodeEnv = 'test';
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  });

  it('TC-DEMO-AUTH-001: paymentMockMode=true 时返回 token 与用户信息（老用户）', async () => {
    const dbUser = createDbUser();
    prismaMock.user.create.mockRejectedValue(p2002Error());
    prismaMock.user.findUnique.mockResolvedValue(dbUser);

    const result = await authService.demoLogin(demoUserPayload);

    expect(result.token).toBe('mock-jwt-token');
    expect(result.user.telegramId).toBe(dbUser.telegramId);
    expect(result.user.firstName).toBe('Demo');
    expect(result.user.isNewUser).toBe(false);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { telegramId: DEMO_TELEGRAM_ID_BIGINT },
    });
    expect(jwtMock.signToken).toHaveBeenCalledWith({
      userId: dbUser.id,
      telegramId: dbUser.telegramId,
      role: 'user',
    });
  });

  it('TC-DEMO-AUTH-002: paymentMockMode=false 时拒绝访问', async () => {
    configMock.paymentMockMode = false;

    await expect(authService.demoLogin(demoUserPayload)).rejects.toMatchObject({
      statusCode: 403,
      errorCode: 'DEMO_LOGIN_DISABLED',
    });

    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('TC-DEMO-AUTH-003: 新用户自动创建并标记 isNewUser', async () => {
    const newUser = createDbUser({ id: 'u-new' });
    prismaMock.user.create.mockResolvedValue(newUser);

    const result = await authService.demoLogin(demoUserPayload);

    expect(result.user.isNewUser).toBe(true);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        telegramId: DEMO_TELEGRAM_ID_BIGINT,
        firstName: 'Demo',
        lastName: 'User',
        username: 'demo_user',
        language: 'zh',
        avatarUrl: null,
      }),
    });
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('TC-DEMO-AUTH-004: 演示模式不更新已有用户头像', async () => {
    const existingUser = createDbUser({ avatarUrl: 'https://cdn.test/old.jpg' });
    prismaMock.user.create.mockRejectedValue(p2002Error());
    prismaMock.user.findUnique.mockResolvedValue(existingUser);

    const payload = { ...demoUserPayload, photo_url: 'https://cdn.test/new.jpg' };
    await authService.demoLogin(payload);

    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('TC-DEMO-AUTH-005: 缺少用户 id 时拒绝请求', async () => {
    await expect(authService.demoLogin({ first_name: 'NoId' })).rejects.toMatchObject({
      statusCode: 400,
      errorCode: 'INVALID_USER',
    });
  });

  it('TC-DEMO-AUTH-006: 未提供 language_code 时默认 km', async () => {
    const payload = { id: DEMO_TELEGRAM_ID_STRING, first_name: 'Demo' };
    const dbUser = createDbUser({ language: 'km', firstName: 'Demo', lastName: null, username: null });
    prismaMock.user.create.mockRejectedValue(p2002Error());
    prismaMock.user.findUnique.mockResolvedValue(dbUser);

    const result = await authService.demoLogin(payload);

    expect(result.user.language).toBe('km');
  });

  it('TC-DEMO-AUTH-007: 生产环境禁止演示登录', async () => {
    process.env.NODE_ENV = 'production';

    await expect(authService.demoLogin(demoUserPayload)).rejects.toMatchObject({
      statusCode: 403,
      errorCode: 'DEMO_LOGIN_FORBIDDEN',
    });

    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('TC-DEMO-AUTH-008: 真实 Telegram ID 范围内拒绝登录', async () => {
    await expect(authService.demoLogin({ ...demoUserPayload, id: 999999999 })).rejects.toMatchObject({
      statusCode: 400,
      errorCode: 'INVALID_DEMO_ID',
    });

    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('TC-DEMO-AUTH-009: 支持字符串和 BigInt 类型的演示用户 ID', async () => {
    const newUser = createDbUser();
    prismaMock.user.create.mockResolvedValue(newUser);

    const stringResult = await authService.demoLogin({ ...demoUserPayload, id: DEMO_TELEGRAM_ID_STRING });
    const bigintResult = await authService.demoLogin({ ...demoUserPayload, id: DEMO_TELEGRAM_ID_BIGINT });

    expect(stringResult.user.telegramId).toBe(DEMO_TELEGRAM_ID_BIGINT);
    expect(bigintResult.user.telegramId).toBe(DEMO_TELEGRAM_ID_BIGINT);
  });
});
