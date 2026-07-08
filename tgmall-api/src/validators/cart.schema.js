// 购物车 Zod Schema
import { z } from 'zod';

export const addCartItemSchema = z.object({
  product_id: z.string().uuid('商品 ID 格式无效'),
  quantity: z.number().int().min(1).max(99),
  spec: z.record(z.string()).optional().default({}),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(99),
});

export const checkoutPreviewSchema = z.object({
  item_ids: z.array(z.string().min(1, '商品项 ID 不能为空')).min(1, '请至少选择一件商品'),
  city_code: z.string().optional(),
  coupon_id: z.string().uuid('优惠券 ID 格式无效').optional(),
});
