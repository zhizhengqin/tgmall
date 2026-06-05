// 收货地址 API
import api from './index.js';
export const getAddresses = () => api.get('/users/me/addresses');
export const createAddress = (data) => api.post('/users/me/addresses', data);
export const updateAddress = (id, data) => api.put(`/users/me/addresses/${id}`, data);
export const deleteAddress = (id) => api.delete(`/users/me/addresses/${id}`);
