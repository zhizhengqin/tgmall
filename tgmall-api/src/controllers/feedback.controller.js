// Feedback 控制器
import * as feedbackService from '../services/feedback.service.js';

/** 用户提交意见反馈 */
export async function submit(req, res, next) {
  try {
    const { content, images } = req.body;
    const ticket = await feedbackService.submitFeedback(req.user.userId, content, images);
    res.status(201).json({ success: true, data: ticket });
  } catch (err) { next(err); }
}

/** 管理员查询工单列表 */
export async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const { status } = req.query;
    const result = await feedbackService.listFeedback(page, limit, status);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

/** 管理员标记工单为已处理 */
export async function resolve(req, res, next) {
  try {
    const { id } = req.params;
    const ticket = await feedbackService.resolveTicket(id);
    res.json({ success: true, data: ticket });
  } catch (err) { next(err); }
}
