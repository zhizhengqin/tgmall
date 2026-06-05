// 商家角色鉴权中间件
// 校验 JWT role === 'merchant'，且商家 status === 'active'
import { AppError } from '../utils/AppError.js';
import prisma from '../config/database.js';

export async function merchantAuth(req, _res, next) {
  try {
    // 1. 校验 JWT 中 role 必须为 merchant
    if (!req.user || req.user.role !== 'merchant') {
      return next(new AppError('仅商家可访问此接口', 403, 'FORBIDDEN'));
    }

    // 2. 通过 merchantId 查数据库，确保商家仍然处于 active 状态
    //    防止已驳回/封禁的商家用未过期的 JWT 继续操作
    const merchantId = req.user.merchantId;
    if (!merchantId) {
      return next(new AppError('Token 中缺少商家信息', 403, 'FORBIDDEN'));
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, status: true },
    });

    if (!merchant) {
      return next(new AppError('商家不存在', 404, 'NOT_FOUND'));
    }

    if (merchant.status !== 'active') {
      return next(new AppError(
        merchant.status === 'pending'
          ? '商家审核中，请等待审核通过'
          : '商家已被禁用或驳回',
        403,
        'FORBIDDEN',
      ));
    }

    // 3. 将 merchant 信息附加到 request 上，后续 handler 可直接使用
    req.merchant = merchant;
    next();
  } catch (err) {
    next(err);
  }
}
