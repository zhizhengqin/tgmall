// 商品控制器
import * as productService from '../services/product.service.js';
import { getPagination } from '../utils/pagination.js';
import { AppError } from '../utils/AppError.js';

export async function list(req, res, next) {
  try {
    const { page, limit } = getPagination(req.query);
    const { category, q, sort = 'newest' } = req.query;

    const result = await productService.listProducts({
      page,
      limit,
      category,
      q,
      sort,
      language: req.headers['accept-language'] || 'km',
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
    const product = await productService.getProductById(req.params.id);
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
