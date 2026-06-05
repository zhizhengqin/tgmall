// Axios 实例 — 统一请求层
import axios from 'axios';
import { useUserStore } from '@/stores/userStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截器：自动附带 Token + 语言头
api.interceptors.request.use((config) => {
  const userStore = useUserStore();
  if (userStore.token) {
    config.headers.Authorization = `Bearer ${userStore.token}`;
  }
  const lang = localStorage.getItem('lang') || 'km';
  config.headers['Accept-Language'] = lang;
  return config;
});

// 响应拦截器：统一解包 + 错误处理
api.interceptors.response.use(
  (res) => res.data,
  (error) => {
    const msg = error.response?.data?.error?.message || '网络错误，请稍后重试';
    console.error(`[API Error] ${error.config?.url}:`, msg);
    return Promise.reject(error);
  },
);

export default api;
