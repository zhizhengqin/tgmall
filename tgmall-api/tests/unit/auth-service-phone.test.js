// 手机号认证服务单元测试
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Prisma
const prismaMock = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  passwordHistory: {
    findMany: jest.fn(() => []),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(async (ops) => {
    if (Array.isArray(ops)) return Promise.all(ops);
    return ops(prismaMock);
  }),
};

// Mock bcrypt
const bcryptMock = {
  hash: jest.fn(() => Promise.resolve('hashed_pw')),
  compare: jest.fn((pw, _h) => Promise.resolve(pw === 'correct')),
};

// Mock sms service
const smsMock = {
  sendSms: jest.fn(() => ({ success: true, cooldown: 60 })),
  verifySms: jest.fn((_phone, _scene, code) => {
    if (code !== '123456') throw Object.assign(new Error('验证码错误'), { code: 'SMS_INVALID' });
    return Promise.resolve();
  }),
};

// Mock redis (JWT sign 不需要但 token 需要)
const redisMock = { set: jest.fn(() => 'OK'), get: jest.fn(() => null), del: jest.fn() };

// Mock jwt
const jwtMock = {
  sign: jest.fn(() => 'fake-jwt-token'),
};

// Mock AppError
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

jest.unstable_mockModule('../../src/config/database.js', () => ({ default: prismaMock }));
jest.unstable_mockModule('../../src/config/redis.js', () => ({ default: redisMock }));
jest.unstable_mockModule('bcrypt', () => ({ default: bcryptMock, hash: bcryptMock.hash, compare: bcryptMock.compare }));
jest.unstable_mockModule('jsonwebtoken', () => ({ default: jwtMock }));
jest.unstable_mockModule('../../src/services/sms.service.js', () => ({
  sendSms: smsMock.sendSms,
  verifySms: smsMock.verifySms,
}));
jest.unstable_mockModule('../../src/utils/AppError.js', () => ({ AppError }));

const { config } = { config: { jwtExpiresIn: '24h', jwtSecret: 'test-secret' } };
jest.unstable_mockModule('../../src/config/index.js', () => ({ config }));

const { phoneLogin, setPassword, resetPassword, bindPhone } = await import('../../src/services/auth.service.js');

describe('手机号认证服务', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockImplementation(({ data }) => Promise.resolve({ id: 'u1', tokenVersion: 0, ...data }));
    prismaMock.user.update.mockImplementation(({ data }) => Promise.resolve({ id: 'u1', tokenVersion: 0, ...data }));
  });

  it('TC-AU-P01: 验证码登录 — 新用户自动创建', async () => {
    const result = await phoneLogin({ phone: '+85512345678', code: '123456' });
    expect(result.user.phone).toBe('+85512345678');
    expect(result.token).toBeTruthy();
    expect(prismaMock.user.create).toHaveBeenCalled();
  });

  it('TC-AU-P02: 已注册用户验证码登录成功', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', phone: '+85512345678', tokenVersion: 0 });
    const result = await phoneLogin({ phone: '+85512345678', code: '123456' });
    expect(result.user.id).toBe('u1');
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('TC-AU-P03: 密码登录 — 正确密码返回 token', async () => {
    bcryptMock.compare.mockResolvedValueOnce(true);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', phone: '+85512345678', passwordHash: 'hash', tokenVersion: 0 });
    const result = await phoneLogin({ phone: '+85512345678', password: 'correct' });
    expect(result.token).toBeTruthy();
  });

  it('TC-AU-P04: 密码登录 — 错误密码拒绝', async () => {
    bcryptMock.compare.mockResolvedValueOnce(false);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', phone: '+85512345678', passwordHash: 'hash', tokenVersion: 0 });
    await expect(phoneLogin({ phone: '+85512345678', password: 'wrong' })).rejects.toMatchObject({ code: 'INVALID_PASSWORD' });
  });

  it('TC-AU-P05: 密码登录 — 未注册拒绝', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(phoneLogin({ phone: '+85512345678', password: 'any' })).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });

  it('TC-AU-P06: setPassword — 成功设置密码', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1' });
    await expect(setPassword('u1', 'newpass123')).resolves.not.toThrow();
    expect(prismaMock.passwordHistory.create).toHaveBeenCalled();
  });

  it('TC-AU-P07: resetPassword — tokenVersion 递增', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', phone: '+85512345678' });
    await resetPassword('+85512345678', '123456', 'newpass123');
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tokenVersion: { increment: 1 } }) }),
    );
  });
});
