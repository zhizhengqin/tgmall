// 商家控制器
import * as merchantService from '../services/merchant.service.js';
import { getPagination } from '../utils/pagination.js';

// POST /merchants/register — 商家入驻申请
export async function register(req, res, next) {
  try {
    const merchant = await merchantService.registerMerchant(req.user.userId, req.validatedBody);
    res.status(201).json({ success: true, data: merchant });
  } catch (err) { next(err); }
}

// POST /merchants/login — 商家登录（返回 merchant 角色 JWT）
export async function login(req, res, next) {
  try {
    const { init_data } = req.validatedBody;
    const result = await merchantService.merchantLogin(init_data);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// GET /merchants/dashboard — 商家数据看板
export async function dashboard(req, res, next) {
  try {
    const data = await merchantService.getDashboard(req.merchant.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// GET /merchants/products — 商家商品列表
export async function listProducts(req, res, next) {
  try {
    const { page, limit } = getPagination(req.query);
    const { q, category, status } = req.query;
    const result = await merchantService.getProducts(
      req.merchant.id, { q, category, status, page, limit },
    );
    res.json({
      success: true,
      data: result.items,
      meta: {
        total: result.total, page: result.page, limit: result.limit,
        totalPages: result.totalPages, hasNext: result.hasNext,
      },
    });
  } catch (err) { next(err); }
}

// POST /merchants/products — 上架商品
export async function createProduct(req, res, next) {
  try {
    const product = await merchantService.createProduct(req.merchant.id, req.validatedBody);
    res.status(201).json({ success: true, data: product });
  } catch (err) { next(err); }
}

// PUT /merchants/products/:id — 编辑商品
export async function updateProduct(req, res, next) {
  try {
    const product = await merchantService.updateProduct(
      req.merchant.id, req.params.id, req.validatedBody,
    );
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
}

// POST /merchants/products/:id/toggle — 上/下架切换
export async function toggleProduct(req, res, next) {
  try {
    const product = await merchantService.toggleProduct(req.merchant.id, req.params.id);
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
}

// GET /merchants/orders — 商家订单列表
export async function listOrders(req, res, next) {
  try {
    const { page, limit } = getPagination(req.query);
    const { status, start_date, end_date } = req.query;
    const result = await merchantService.getOrders(
      req.merchant.id, { status, startDate: start_date, endDate: end_date, page, limit },
    );
    res.json({
      success: true,
      data: result.items,
      meta: {
        total: result.total, page: result.page, limit: result.limit,
        totalPages: result.totalPages, hasNext: result.hasNext,
      },
    });
  } catch (err) { next(err); }
}

// POST /merchants/orders/:id/ship — 确认发货
export async function shipOrder(req, res, next) {
  try {
    const order = await merchantService.shipOrder(
      req.merchant.id, req.params.id, req.validatedBody,
    );
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
}

// ============ 管理员接口 ============

// POST /admin/merchants/:id/approve — 审核通过
export async function approve(req, res, next) {
  try {
    const merchant = await merchantService.approveMerchant(req.params.id);
    res.json({ success: true, data: merchant });
  } catch (err) { next(err); }
}

// POST /admin/merchants/:id/reject — 审核驳回
export async function reject(req, res, next) {
  try {
    const merchant = await merchantService.rejectMerchant(
      req.params.id, req.validatedBody.reason,
    );
    res.json({ success: true, data: merchant });
  } catch (err) { next(err); }
}
