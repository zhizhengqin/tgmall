import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('merchant_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['Accept-Language'] = localStorage.getItem('merchant_lang') || 'km';
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('merchant_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;

// ── 看板 ──
export const getDashboard = () => api.get('/merchants/dashboard');

// ── 商品 ──
export const getProducts = (params) => api.get('/merchants/products', { params });
export const createProduct = (data) => api.post('/merchants/products', data);
export const updateProduct = (id, data) => api.put(`/merchants/products/${id}`, data);
export const toggleProduct = (id) => api.post(`/merchants/products/${id}/toggle`);

// ── 订单 ──
export const getOrders = (params) => api.get('/merchants/orders', { params });
export const getOrderDetail = (id) => api.get(`/merchants/orders/${id}`);
export const shipOrder = (id, data) => api.post(`/merchants/orders/${id}/ship`, data);
