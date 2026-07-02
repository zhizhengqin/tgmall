// 库存管理相关 Zod 校验
import { z } from 'zod';

export const adjustStockSchema = z.object({
  qty: z.number().int('库存数量必须是整数').min(0, '库存不能为负数'),
  note: z.string().max(500).optional(),
});

export const inventoryCheckSchema = z.object({
  productId: z.string().min(1, '商品ID必填'),
  actualQty: z.number().int('库存数量必须是整数').min(0, '库存不能为负数'),
  note: z.string().max(500).optional(),
});

export const alertThresholdSchema = z.object({
  threshold: z
    .number()
    .int('预警阈值必须是整数')
    .min(0, '阈值不能为负数')
    .nullable()
    .optional(),
});
