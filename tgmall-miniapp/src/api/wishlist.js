// 收藏模块 API
import api from './index.js';

export function toggleWishlist(productId) {
  return api.post('/wishlist/toggle', { productId });
}

export function getWishlist(page = 1, limit = 20) {
  return api.get('/wishlist', { params: { page, limit } });
}

export function removeWishlist(productId) {
  return api.delete(`/wishlist/${productId}`);
}
