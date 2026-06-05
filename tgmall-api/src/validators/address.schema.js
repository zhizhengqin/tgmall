// 收货地址 Zod Schema
import { z } from 'zod';

const phoneRegex = /^\+855\d{8,9}$/;

export const createAddressSchema = z.object({
  recipient_name: z.string().min(1, '收件人姓名不能为空').max(100, '姓名最长100字符'),
  phone: z.string().regex(phoneRegex, '手机号格式应为 +855 开头'),
  province: z.string().min(1, '省份不能为空').max(50),
  district: z.string().min(1, '区/县不能为空').max(50),
  detail: z.string().min(1, '详细地址不能为空').max(200, '详细地址最长200字符'),
  is_default: z.boolean().optional().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();
