import api from './index.js';

export const getBanners = (city = 'phnom_penh') => api.get('/banners', { params: { city } });
export const getCategories = () => api.get('/categories');
export const getCities = () => api.get('/cities');
export const getDeliveryRule = (cityCode) => api.get(`/delivery-rules/${cityCode}`);
export const getDefaultCustomerService = () => api.get('/customer-services/default');
