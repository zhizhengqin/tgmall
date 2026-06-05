// 订单控制器
import * as orderService from '../services/order.service.js';
import { getPagination } from '../utils/pagination.js';

export async function create(req, res, next) {
  try {
    const order = await orderService.createOrder(req.user.userId, req.validatedBody);
    res.status(201).json({ success: true, data: order });
  } catch (err) { next(err); }
}

export async function list(req, res, next) {
  try {
    const { page, limit } = getPagination(req.query);
    const { status } = req.query;
    const result = await orderService.getUserOrders(req.user.userId, { status, page, limit });
    res.json({ success: true, data: result.items, meta: {
      total: result.total, page: result.page, limit: result.limit,
      totalPages: result.totalPages, hasNext: result.hasNext,
    }});
  } catch (err) { next(err); }
}

export async function detail(req, res, next) {
  try {
    const order = await orderService.getOrderById(req.user.userId, req.params.id);
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
}

export async function cancel(req, res, next) {
  try {
    const result = await orderService.cancelOrder(req.user.userId, req.params.id, req.body?.reason);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function confirm(req, res, next) {
  try {
    const result = await orderService.confirmOrder(req.user.userId, req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}
