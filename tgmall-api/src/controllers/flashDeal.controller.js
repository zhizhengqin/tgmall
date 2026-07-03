// 限时专区控制器
import * as flashDealService from '../services/flashDeal.service.js';
import { getPagination } from '../utils/pagination.js';

/** GET /admin/flash-deals — 列表 */
export async function listFlashDeals(req, res, next) {
  try {
    const { page, limit } = getPagination(req.query);
    const { status } = req.query;
    const result = await flashDealService.listFlashDeals({ status, page, limit });
    res.json({
      success: true,
      data: result.items,
      meta: { total: result.total, page: result.page, limit: result.limit, hasNext: result.hasNext },
    });
  } catch (err) { next(err); }
}

/** POST /admin/flash-deals — 创建 */
export async function createFlashDeal(req, res, next) {
  try {
    const deal = await flashDealService.createFlashDeal(req.validatedBody);
    res.status(201).json({ success: true, data: deal });
  } catch (err) { next(err); }
}

/** PUT /admin/flash-deals/:id — 更新 */
export async function updateFlashDeal(req, res, next) {
  try {
    const deal = await flashDealService.updateFlashDeal(req.params.id, req.validatedBody);
    res.json({ success: true, data: deal });
  } catch (err) { next(err); }
}

/** POST /admin/flash-deals/:id/toggle — 切换状态 */
export async function toggleFlashDeal(req, res, next) {
  try {
    const deal = await flashDealService.toggleFlashDeal(req.params.id);
    res.json({ success: true, data: deal });
  } catch (err) { next(err); }
}

/** GET /flash-deals — 公开：当前生效的限时专区 */
export async function listActiveFlashDeals(req, res, next) {
  try {
    const { city } = req.query;
    const deals = await flashDealService.listActiveFlashDeals({ cityCode: city || 'phnom_penh' });
    res.json({ success: true, data: deals });
  } catch (err) { next(err); }
}
