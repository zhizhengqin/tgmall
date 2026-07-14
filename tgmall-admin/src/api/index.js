import axios from 'axios';
import { ElMessage } from 'element-plus';
import { t } from '@/utils/i18n';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    const config = err.config;
    if (!config) return Promise.reject(err);

    // 弱网/超时重试一次：仅对幂等的 GET 请求
    const isRetryable = config.method === 'get' && !config.__retry;
    const isNetworkError = !err.response || err.code === 'ECONNABORTED' || err.message?.includes('timeout');
    if (isRetryable && isNetworkError) {
      config.__retry = true;
      return api(config);
    }

    if (err.response?.status === 401) {
      sessionStorage.removeItem('admin_token');
      window.location.href = '/admin/login';
    } else {
      const status = err.response?.status;
      let msg;
      if (status >= 500) {
        msg = t('common.serverError');
        // eslint-disable-next-line no-console
        console.error('API server error:', err.response?.data);
      } else {
        msg = err.response?.data?.message || err.message || t('common.requestFailed');
      }
      ElMessage.error(msg);
    }
    return Promise.reject(err);
  },
);

export default api;

// ── 大盘 ──
export const getAdminDashboard = () => api.get('/admin/dashboard');

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
export const exportOrdersCsv = (params) => api.get('/admin/orders/export/csv', { params, responseType: 'blob' });
export const toggleUserStatus = (id) => api.post(`/admin/users/${id}/toggle`);
export const getUserDetail = (id) => api.get(`/admin/users/${id}`);

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

export const getHotSearches = (params) => api.get('/admin/hot-searches', { params });
export const createHotSearch = (data) => api.post('/admin/hot-searches', data);
export const updateHotSearch = (id, data) => api.put(`/admin/hot-searches/${id}`, data);
export const toggleHotSearch = (id) => api.post(`/admin/hot-searches/${id}/toggle`);

// ── 限时专区管理 ──
export const getFlashDeals = (params) => api.get('/admin/flash-deals', { params });
export const createFlashDeal = (data) => api.post('/admin/flash-deals', data);
export const updateFlashDeal = (id, data) => api.put(`/admin/flash-deals/${id}`, data);
export const toggleFlashDeal = (id) => api.post(`/admin/flash-deals/${id}/toggle`);

// ── 库存管理 ──
export const getInventory = (params) => api.get('/admin/inventory', { params });
export const adjustStock = (id, data) => api.put(`/admin/products/${id}/stock`, data);
export const getStockLogs = (id, params) => api.get(`/admin/products/${id}/stock-logs`, { params });
export const checkInventory = (data) => api.post('/admin/inventory/check', data);
export const setAlertThreshold = (id, data) => api.put(`/admin/products/${id}/alert-threshold`, data);

// ── 平台设置 ──
export const getPlatformSettings = () => api.get('/admin/platform-settings');
export const updatePlatformSettings = (data) => api.put('/admin/platform-settings', data);

// ── 管理员账号管理 ──
export const getSysAdmins = () => api.get('/admin/admins');
export const createSysAdmin = (data) => api.post('/admin/admins', data);
export const resetSysAdminPassword = (id, data) => api.put(`/admin/admins/${id}/reset-password`, data);
export const toggleSysAdminStatus = (id) => api.post(`/admin/admins/${id}/toggle`);
export const deleteSysAdmin = (id) => api.delete(`/admin/admins/${id}`);

// ── 标签管理 ──
export const getTags = (params) => api.get('/admin/tags', { params });
export const createTag = (data) => api.post('/admin/tags', data);
export const updateTag = (id, data) => api.put(`/admin/tags/${id}`, data);
export const deleteTag = (id) => api.delete(`/admin/tags/${id}`);

// ── 图片上传 ──
export const uploadImage = (data) => api.post('/admin/upload/image', data);
