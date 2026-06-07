import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;

// ── 大盘 ──
export const getAdminDashboard = () => api.get('/admin/dashboard');

// ── 商家审核 ──
export const getMerchants = (params) => api.get('/admin/merchants', { params });
export const approveMerchant = (id) => api.post(`/admin/merchants/${id}/approve`);
export const rejectMerchant = (id, reason) => api.post(`/admin/merchants/${id}/reject`, { reason });

// ── 用户管理 ──
export const getAdminUsers = (params) => api.get('/admin/users', { params });

// ── 商品管理 ──
export const getProducts = (params) => api.get('/admin/products', { params });
export const getProductById = (id) => api.get(`/admin/products/${id}`);
export const createProduct = (data) => api.post('/admin/products', data);
export const updateProduct = (id, data) => api.put(`/admin/products/${id}`, data);
export const toggleProduct = (id) => api.post(`/admin/products/${id}/toggle`);

// ── 订单管理 ──
export const getOrders = (params) => api.get('/admin/orders', { params });
export const getOrderDetail = (id) => api.get(`/admin/orders/${id}`);
export const shipOrder = (id, data) => api.post(`/admin/orders/${id}/ship`, data);
