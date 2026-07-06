// 默认管理员种子脚本单元测试
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const bcryptMock = {
  hash: jest.fn((pw) => Promise.resolve(`hashed_${pw}`)),
  compare: jest.fn(),
};

const adminUserMock = {
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

jest.unstable_mockModule('bcryptjs', () => ({
  default: bcryptMock,
  hash: bcryptMock.hash,
  compare: bcryptMock.compare,
}));

jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    adminUser: adminUserMock,
    $disconnect: jest.fn(() => Promise.resolve()),
  })),
}));

describe('seed-admin 脚本', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.ADMIN_PASSWORD;
  });

  it('明文 ADMIN_PASSWORD 会被自动 bcrypt 哈希后存储', async () => {
    process.env.ADMIN_PASSWORD = 'admin123';
    adminUserMock.findFirst.mockResolvedValue(null);

    await import('../../src/seed-admin.js');
    // 等待微任务队列执行
    await new Promise((resolve) => setImmediate(resolve));

    expect(bcryptMock.hash).toHaveBeenCalledWith('admin123', 10);
    expect(adminUserMock.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        username: 'admin',
        passwordHash: 'hashed_admin123',
        displayName: '管理员',
        role: 'admin',
      }),
    });
  });

  it('已是 bcrypt hash 的 ADMIN_PASSWORD 不会被重复哈希', async () => {
    const existingHash = '$2a$10$abcdefghijklmnopqrstuvwxycdefghijklmnopqrstu';
    process.env.ADMIN_PASSWORD = existingHash;
    adminUserMock.findFirst.mockResolvedValue({ id: '1' });

    await import('../../src/seed-admin.js');
    await new Promise((resolve) => setImmediate(resolve));

    expect(bcryptMock.hash).not.toHaveBeenCalled();
    expect(adminUserMock.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { passwordHash: existingHash },
    });
  });
});
