// 认证服务 — Telegram 登录 + JWT 签发
import prisma from '../config/database.js';
import { signToken } from '../utils/jwt.js';
import { verifyInitData } from '../integrations/telegram.js';
import { AppError } from '../utils/AppError.js';

export async function telegramLogin(initData) {
  // 1. 校验 initData 签名
  let userData;
  try {
    userData = verifyInitData(initData);
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
      },
    });
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
