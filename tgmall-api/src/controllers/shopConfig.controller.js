// 运营配置控制器
import * as shopConfig from '../services/shopConfig.service.js';
import { AppError } from '../utils/AppError.js';
import { getPagination } from '../utils/pagination.js';

function ok(data, meta) {
  return meta ? { success: true, data, meta } : { success: true, data };
}

// ---- Admin: Categories ----
export async function listCategories(req, res, next) {
  try {
    const { page, limit } = getPagination(req.query);
    const { status } = req.query;
    const result = await shopConfig.listCategories({ page, limit, status });
    res.json(ok(result.items, { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages, hasNext: result.hasNext }));
  } catch (err) { next(err); }
}

export async function createCategory(req, res, next) {
  try {
    const data = await shopConfig.createCategory(req.validatedBody);
    res.status(201).json(ok(data));
  } catch (err) { next(err); }
}

export async function updateCategory(req, res, next) {
  try {
    const data = await shopConfig.updateCategory(req.params.code, req.validatedBody);
    res.json(ok(data));
  } catch (err) { next(err); }
}

export async function toggleCategory(req, res, next) {
  try {
    const data = await shopConfig.toggleCategory(req.params.code);
    res.json(ok(data));
  } catch (err) { next(err); }
}

// ---- Admin: Banners ----
export async function listBanners(req, res, next) {
  try {
    const { page, limit } = getPagination(req.query);
    const { status } = req.query;
    const result = await shopConfig.listBanners({ page, limit, status });
    res.json(ok(result.items, { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages, hasNext: result.hasNext }));
  } catch (err) { next(err); }
}

export async function createBanner(req, res, next) {
  try {
    const data = await shopConfig.createBanner(req.validatedBody);
    res.status(201).json(ok(data));
  } catch (err) { next(err); }
}

export async function updateBanner(req, res, next) {
  try {
    const data = await shopConfig.updateBanner(req.params.id, req.validatedBody);
    res.json(ok(data));
  } catch (err) { next(err); }
}

export async function toggleBanner(req, res, next) {
  try {
    const data = await shopConfig.toggleBanner(req.params.id);
    res.json(ok(data));
  } catch (err) { next(err); }
}

// ---- Admin: Cities ----
export async function listCities(req, res, next) {
  try {
    const { status } = req.query;
    const data = await shopConfig.listCities({ status });
    res.json(ok(data));
  } catch (err) { next(err); }
}

export async function createCity(req, res, next) {
  try {
    const data = await shopConfig.createCity(req.validatedBody);
    res.status(201).json(ok(data));
  } catch (err) { next(err); }
}

export async function updateCity(req, res, next) {
  try {
    const data = await shopConfig.updateCity(req.params.code, req.validatedBody);
    res.json(ok(data));
  } catch (err) { next(err); }
}

export async function toggleCity(req, res, next) {
  try {
    const data = await shopConfig.toggleCity(req.params.code);
    res.json(ok(data));
  } catch (err) { next(err); }
}

// ---- Admin: Delivery Rules ----
export async function listDeliveryRules(req, res, next) {
  try {
    const data = await shopConfig.listDeliveryRules();
    res.json(ok(data));
  } catch (err) { next(err); }
}

export async function upsertDeliveryRule(req, res, next) {
  try {
    const data = await shopConfig.upsertDeliveryRule(req.params.cityCode, req.validatedBody);
    res.json(ok(data));
  } catch (err) { next(err); }
}

export async function toggleDeliveryRule(req, res, next) {
  try {
    const data = await shopConfig.toggleDeliveryRule(req.params.id);
    res.json(ok(data));
  } catch (err) { next(err); }
}

// ---- Admin: Customer Services ----
export async function listCustomerServices(req, res, next) {
  try {
    const { status } = req.query;
    const data = await shopConfig.listCustomerServices({ status });
    res.json(ok(data));
  } catch (err) { next(err); }
}

export async function createCustomerService(req, res, next) {
  try {
    const data = await shopConfig.createCustomerService(req.validatedBody);
    res.status(201).json(ok(data));
  } catch (err) { next(err); }
}

export async function updateCustomerService(req, res, next) {
  try {
    const data = await shopConfig.updateCustomerService(req.params.id, req.validatedBody);
    res.json(ok(data));
  } catch (err) { next(err); }
}

export async function toggleCustomerService(req, res, next) {
  try {
    const data = await shopConfig.toggleCustomerService(req.params.id);
    res.json(ok(data));
  } catch (err) { next(err); }
}

export async function setDefaultCustomerService(req, res, next) {
  try {
    const data = await shopConfig.setDefaultCustomerService(req.params.id);
    res.json(ok(data));
  } catch (err) { next(err); }
}

// ---- Public: Mini App ----
export async function publicBanners(req, res, next) {
  try {
    const city = req.query.city || 'phnom_penh';
    const data = await shopConfig.listActiveBanners(undefined, city, new Date());
    res.json(ok(data));
  } catch (err) { next(err); }
}

export async function publicCategories(req, res, next) {
  try {
    const data = await shopConfig.listActiveCategories();
    res.json(ok(data));
  } catch (err) { next(err); }
}

export async function publicCities(req, res, next) {
  try {
    const data = await shopConfig.listCities({ status: 'active' });
    res.json(ok(data));
  } catch (err) { next(err); }
}

export async function publicDeliveryRule(req, res, next) {
  try {
    const data = await shopConfig.getActiveDeliveryRule(undefined, req.params.cityCode);
    if (!data) return next(new AppError('Delivery rule not found', 404, 'NOT_FOUND'));
    res.json(ok(data));
  } catch (err) { next(err); }
}

export async function publicDefaultCustomerService(req, res, next) {
  try {
    const data = await shopConfig.getDefaultCustomerService();
    if (!data) return next(new AppError('Customer service not found', 404, 'NOT_FOUND'));
    res.json(ok(data));
  } catch (err) { next(err); }
}
