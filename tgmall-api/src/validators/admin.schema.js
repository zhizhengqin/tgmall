// 管理员接口 Zod 校验
import { z } from 'zod';

export const couponBaseSchema = z.object({
  titleKm: z.string().min(1).max(200),
  titleEn: z.string().max(200).optional().nullable(),
  titleZh: z.string().max(200).optional().nullable(),
  type: z.enum(['fixed', 'percent']),
  value: z.coerce.number().nonnegative(),
  minSpend: z.coerce.number().nonnegative().default(0),
  totalQty: z.coerce.number().int().positive(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const couponSchema = couponBaseSchema.refine((data) => data.endDate > data.startDate, {
  message: '结束时间必须晚于开始时间',
  path: ['endDate'],
});

export const couponUpdateSchema = couponBaseSchema.partial();

export const couponStatusSchema = z.object({
  status: z.enum(['active', 'inactive']),
});

export const adminUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  phone: z.string().regex(/^\+855[1-9]\d{7,8}$/, '手机号格式应为 +855 开头').optional().nullable(),
  displayName: z.string().max(100).optional().nullable(),
  role: z.enum(['admin', 'operator', 'cs', 'warehouse']).default('operator'),
});

export const adminPasswordSchema = z.object({
  password: z.string().min(6).max(100),
});
