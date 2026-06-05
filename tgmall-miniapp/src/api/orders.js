// 订单 API
import api from './index.js';
export const createOrder = (data) => api.post('/orders', data);
export const getOrders = (params) => api.get('/orders', { params });
export const getOrderById = (id) => api.get(`/orders/${id}`);
export const cancelOrder = (id, reason) => api.post(`/orders/${id}/cancel`, { reason });
export const confirmOrder = (id) => api.post(`/orders/${id}/confirm`);
