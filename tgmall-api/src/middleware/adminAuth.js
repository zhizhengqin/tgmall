// 管理员鉴权中间件 — V2: 基于 JWT role 字段（非 Telegram 白名单）
import { AppError } from '../utils/AppError.js';

export function adminAuth(req, _res, next) {
  if (!req.user) {
    return next(new AppError('未登录', 401, 'UNAUTHORIZED'));
  }

  // admin 类型 JWT 或 role 为 admin/operator/cs/warehouse 均可
  const role = req.user.role;
  if (req.user.type === 'admin' || role === 'admin' || role === 'operator' || role === 'cs' || role === 'warehouse') {
    return next();
  }

  return next(new AppError('无管理员权限', 403, 'FORBIDDEN'));
}
