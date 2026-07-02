// JWT 鉴权中间件
import { verifyToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';
import prisma from '../config/database.js';

export async function auth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('未登录', 401, 'UNAUTHORIZED'));
  }
  try {
    const payload = verifyToken(header.slice(7));

    // tokenVersion 校验：密码重置后旧 JWT 失效
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, tokenVersion: true, status: true },
    });
    if (!user) return next(new AppError('用户不存在', 401, 'UNAUTHORIZED'));
    if (user.status !== 'active') return next(new AppError('账户已被禁用', 403, 'FORBIDDEN'));
    if (payload.tokenVersion !== undefined && user.tokenVersion !== payload.tokenVersion) {
      return next(new AppError('密码已重置，请重新登录', 401, 'TOKEN_REVOKED'));
    }

    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    next(new AppError('Token 无效或已过期', 401, 'UNAUTHORIZED'));
  }
}

// 可选鉴权（未登录也可访问，登录了附加 req.user）
export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyToken(header.slice(7));
    } catch { /* 忽略无效 Token */ }
  }
  next();
}
