// 用户通知控制器
import * as notificationService from '../services/notification.service.js';
import { getPagination } from '../utils/pagination.js';

// GET /notifications — 通知列表
export async function list(req, res, next) {
  try {
    const { page, limit } = getPagination(req.query);
    const result = await notificationService.getUserNotifications(req.user.userId, { page, limit });
    res.json({
      success: true,
      data: result.items,
      meta: {
        total: result.total, page: result.page, limit: result.limit,
        totalPages: result.totalPages, hasNext: result.page < result.totalPages,
      },
    });
  } catch (err) { next(err); }
}
