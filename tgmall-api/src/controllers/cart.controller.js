// 购物车控制器
import * as cartService from '../services/cart.service.js';

export async function get(req, res, next) {
  try {
    const cart = await cartService.getCart(req.user.userId);
    res.json({ success: true, data: cart });
  } catch (err) { next(err); }
}

export async function addItem(req, res, next) {
  try {
    const result = await cartService.addCartItem(req.user.userId, req.validatedBody);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function updateItem(req, res, next) {
  try {
    const result = await cartService.updateCartItem(req.user.userId, req.params.id, req.validatedBody);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function removeItem(req, res, next) {
  try {
    await cartService.removeCartItem(req.user.userId, req.params.id);
    res.json({ success: true, data: { message: '已移除' } });
  } catch (err) { next(err); }
}

export async function clear(req, res, next) {
  try {
    await cartService.clearCart(req.user.userId);
    res.json({ success: true, data: { message: '购物车已清空' } });
  } catch (err) { next(err); }
}
