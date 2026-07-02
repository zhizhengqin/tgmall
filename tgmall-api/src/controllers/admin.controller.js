// 管理员控制器 — 平台看板、商家管理、用户管理、优惠券管理
import * as adminService from '../services/admin.service.js';
import { getPagination } from '../utils/pagination.js';
import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';

export async function dashboard(req, res, next) {
  try { const data = await adminService.getPlatformDashboard(); res.json({ success: true, data }); } catch (err) { next(err); }
}
export async function listMerchants(req, res, next) {
  try { const { page, limit } = getPagination(req.query); const { status } = req.query; const result = await adminService.getMerchants({ status, page, limit }); res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, limit: result.limit } }); } catch (err) { next(err); }
}
export async function listUsers(req, res, next) {
  try { const { page, limit } = getPagination(req.query); const { q } = req.query; const result = await adminService.getUsers({ q, page, limit }); res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, limit: result.limit } }); } catch (err) { next(err); }
}

// ---- 优惠券管理 ----

/** GET /admin/coupons — 优惠券列表 */
export async function listCoupons(req, res, next) {
  try {
    const { page, limit } = getPagination(req.query);
    const { status } = req.query;
    const skip = (page - 1) * limit;
    const where = {};
    if (status) where.status = status;
    const [items, total] = await Promise.all([
      prisma.coupon.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.coupon.count({ where }),
    ]);
    res.json({ success: true, data: items, meta: { total, page, limit } });
  } catch (err) { next(err); }
}

/** POST /admin/coupons — 创建优惠券 */
export async function createCoupon(req, res, next) {
  try {
    const { titleKm, titleEn, titleZh, type, value, minSpend, totalQty, startDate, endDate } = req.body;
    if (!titleKm || !type || value == null || !totalQty || !startDate || !endDate) {
      throw new AppError('缺少必填字段 (titleKm, type, value, totalQty, startDate, endDate)', 400, 'VALIDATION_ERROR');
    }
    if (!['fixed', 'percent'].includes(type)) {
      throw new AppError('type 必须为 fixed 或 percent', 400, 'VALIDATION_ERROR');
    }
    const coupon = await prisma.coupon.create({
      data: {
        titleKm, titleEn, titleZh,
        type,
        value: type === 'percent' ? Math.min(100, Math.max(0, value)) : value,
        minSpend: minSpend || 0,
        totalQty,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });
    res.status(201).json({ success: true, data: coupon });
  } catch (err) { next(err); }
}

/** PUT /admin/coupons/:id — 更新优惠券 */
export async function updateCoupon(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new AppError('优惠券不存在', 404, 'NOT_FOUND');

    const { titleKm, titleEn, titleZh, type, value, minSpend, totalQty, startDate, endDate } = req.body;
    const data = {};
    if (titleKm !== undefined) data.titleKm = titleKm;
    if (titleEn !== undefined) data.titleEn = titleEn;
    if (titleZh !== undefined) data.titleZh = titleZh;
    if (type !== undefined) data.type = type;
    if (value !== undefined) data.value = type === 'percent' ? Math.min(100, Math.max(0, value)) : value;
    if (minSpend !== undefined) data.minSpend = minSpend;
    if (totalQty !== undefined) data.totalQty = totalQty;
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = new Date(endDate);

    const coupon = await prisma.coupon.update({ where: { id }, data });
    res.json({ success: true, data: coupon });
  } catch (err) { next(err); }
}

/** PATCH /admin/coupons/:id/status — 启用/停用优惠券 */
export async function toggleCouponStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      throw new AppError('status 必须为 active 或 inactive', 400, 'VALIDATION_ERROR');
    }
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new AppError('优惠券不存在', 404, 'NOT_FOUND');

    const coupon = await prisma.coupon.update({ where: { id }, data: { status } });
    res.json({ success: true, data: coupon });
  } catch (err) { next(err); }
}
