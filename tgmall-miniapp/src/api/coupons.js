// 优惠券 API
import api from './index.js';
export const getAvailableCoupons = () => api.get('/coupons');
export const claimCoupon = (id) => api.post(`/coupons/${id}/claim`);
export const getMyCoupons = (status = 'unused') => api.get('/coupons/mine', { params: { status } });
