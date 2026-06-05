// 商品模块 API
import api from './index.js';

export function getProducts(params = {}) {
  return api.get('/products', { params });
}

export function getProductById(id) {
  return api.get(`/products/${id}`);
}
