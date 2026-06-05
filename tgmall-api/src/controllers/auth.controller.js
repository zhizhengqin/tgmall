// 认证控制器
import * as authService from '../services/auth.service.js';

export async function telegramLogin(req, res, next) {
  try {
    const { init_data } = req.validatedBody;
    const result = await authService.telegramLogin(init_data);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
