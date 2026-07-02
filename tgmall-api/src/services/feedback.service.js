// Feedback 服务 — 提交反馈 / 工单查询 / 标记已处理
import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';

/**
 * 用户提交意见反馈
 * @param {string} userId
 * @param {string} content — 反馈内容 ≤500 字
 * @param {string[]} images — 图片 URL 数组 ≤3 张
 * @returns {object} 创建的工单
 */
export async function submitFeedback(userId, content, images = []) {
  if (!content || content.trim().length === 0) {
    throw new AppError('反馈内容不能为空', 400, 'VALIDATION_ERROR');
  }
  if (content.length > 500) {
    throw new AppError('反馈内容不能超过 500 字', 400, 'VALIDATION_ERROR');
  }
  if (images && images.length > 3) {
    throw new AppError('最多上传 3 张图片', 400, 'VALIDATION_ERROR');
  }
  return prisma.feedbackTicket.create({
    data: { userId, content: content.trim(), images: images || [], status: 'pending' },
  });
}

/**
 * 管理员分页查询工单
 * @param {number} page
 * @param {number} limit
 * @param {string} [status] — pending | resolved
 * @returns {{ items: Array, total: number }}
 */
export async function listFeedback(page = 1, limit = 20, status) {
  const skip = (page - 1) * limit;
  const where = {};
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.feedbackTicket.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, username: true, phone: true } },
      },
    }),
    prisma.feedbackTicket.count({ where }),
  ]);
  return { items, total };
}

/**
 * 管理员标记工单为已处理
 * @param {string} id — 工单 ID
 * @returns {object} 更新后的工单
 */
export async function resolveTicket(id) {
  const ticket = await prisma.feedbackTicket.findUnique({ where: { id } });
  if (!ticket) throw new AppError('工单不存在', 404, 'NOT_FOUND');
  return prisma.feedbackTicket.update({
    where: { id },
    data: { status: 'resolved', resolvedAt: new Date() },
  });
}
