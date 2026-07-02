// 认证控制器
import * as authService from '../services/auth.service.js';
import * as smsService from '../services/sms.service.js';

export async function telegramLogin(req, res, next) {
  try {
    const { init_data } = req.validatedBody;
    const result = await authService.telegramLogin(init_data);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// POST /auth/web-login — Telegram Login Widget (用于管理员 Web 登录)
export async function webLogin(req, res, next) {
  try {
    const result = await authService.webLogin(req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// POST /auth/send-sms
export async function sendSms(req, res, next) {
  try {
    const { phone, scene } = req.validatedBody;
    const result = await smsService.sendSms(phone, scene);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// POST /auth/login/phone
export async function phoneLogin(req, res, next) {
  try {
    const result = await authService.phoneLogin(req.validatedBody);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// POST /auth/set-password
export async function setPassword(req, res, next) {
  try {
    await authService.setPassword(req.user.userId, req.validatedBody.password);
    res.json({ success: true, data: { message: '密码设置成功' } });
  } catch (err) { next(err); }
}

// POST /auth/reset-password
export async function resetPassword(req, res, next) {
  try {
    const { phone, code, new_password } = req.validatedBody;
    await authService.resetPassword(phone, code, new_password);
    res.json({ success: true, data: { message: '密码已重置，请重新登录' } });
  } catch (err) { next(err); }
}

// POST /auth/bind-phone
export async function bindPhone(req, res, next) {
  try {
    const { phone, code } = req.validatedBody;
    const user = await authService.bindPhone(req.user.userId, phone, code);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}
