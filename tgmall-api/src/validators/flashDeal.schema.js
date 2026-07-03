// FlashDeal Zod 校验 Schema
import { z } from 'zod';

export const flashDealSchema = z.object({
  product_id: z.string().uuid('商品ID格式无效'),
  deal_price_usd: z.number().min(0.01, '专区价格至少 $0.01').max(999999.99),
  deal_price_khr: z.number().int().min(1),
  deal_stock: z.number().int().min(1, '库存至少为 1'),
  city_code: z.string().max(50).optional().nullable(),
  start_at: z.string().datetime().optional().nullable(),
  end_at: z.string().datetime().optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});
