// 管理员商品/订单管理控制器（V2 公司自营模式）
import * as merchantService from '../services/merchant.service.js';
import { getPagination } from '../utils/pagination.js';

// GET /admin/products — 商品列表
export async function listProducts(req, res, next) {
  try {
    const { page, limit } = getPagination(req.query);
    const { q, category, status } = req.query;
    const result = await merchantService.getProducts({ q, category, status, page, limit });
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

// GET /admin/products/:id — 单个商品详情
export async function getProduct(req, res, next) {
  try {
    const product = await merchantService.getProductById(req.params.id);
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
}

// POST /admin/products — 上架商品
export async function createProduct(req, res, next) {
  try {
    const product = await merchantService.createProduct(req.validatedBody);
    res.status(201).json({ success: true, data: product });
  } catch (err) { next(err); }
}

// PUT /admin/products/:id — 编辑商品
export async function updateProduct(req, res, next) {
  try {
    const product = await merchantService.updateProduct(req.params.id, req.validatedBody);
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
}

// POST /admin/products/:id/toggle — 上/下架切换
export async function toggleProduct(req, res, next) {
  try {
    const product = await merchantService.toggleProduct(req.params.id);
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
}

// GET /admin/orders — 订单列表
export async function listOrders(req, res, next) {
  try {
    const { page, limit } = getPagination(req.query);
    const { status, start_date, end_date } = req.query;
    const result = await merchantService.getOrders({ status, startDate: start_date, endDate: end_date, page, limit });
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

// GET /admin/orders/:id — 订单详情
export async function getOrder(req, res, next) {
  try {
    const order = await merchantService.getOrderDetail(req.params.id);
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
}

// POST /admin/orders/:id/ship — 确认发货
export async function shipOrder(req, res, next) {
  try {
    const order = await merchantService.shipOrder(req.params.id, req.validatedBody);
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
}
