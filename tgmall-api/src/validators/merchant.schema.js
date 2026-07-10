// 管理后台 Zod 校验 Schema（原 merchant schema，V2 仅保留 admin 操作）
import { z } from 'zod';

// 上架/编辑商品
export const merchantProductSchema = z.object({
  name_km: z.string().min(1, '高棉语商品名必填').max(300, '商品名最长300字符'),
  name_en: z.string().max(300, '英文商品名最长300字符').optional(),
  name_zh: z.string().max(300, '中文商品名最长300字符').optional(),
  description_km: z.string().max(5000, '描述最长5000字符').optional(),
  description_en: z.string().max(5000).optional(),
  description_zh: z.string().max(5000).optional(),
  price_usd: z.number().positive('价格必须大于0').max(999999.99, '价格超出上限'),
  price_khr: z.number().int('瑞尔必须是整数').positive('价格必须大于0'),
  stock: z.number().int('库存必须是整数').min(0, '库存不能为负数'),
  alert_threshold: z.number().int('预警阈值必须是整数').min(0).optional().nullable(),
  images: z.array(z.object({
    url: z.string().url('图片URL格式无效'),
    thumb_url: z.string().url('缩略图URL格式无效').optional(),
  })).min(1, '至少上传一张图片').max(10, '最多10张图片'),
  specs: z.array(z.object({
    nameEn: z.string(),
    nameKm: z.string().optional(),
    nameZh: z.string().optional(),
    values: z.array(z.object({
      valueEn: z.string(),
      valueKm: z.string().optional(),
      valueZh: z.string().optional(),
      priceUsd: z.number().nonnegative().optional(),
      priceKhr: z.number().int().nonnegative().optional(),
      stock: z.number().int().nonnegative().optional(),
    })).max(50),
  })).max(20, '最多20个规格').optional().default([]),
  category: z.string().min(1, '品类必填').max(50, '品类最长50字符'),
  tags: z.array(z.object({
    textKm: z.string(),
    textEn: z.string().optional(),
    textZh: z.string().optional(),
    color: z.string(),
    bg: z.string(),
  })).max(6, '最多6个标签').optional().default([]),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

// 发货
export const shipOrderSchema = z.object({
  logistics_company: z.string().min(1, '物流公司必填').max(100, '物流公司名称最长100字符'),
  tracking_number: z.string().min(1, '运单号必填').max(100, '运单号最长100字符'),
  estimatedDelivery: z.string().optional(),
  trackingUrl: z.string().url('物流链接格式无效').optional(),
});