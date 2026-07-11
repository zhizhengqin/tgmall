import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { auth } from '../middleware/auth.js';
import { config } from '../config/index.js';
import {
  telegramLoginSchema, demoLoginSchema, sendSmsSchema, phoneLoginSchema,
  resetPasswordSchema, setPasswordSchema, bindPhoneSchema,
} from '../validators/auth.schema.js';
import * as authController from '../controllers/auth.controller.js';
import * as adminAuthController from '../controllers/adminAuth.controller.js';

const router = Router();

router.post('/telegram', validate(telegramLoginSchema), authController.telegramLogin);

// 演示环境浏览器登录：仅 PAYMENT_MOCK_MODE 启用且非生产环境时注册
if (config.paymentMockMode && process.env.NODE_ENV !== 'production') {
  router.post('/demo-login', validate(demoLoginSchema), authController.demoLogin);
}

router.post('/web-login', authController.webLogin);
router.post('/admin-login', adminAuthController.login);
router.post('/admin-login/send-otp', adminAuthController.sendOtp);
router.post('/admin-login/otp', adminAuthController.otpLogin);

// 手机号认证
router.post('/send-sms', validate(sendSmsSchema), authController.sendSms);
router.post('/login/phone', validate(phoneLoginSchema), authController.phoneLogin);
router.post('/set-password', auth, validate(setPasswordSchema), authController.setPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/bind-phone', auth, validate(bindPhoneSchema), authController.bindPhone);

export default router;
