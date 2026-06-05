// 认证模块 API
import api from './index.js';

export function telegramLogin(initData) {
  return api.post('/auth/telegram', { init_data: initData });
}
