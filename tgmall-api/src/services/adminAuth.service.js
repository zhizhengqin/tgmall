// 管理员认证服务 — 用户名密码登录 + JWT
import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { signToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';

// 管理员登录
export async function adminLogin(username, password) {
  const user = await prisma.adminUser.findUnique({ where: { username } });
  if (!user) {
    throw new AppError('用户名或密码错误', 401, 'INVALID_CREDENTIALS');
  }
  if (user.status !== 'active') {
    throw new AppError('账号已被禁用', 403, 'FORBIDDEN');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError('用户名或密码错误', 401, 'INVALID_CREDENTIALS');
  }

  const token = signToken({
    userId: user.id,
    username: user.username,
    role: user.role,
    tokenVersion: user.tokenVersion,
    type: 'admin',
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    },
  };
}

// 种子默认管理员
export async function seedDefaultAdmin(passwordHash) {
  const existing = await prisma.adminUser.findFirst();
  if (existing) return null;

  return prisma.adminUser.create({
    data: {
      username: 'admin',
      passwordHash,
      displayName: '管理员',
      role: 'admin',
    },
  });
}
