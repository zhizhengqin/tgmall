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
