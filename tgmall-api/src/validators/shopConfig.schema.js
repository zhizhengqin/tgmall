// 运营配置相关 Zod 校验
import { z } from 'zod';

export const categorySchema = z.object({
  code: z.string().min(1, '品类编码必填').max(50, '编码最长50字符'),
  name_km: z.string().min(1, '高棉语名称必填').max(100),
  name_en: z.string().max(100).optional(),
  name_zh: z.string().max(100).optional(),
  icon_url: z.string().url('图标URL格式无效').optional(),
  sort_order: z.number().int('排序必须是整数').min(0).default(0),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const bannerSchema = z.object({
  title_km: z.string().min(1, '高棉语标题必填').max(200),
  title_en: z.string().max(200).optional(),
  title_zh: z.string().max(200).optional(),
  image_url: z.string().url('图片URL格式无效'),
  link_type: z.enum(['product', 'category', 'url']),
  link_target: z.string().min(1, '跳转目标必填').max(255),
  city_code: z.string().max(50).optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  start_at: z.string().datetime().optional().nullable(),
  end_at: z.string().datetime().optional().nullable(),
});

export const citySchema = z.object({
  code: z.string().min(1, '城市编码必填').max(50),
  name_km: z.string().min(1, '高棉语名称必填').max(100),
  name_en: z.string().max(100).optional(),
  name_zh: z.string().max(100).optional(),
  sort_order: z.number().int().min(0).default(0),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const deliveryRuleSchema = z.object({
  min_order_amount_usd: z.number().min(0, '起送金额不能为负').max(999999.99),
  shipping_fee_usd: z.number().min(0).max(999999.99),
  free_shipping_threshold_usd: z.number().min(0).max(999999.99).default(0),
  estimated_delivery_days: z.number().int().min(1).max(30),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const customerServiceSchema = z.object({
  name_km: z.string().min(1).max(100),
  name_en: z.string().max(100).optional(),
  name_zh: z.string().max(100).optional(),
  telegram_username: z.string().min(1, 'Telegram 用户名必填').max(100),
  phone: z.string().max(20).optional().nullable(),
  work_hours: z.string().max(100).optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const hotSearchSchema = z.object({
  keyword: z.string().min(1, '搜索词必填').max(100),
  sort_order: z.number().int('排序必须是整数').min(0).default(0),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});
