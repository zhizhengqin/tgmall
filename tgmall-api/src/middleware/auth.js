// JWT 鉴权中间件
import { verifyToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';

export function auth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('未登录', 401, 'UNAUTHORIZED'));
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
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
