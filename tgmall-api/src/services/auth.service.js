// 认证服务 — Telegram 登录 + 手机号登录 + JWT 签发
import bcrypt from 'bcrypt';
import prisma from '../config/database.js';
import { signToken } from '../utils/jwt.js';
import { verifyInitData, verifyTelegramLoginData } from '../integrations/telegram.js';
import { config } from '../config/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSms, verifySms } from './sms.service.js';

export async function telegramLogin(initData) {
  // 1. 校验 initData 签名
  let userData;
  try {
    userData = await verifyInitData(initData);
  } catch (err) {
    throw new AppError(err.message, 401, 'INVALID_INIT_DATA');
  }

  // 2. 查找或创建用户
  let user = await prisma.user.findUnique({
    where: { telegramId: userData.telegramId },
  });

  const isNewUser = !user;

  if (isNewUser) {
    // 根据 Telegram 语言推断偏好语言
    const langMap = { km: 'km', en: 'en', zh: 'zh' };
    const inferredLang = langMap[userData.languageCode?.slice(0, 2)] || 'km';

    user = await prisma.user.create({
      data: {
        telegramId: userData.telegramId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        language: inferredLang,
        avatarUrl: userData.photoUrl || null,
      },
    });
  } else {
    // 更新已有用户的头像（Telegram 头像 URL 可能会变化）
    if (userData.photoUrl && userData.photoUrl !== user.avatarUrl) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: userData.photoUrl },
      });
    }
  }

  // 3. 签发 JWT
  const token = signToken({
    userId: user.id,
    telegramId: user.telegramId,
    role: 'user',
  });

  return {
    token,
    user: {
      id: user.id,
      telegramId: user.telegramId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      phone: user.phone,
      language: user.language,
      avatarUrl: user.avatarUrl,
      isNewUser,
      createdAt: user.createdAt,
    },
  };
}

// Web 端 Telegram Login Widget 登录（管理员用）
export async function webLogin(tgLoginData) {
  // 1. 校验
  const userData = verifyTelegramLoginData(tgLoginData);

  // 2. 查找/创建用户
  let user = await prisma.user.findUnique({ where: { telegramId: userData.telegramId } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        telegramId: userData.telegramId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        language: 'km',
      },
    });
  }

  // 3. 检查管理员权限
  const adminList = (config.adminTelegramIds || '').split(',').map(id => id.trim()).filter(Boolean);
  if (!adminList.includes(String(userData.telegramId))) {
    throw new AppError('您没有管理员权限', 403, 'FORBIDDEN');
  }

  // 4. 签发 JWT
  const token = signToken({
    userId: user.id,
    telegramId: user.telegramId,
    role: 'admin',
  });

  return {
    token,
    user: {
      id: user.id,
      telegramId: user.telegramId,
      firstName: user.firstName,
      role: 'admin',
    },
  };
}

// ---- 手机号认证 ----

/**
 * 手机号登录（验证码或密码）
 */
export async function phoneLogin({ phone, code, password }) {
  // 1. 查询用户
  let user = await prisma.user.findUnique({ where: { phone } });

  if (code) {
    // 验证码登录
    await verifySms(phone, 'login', code);
  } else if (password) {
    // 密码登录
    if (!user) throw new AppError('该手机号未注册，请先使用验证码登录', 400, 'USER_NOT_FOUND');
    if (!user.passwordHash) throw new AppError('您还未设置密码，请使用验证码登录', 400, 'NO_PASSWORD');
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw new AppError('密码错误', 400, 'INVALID_PASSWORD');
  }

  // 2. 新用户自动创建
  if (!user) {
    user = await prisma.user.create({ data: { phone, language: 'km' } });
  }

  // 3. JWT 签发
  const token = signToken({
    userId: user.id,
    telegramId: user.telegramId,
    phone: user.phone,
    role: 'user',
    tokenVersion: user.tokenVersion,
  });

  return {
    token,
    user: {
      id: user.id,
      telegramId: user.telegramId,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      language: user.language,
      createdAt: user.createdAt,
    },
  };
}

/**
 * 已登录用户设置密码
 */
export async function setPassword(userId, password) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('用户不存在', 404, 'NOT_FOUND');

  const hash = await bcrypt.hash(password, 10);

  // 密码历史检查（不与最近 3 条重复）
  const recentHistory = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });
  for (const record of recentHistory) {
    const duplicate = await bcrypt.compare(password, record.hash);
    if (duplicate) throw new AppError('新密码不能与最近使用的密码相同', 400, 'PASSWORD_REUSED');
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } }),
    prisma.passwordHistory.create({ data: { userId, hash } }),
  ]);

  // 清理旧密码历史（仅保留最近 3 条）
  const oldRecords = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    skip: 3,
    select: { id: true },
  });
  if (oldRecords.length > 0) {
    await prisma.passwordHistory.deleteMany({
      where: { id: { in: oldRecords.map(r => r.id) } },
    });
  }
}

/**
 * 忘记密码重置
 */
export async function resetPassword(phone, code, newPassword) {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw new AppError('该手机号未注册', 400, 'USER_NOT_FOUND');

  // 校验验证码
  await verifySms(phone, 'reset_password', code);

  const hash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash, tokenVersion: { increment: 1 } },
    }),
    prisma.passwordHistory.create({ data: { userId: user.id, hash } }),
  ]);
}

/**
 * 绑定手机号（已登录用户）
 */
export async function bindPhone(userId, phone, code) {
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) throw new AppError('该手机号已被绑定', 409, 'PHONE_IN_USE');

  await verifySms(phone, 'bind_phone', code);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { phone },
  });

  return {
    id: user.id,
    phone: user.phone,
    telegramId: user.telegramId,
  };
}
