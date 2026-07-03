// 管理员鉴权中间件 — V2: 基于 JWT role 字段（非 Telegram 白名单）
import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';

export async function adminAuth(req, _res, next) {
  try {
    if (!req.user) {
      return next(new AppError('未登录', 401, 'UNAUTHORIZED'));
    }

    // admin 类型 JWT 或 role 为 admin/operator/cs/warehouse 均可
    const role = req.user.role;
    if (req.user.type !== 'admin' && role !== 'admin' && role !== 'operator' && role !== 'cs' && role !== 'warehouse') {
      return next(new AppError('无管理员权限', 403, 'FORBIDDEN'));
    }

    // 校验管理员状态与 tokenVersion，确保禁用/改密后旧 Token 失效
    const admin = await prisma.adminUser.findUnique({
      where: { id: req.user.userId },
      select: { status: true, tokenVersion: true },
    });
    if (!admin || admin.status !== 'active') {
      return next(new AppError('账号已被禁用或不存在', 403, 'FORBIDDEN'));
    }
    if (req.user.tokenVersion !== undefined && admin.tokenVersion !== req.user.tokenVersion) {
      return next(new AppError('密码已重置或会话已失效，请重新登录', 401, 'TOKEN_REVOKED'));
    }

    next();
  } catch (err) {
    next(err);
  }
}
