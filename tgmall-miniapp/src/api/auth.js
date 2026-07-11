// 认证模块 API
import api from './index.js';

export function telegramLogin(initData) {
  return api.post('/auth/telegram', { init_data: initData });
}

// 演示环境浏览器登录：直接传用户信息，后端不走 initData 签名校验
export function demoLogin(user) {
  return api.post('/auth/demo-login', { user });
}

// 手机号认证
export function sendSms(phone, scene) {
  return api.post('/auth/send-sms', { phone, scene });
}

export function loginByPhone(data) {
  return api.post('/auth/login/phone', data);
}

export function setPassword(password) {
  return api.post('/auth/set-password', { password });
}

export function resetPassword(data) {
  return api.post('/auth/reset-password', data);
}

export function bindPhone(phone, code) {
  return api.post('/auth/bind-phone', { phone, code });
}
