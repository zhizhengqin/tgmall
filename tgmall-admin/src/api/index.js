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

// ── 运营配置 ──
export const getCategories = (params) => api.get('/admin/categories', { params });
export const createCategory = (data) => api.post('/admin/categories', data);
export const updateCategory = (code, data) => api.put(`/admin/categories/${code}`, data);
export const toggleCategory = (code) => api.post(`/admin/categories/${code}/toggle`);

export const getBanners = (params) => api.get('/admin/banners', { params });
export const createBanner = (data) => api.post('/admin/banners', data);
export const updateBanner = (id, data) => api.put(`/admin/banners/${id}`, data);
export const toggleBanner = (id) => api.post(`/admin/banners/${id}/toggle`);

export const getCities = (params) => api.get('/admin/cities', { params });
export const createCity = (data) => api.post('/admin/cities', data);
export const updateCity = (code, data) => api.put(`/admin/cities/${code}`, data);
export const toggleCity = (code) => api.post(`/admin/cities/${code}/toggle`);

export const getDeliveryRules = () => api.get('/admin/delivery-rules');
export const updateDeliveryRule = (cityCode, data) => api.put(`/admin/delivery-rules/${cityCode}`, data);
export const toggleDeliveryRule = (id) => api.post(`/admin/delivery-rules/${id}/toggle`);

export const getCustomerServices = (params) => api.get('/admin/customer-services', { params });
export const createCustomerService = (data) => api.post('/admin/customer-services', data);
export const updateCustomerService = (id, data) => api.put(`/admin/customer-services/${id}`, data);
export const toggleCustomerService = (id) => api.post(`/admin/customer-services/${id}/toggle`);
export const setDefaultCustomerService = (id) => api.post(`/admin/customer-services/${id}/set-default`);
