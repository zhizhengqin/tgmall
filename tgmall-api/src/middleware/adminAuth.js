// 管理员鉴权中间件
// 当前方案：通过环境变量 ADMIN_TELEGRAM_IDS 白名单控制
// 后续可演进为数据库 Admin 角色表
import { config } from '../config/index.js';
import { AppError } from '../utils/AppError.js';

export function adminAuth(req, _res, next) {
  // 1. 必须先通过通用 JWT 鉴权
  if (!req.user) {
    return next(new AppError('未登录', 401, 'UNAUTHORIZED'));
  }

  // 2. 读取管理员白名单（逗号分隔的 Telegram ID）
  const adminList = (config.adminTelegramIds || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (adminList.length === 0) {
    return next(new AppError('系统未配置管理员', 500, 'INTERNAL_ERROR'));
  }

  const userTelegramId = String(req.user.telegramId);
  if (!adminList.includes(userTelegramId)) {
    return next(new AppError('无管理员权限', 403, 'FORBIDDEN'));
  }

  next();
}
