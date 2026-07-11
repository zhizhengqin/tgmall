// 运行时配置 API
import api from './index.js';

/** GET /config — 获取后端运行时配置 */
export const getRuntimeConfig = () => api.get('/config');
