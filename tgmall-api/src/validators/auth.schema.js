// 认证模块 Zod Schema
import { z } from 'zod';

export const telegramLoginSchema = z.object({
  init_data: z.string().min(1, 'initData 不能为空').max(4096, 'initData 过长'),
});

// 演示环境浏览器登录：由前端 Telegram Mock 直接传入用户信息，不走 initData 签名校验
export const demoLoginSchema = z.object({
  user: z.object({
    id: z.union([z.number(), z.string(), z.bigint()]),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    username: z.string().optional(),
    language_code: z.string().optional(),
    photo_url: z.string().url().optional().nullable(),
  }),
});

// 发送短信验证码
export const sendSmsSchema = z.object({
  phone: z.string().regex(/^\+855[1-9]\d{7,8}$/, '手机号格式错误'),
  scene: z.enum(['login', 'reset_password', 'set_password', 'bind_phone']),
});

// 手机号登录（code 和 password 至少一个）
export const phoneLoginSchema = z.object({
  phone: z.string().regex(/^\+855[1-9]\d{7,8}$/, '手机号格式错误'),
  code: z.string().length(6, '验证码为 6 位数字').optional(),
  password: z.string().min(8, '密码至少 8 位').max(20, '密码最多 20 位').optional(),
}).refine(data => data.code || data.password, {
  message: '验证码或密码至少提供一个',
});

// 忘记密码重置
export const resetPasswordSchema = z.object({
  phone: z.string().regex(/^\+855[1-9]\d{7,8}$/, '手机号格式错误'),
  code: z.string().length(6, '验证码为 6 位数字'),
  new_password: z.string().min(8, '密码至少 8 位').max(20, '密码最多 20 位')
    .regex(/[a-zA-Z]/, '密码必须包含字母').regex(/\d/, '密码必须包含数字'),
});

// 已登录用户设置/修改密码
export const setPasswordSchema = z.object({
  password: z.string().min(8, '密码至少 8 位').max(20, '密码最多 20 位')
    .regex(/[a-zA-Z]/, '密码必须包含字母').regex(/\d/, '密码必须包含数字'),
});

// 绑定手机号
export const bindPhoneSchema = z.object({
  phone: z.string().regex(/^\+855[1-9]\d{7,8}$/, '手机号格式错误'),
  code: z.string().length(6, '验证码为 6 位数字'),
});
