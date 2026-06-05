// 商家相关 Zod 校验 Schema
import { z } from 'zod';

// 商家入驻申请
export const registerMerchantSchema = z.object({
  name_km: z.string().min(1, '高棉语店名必填').max(200, '店名最长200字符'),
  name_en: z.string().max(200, '英文店名最长200字符').optional(),
  owner_name: z.string().min(1, '店主姓名必填').max(100, '姓名最长100字符'),
  phone: z.string().regex(/^\+855\d{8,9}$/, '手机号须为 +855 格式'),
  address: z.string().min(1, '地址必填').max(500, '地址最长500字符'),
  category: z.string().min(1, '经营品类必填').max(50, '品类最长50字符'),
  description: z.string().max(1000, '描述最长1000字符').optional(),
});

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
  images: z.array(z.object({
    url: z.string().url('图片URL格式无效'),
    thumb_url: z.string().url('缩略图URL格式无效').optional(),
  })).min(1, '至少上传一张图片').max(10, '最多10张图片'),
  specs: z.array(z.object({
    name: z.string(),
    values: z.array(z.string()),
  })).max(20, '最多20个规格').optional().default([]),
  category: z.string().min(1, '品类必填').max(50, '品类最长50字符'),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

// 发货
export const shipOrderSchema = z.object({
  logistics_company: z.string().min(1, '物流公司必填').max(100).optional(),
  tracking_number: z.string().min(1, '运单号必填').max(100).optional(),
  note: z.string().max(200, '备注最长200字符').optional(),
});

// 管理员审核驳回
export const rejectMerchantSchema = z.object({
  reason: z.string().min(1, '驳回原因必填').max(500, '原因最长500字符'),
});
