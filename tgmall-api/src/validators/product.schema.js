// 商品模块 Zod Schema
import { z } from 'zod';

export const productListQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional().default('1'),
  limit: z.string().regex(/^\d+$/).optional().default('20'),
  category: z.string().max(50).optional(),
  q: z.string().max(100).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular']).optional().default('newest'),
  min_price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  max_price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
});
