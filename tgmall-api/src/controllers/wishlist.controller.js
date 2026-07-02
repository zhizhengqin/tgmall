// Wishlist 控制器
import * as wishlistService from '../services/wishlist.service.js';

export async function toggle(req, res, next) {
  try {
    const { productId } = req.body;
    const result = await wishlistService.toggleWishlist(req.user.userId, productId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const result = await wishlistService.listWishlist(req.user.userId, page, limit);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    const { productId } = req.params;
    await wishlistService.removeWishlist(req.user.userId, productId);
    res.json({ success: true, message: '已取消收藏' });
  } catch (err) { next(err); }
}
