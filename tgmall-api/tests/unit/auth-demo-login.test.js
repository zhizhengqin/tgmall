// 演示环境浏览器登录：独立 /auth/demo-login 服务端单元测试
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const configMock = {
  paymentMockMode: true,
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

function createDbUser(overrides = {}) {
  return {
    id: 'u-demo-1',
    telegramId: 999999999n,
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
  id: 999999999,
  first_name: 'Demo',
  last_name: 'User',
  username: 'demo_user',
  language_code: 'zh',
  photo_url: null,
};

describe('auth.service.js demoLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configMock.paymentMockMode = true;
  });

  it('TC-DEMO-AUTH-001: paymentMockMode=true 时返回 token 与用户信息', async () => {
    const dbUser = createDbUser();
    prismaMock.user.findUnique.mockResolvedValue(dbUser);

    const result = await authService.demoLogin(demoUserPayload);

    expect(result.token).toBe('mock-jwt-token');
    expect(result.user.telegramId).toBe(dbUser.telegramId);
    expect(result.user.firstName).toBe('Demo');
    expect(result.user.isNewUser).toBe(false);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { telegramId: demoUserPayload.id },
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

    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('TC-DEMO-AUTH-003: 新用户自动创建并标记 isNewUser', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const newUser = createDbUser({ id: 'u-new' });
    prismaMock.user.create.mockResolvedValue(newUser);

    const result = await authService.demoLogin(demoUserPayload);

    expect(result.user.isNewUser).toBe(true);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        telegramId: demoUserPayload.id,
        firstName: 'Demo',
        lastName: 'User',
        username: 'demo_user',
        language: 'zh',
        avatarUrl: null,
      }),
    });
  });

  it('TC-DEMO-AUTH-004: 老用户头像变化时更新 avatarUrl', async () => {
    const existingUser = createDbUser({ avatarUrl: 'https://cdn.test/old.jpg' });
    prismaMock.user.findUnique.mockResolvedValue(existingUser);
    const updatedUser = createDbUser({ avatarUrl: 'https://cdn.test/new.jpg' });
    prismaMock.user.update.mockResolvedValue(updatedUser);

    const payload = { ...demoUserPayload, photo_url: 'https://cdn.test/new.jpg' };
    const result = await authService.demoLogin(payload);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: existingUser.id },
      data: { avatarUrl: 'https://cdn.test/new.jpg' },
    });
    expect(result.user.avatarUrl).toBe('https://cdn.test/new.jpg');
  });

  it('TC-DEMO-AUTH-005: 缺少用户 id 时拒绝请求', async () => {
    await expect(authService.demoLogin({ first_name: 'NoId' })).rejects.toMatchObject({
      statusCode: 400,
      errorCode: 'INVALID_USER',
    });
  });

  it('TC-DEMO-AUTH-006: 未提供 language_code 时默认 km', async () => {
    const payload = { id: 999999999, first_name: 'Demo' };
    const dbUser = createDbUser({ language: 'km', firstName: 'Demo', lastName: null, username: null });
    prismaMock.user.findUnique.mockResolvedValue(dbUser);

    const result = await authService.demoLogin(payload);

    expect(result.user.language).toBe('km');
  });
});
