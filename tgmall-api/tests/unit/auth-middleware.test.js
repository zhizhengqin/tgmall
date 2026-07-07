// JWT 鉴权中间件单元测试
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

const prismaMock = {
  user: { findUnique: jest.fn() },
  adminUser: { findUnique: jest.fn() },
};

const verifyTokenMock = jest.fn();

jest.unstable_mockModule('../../src/config/database.js', () => ({ default: prismaMock }));
jest.unstable_mockModule('../../src/utils/AppError.js', () => ({ AppError }));
jest.unstable_mockModule('../../src/utils/jwt.js', () => ({ verifyToken: verifyTokenMock }));

const { auth } = await import('../../src/middleware/auth.js');

describe('auth 中间件', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('无 Authorization 头时返回 401', async () => {
    const req = { headers: {} };
    const next = jest.fn();
    await auth(req, {}, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401, code: 'UNAUTHORIZED' }));
  });

  it('普通用户 Token 查询 user 表', async () => {
    verifyTokenMock.mockReturnValue({ userId: 'u1', role: 'user', tokenVersion: 0 });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', status: 'active', tokenVersion: 0 });
    const req = { headers: { authorization: 'Bearer valid-token' } };
    const next = jest.fn();
    await auth(req, {}, next);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' }, select: { id: true, tokenVersion: true, status: true } });
    expect(prismaMock.adminUser.findUnique).not.toHaveBeenCalled();
    expect(req.user).toEqual({ userId: 'u1', role: 'user', tokenVersion: 0 });
    expect(next).toHaveBeenCalledWith();
  });

  it('管理员 Token（type=admin）查询 adminUser 表', async () => {
    verifyTokenMock.mockReturnValue({ userId: 'a1', role: 'admin', type: 'admin', tokenVersion: 0 });
    prismaMock.adminUser.findUnique.mockResolvedValue({ id: 'a1', status: 'active', tokenVersion: 0 });
    const req = { headers: { authorization: 'Bearer admin-token' } };
    const next = jest.fn();
    await auth(req, {}, next);
    expect(prismaMock.adminUser.findUnique).toHaveBeenCalledWith({ where: { id: 'a1' }, select: { id: true, tokenVersion: true, status: true } });
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(req.user).toEqual({ userId: 'a1', role: 'admin', type: 'admin', tokenVersion: 0 });
    expect(next).toHaveBeenCalledWith();
  });

  it('管理员 Token 在 adminUser 表不存在时返回 401', async () => {
    verifyTokenMock.mockReturnValue({ userId: 'a1', role: 'admin', type: 'admin', tokenVersion: 0 });
    prismaMock.adminUser.findUnique.mockResolvedValue(null);
    const req = { headers: { authorization: 'Bearer admin-token' } };
    const next = jest.fn();
    await auth(req, {}, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401, code: 'UNAUTHORIZED', message: '用户不存在' }));
  });

  it('tokenVersion 不匹配时返回 TOKEN_REVOKED', async () => {
    verifyTokenMock.mockReturnValue({ userId: 'u1', role: 'user', tokenVersion: 0 });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', status: 'active', tokenVersion: 1 });
    const req = { headers: { authorization: 'Bearer valid-token' } };
    const next = jest.fn();
    await auth(req, {}, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401, code: 'TOKEN_REVOKED' }));
  });
});
