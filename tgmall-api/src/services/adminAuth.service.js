// 管理员认证服务 — 用户名密码登录 + OTP 登录 + JWT
import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { signToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';
import { sendSms, verifySms } from './sms.service.js';

function buildAdminTokenPayload(user) {
  return {
    userId: user.id,
    username: user.username,
    role: user.role,
    tokenVersion: user.tokenVersion,
    type: 'admin',
  };
}

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

  const token = signToken(buildAdminTokenPayload(user));

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

// 发送管理员 OTP
export async function sendAdminOtp(phone) {
  const user = await prisma.adminUser.findUnique({ where: { phone } });
  if (!user) throw new AppError('手机号未绑定管理员账号', 404, 'PHONE_NOT_FOUND');
  if (user.status !== 'active') throw new AppError('账号已被禁用', 403, 'FORBIDDEN');
  return sendSms(phone, 'admin_login');
}

// 管理员 OTP 登录
export async function adminOtpLogin(phone, code) {
  await verifySms(phone, 'admin_login', code);
  const user = await prisma.adminUser.findUnique({ where: { phone } });
  if (!user) throw new AppError('手机号未绑定管理员账号', 404, 'PHONE_NOT_FOUND');
  if (user.status !== 'active') throw new AppError('账号已被禁用', 403, 'FORBIDDEN');

  const token = signToken(buildAdminTokenPayload(user));
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
