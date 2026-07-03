// 管理员认证控制器
import * as adminAuthService from '../services/adminAuth.service.js';

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: '请输入用户名和密码' },
      });
    }
    const result = await adminAuthService.adminLogin(username, password);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function sendOtp(req, res, next) {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PHONE', message: '请输入手机号' },
      });
    }
    const result = await adminAuthService.sendAdminOtp(phone);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function otpLogin(req, res, next) {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: '请输入手机号和验证码' },
      });
    }
    const result = await adminAuthService.adminOtpLogin(phone, code);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}
