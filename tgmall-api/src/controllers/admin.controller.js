// 管理员控制器 — 平台看板、商家管理、用户管理、优惠券管理
import * as adminService from '../services/admin.service.js';
import * as couponService from '../services/coupon.service.js';
import { getPagination } from '../utils/pagination.js';

export async function dashboard(req, res, next) {
  try { const data = await adminService.getPlatformDashboard(); res.json({ success: true, data }); } catch (err) { next(err); }
}
export async function listMerchants(req, res, next) {
  try { const { page, limit } = getPagination(req.query); const { status } = req.query; const result = await adminService.getMerchants({ status, page, limit }); res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, limit: result.limit } }); } catch (err) { next(err); }
}
export async function listUsers(req, res, next) {
  try { const { page, limit } = getPagination(req.query); const { q } = req.query; const result = await adminService.getUsers({ q, page, limit }); res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, limit: result.limit } }); } catch (err) { next(err); }
}

export async function getUserDetail(req, res, next) {
  try { const data = await adminService.getUserDetail(req.params.id); res.json({ success: true, data }); } catch (err) { next(err); }
}

export async function toggleUserStatus(req, res, next) {
  try { const data = await adminService.toggleUserStatus(req.params.id); res.json({ success: true, data }); } catch (err) { next(err); }
}

// ---- 优惠券管理 ----

/** GET /admin/coupons — 优惠券列表 */
export async function listCoupons(req, res, next) {
  try {
    const { page, limit } = getPagination(req.query);
    const { status } = req.query;
    const result = await couponService.adminListCoupons({ status, page, limit });
    res.json({ success: true, data: result.items, meta: { total: result.total, page, limit } });
  } catch (err) { next(err); }
}

/** POST /admin/coupons — 创建优惠券 */
export async function createCoupon(req, res, next) {
  try {
    const coupon = await couponService.adminCreateCoupon(req.body);
    res.status(201).json({ success: true, data: coupon });
  } catch (err) { next(err); }
}

/** PUT /admin/coupons/:id — 更新优惠券 */
export async function updateCoupon(req, res, next) {
  try {
    const coupon = await couponService.adminUpdateCoupon(req.params.id, req.body);
    res.json({ success: true, data: coupon });
  } catch (err) { next(err); }
}

/** PATCH /admin/coupons/:id/status — 启用/停用优惠券 */
export async function toggleCouponStatus(req, res, next) {
  try {
    const coupon = await couponService.adminToggleCouponStatus(req.params.id, req.body.status);
    res.json({ success: true, data: coupon });
  } catch (err) { next(err); }
}
