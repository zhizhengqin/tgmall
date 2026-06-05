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
