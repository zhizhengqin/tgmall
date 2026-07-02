// 管理员商品/订单管理控制器（原 merchant controller，V2 仅保留 admin 操作）
import * as merchantService from '../services/merchant.service.js';
import { getPagination } from '../utils/pagination.js';

// GET /admin/products — 商品列表
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

// GET /merchants/products/:id — 单个商品详情
export async function getProduct(req, res, next) {
  try {
    const product = await merchantService.getProductById(req.merchant.id, req.params.id);
    res.json({ success: true, data: product });
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

// GET /merchants/orders/:id — 商家订单详情
export async function getOrder(req, res, next) {
  try {
    const order = await merchantService.getOrderDetail(req.merchant.id, req.params.id);
    res.json({ success: true, data: order });
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

