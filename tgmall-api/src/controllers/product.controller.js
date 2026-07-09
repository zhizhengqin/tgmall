// 商品控制器
import * as productService from '../services/product.service.js';
import { getPagination } from '../utils/pagination.js';
import { AppError } from '../utils/AppError.js';
import { productListQuerySchema } from '../validators/product.schema.js';

function parsePrice(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export async function list(req, res, next) {
  try {
    const { page, limit } = getPagination(req.query);
    const parsed = req.validatedQuery || productListQuerySchema.parse(req.query);
    const { category, q, sort = 'newest' } = parsed;
    const minPrice = parsePrice(parsed.min_price);
    const maxPrice = parsePrice(parsed.max_price);

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      return next(new AppError('最低价格不能高于最高价格', 400, 'INVALID_PRICE_RANGE'));
    }

    const result = await productService.listProducts({
      page,
      limit,
      category,
      q,
      sort,
      minPrice,
      maxPrice,
      language: req.headers['accept-language'] || 'km',
      userId: req.user?.userId,
    });

    res.json({
      success: true,
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function detail(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.id, req.user?.userId);
    if (!product) {
      return next(new AppError('商品不存在', 404, 'NOT_FOUND'));
    }
    if (product._inactive) {
      return next(new AppError('商品已下架', 410, 'PRODUCT_INACTIVE'));
    }
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}
