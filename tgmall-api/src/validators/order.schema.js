// 订单 Zod Schema
import { z } from 'zod';

export const createOrderSchema = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid('商品 ID 格式无效'),
    quantity: z.number().int().min(1, '数量至少为1').max(99, '数量最多99'),
    spec: z.record(z.string()).optional().default({}),
  })).min(1, '至少需要一件商品'),
  shipping_address_id: z.string().uuid('地址 ID 格式无效'),
  coupon_id: z.string().uuid().optional(),
  payment_method: z.enum(['khqr', 'aba_pay', 'wing_pay', 'cod']),
  notes: z.string().max(500, '备注最长500字符').optional(),
});
