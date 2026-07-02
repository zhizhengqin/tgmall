// 库存管理控制器
import * as inventory from '../services/inventory.service.js';
import { getPagination } from '../utils/pagination.js';

function ok(data, meta) {
  return meta ? { success: true, data, meta } : { success: true, data };
}

export async function listInventory(req, res, next) {
  try {
    const { page, limit } = getPagination(req.query);
    const { q, sortBy, lowStockOnly } = req.query;
    const result = await inventory.listInventory({ page, limit, q, sortBy, lowStockOnly: lowStockOnly === 'true' });
    res.json(ok(result.items, { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages, hasNext: result.hasNext }));
  } catch (err) { next(err); }
}

export async function adjustStock(req, res, next) {
  try {
    const { qty, note } = req.validatedBody;
    const operatorId = req.user?.id;
    const data = await inventory.adjustStock(req.params.id, qty, operatorId, note);
    res.json(ok(data));
  } catch (err) { next(err); }
}

export async function stockLogs(req, res, next) {
  try {
    const { page, limit } = getPagination(req.query);
    const result = await inventory.getStockLogs(req.params.id, { page, limit });
    res.json(ok(result.items, { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages }));
  } catch (err) { next(err); }
}

export async function checkInventory(req, res, next) {
  try {
    const { productId, actualQty, note } = req.validatedBody;
    const checkedBy = req.user?.id;
    const data = await inventory.checkInventory({ productId, actualQty, checkedBy, note });
    res.status(201).json(ok(data));
  } catch (err) { next(err); }
}

export async function setAlertThreshold(req, res, next) {
  try {
    const { threshold } = req.validatedBody;
    const data = await inventory.setAlertThreshold(req.params.id, threshold);
    res.json(ok(data));
  } catch (err) { next(err); }
}
