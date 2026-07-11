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

  // 2. 查找或创建用户并签发 JWT
  const { user, isNewUser } = await upsertUserFromTelegramData(userData);
  const token = signToken({
    userId: user.id,
    telegramId: user.telegramId,
    role: 'user',
  });

  return buildAuthResponse(user, isNewUser, token);
}

/**
 * 演示环境浏览器登录（仅当 PAYMENT_MOCK_MODE 启用时可用）
 * 前端 Telegram Mock 直接传入用户信息，后端不再依赖 initData 签名校验
 */
export async function demoLogin(user) {
  if (process.env.NODE_ENV === 'production' || config.nodeEnv === 'production') {
    throw new AppError('演示登录禁止在生产环境使用', 403, 'DEMO_LOGIN_FORBIDDEN');
  }
  if (!config.paymentMockMode) {
    throw new AppError('演示登录未启用', 403, 'DEMO_LOGIN_DISABLED');
  }
  if (!user?.id) {
    throw new AppError('缺少用户信息', 400, 'INVALID_USER');
  }

  // 演示用户 ID 必须落在真实 Telegram ID 范围（约 2^31）之外，防止与真实账户碰撞
  const telegramId = BigInt(user.id);
  if (telegramId <= 2147483647n) {
    throw new AppError('演示用户 ID 必须超出真实 Telegram ID 范围', 400, 'INVALID_DEMO_ID');
  }

  const userData = {
    telegramId,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    languageCode: user.language_code || 'km',
    photoUrl: user.photo_url || null,
  };

  const { user: dbUser, isNewUser } = await upsertUserFromTelegramData(userData, { updateAvatar: false });
  const token = signToken({
    userId: dbUser.id,
    telegramId: dbUser.telegramId,
    role: 'user',
  });

  return buildAuthResponse(dbUser, isNewUser, token);
}

// ---- 公共 helper：根据 Telegram 数据查找/创建用户 ----

async function upsertUserFromTelegramData(userData, { updateAvatar = true } = {}) {
  // 根据 Telegram 语言推断偏好语言
  const langMap = { km: 'km', en: 'en', zh: 'zh' };
  const inferredLang = langMap[userData.languageCode?.slice(0, 2)] || 'km';

  const createData = {
    telegramId: userData.telegramId,
    firstName: userData.firstName,
    lastName: userData.lastName,
    username: userData.username,
    language: inferredLang,
    avatarUrl: userData.photoUrl || null,
  };

  try {
    const user = await prisma.user.create({ data: createData });
    return { user, isNewUser: true };
  } catch (err) {
    // P2002 = 唯一键冲突，说明并发登录时已有其他请求创建用户
    if (err.code !== 'P2002') throw err;

    let user = await prisma.user.findUnique({
      where: { telegramId: userData.telegramId },
    });
    if (!user) {
      // 极端并发下先 create 后未立即读到，重试一次
      user = await prisma.user.findUnique({
        where: { telegramId: userData.telegramId },
      });
    }

    if (updateAvatar && userData.photoUrl && userData.photoUrl !== user.avatarUrl) {
      // 更新已有用户的头像（Telegram 头像 URL 可能会变化）
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: userData.photoUrl },
      });
    }

    return { user, isNewUser: false };
  }
}

function buildAuthResponse(user, isNewUser, token) {
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
