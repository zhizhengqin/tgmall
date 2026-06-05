// 管理员控制器 — 平台看板、商家管理、用户管理
import * as adminService from '../services/admin.service.js';
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
