// 系统配置 Zod 校验
import { z } from 'zod';

export const platformSettingsSchema = z.object({
  store_name: z.string().min(1).max(100).optional().nullable(),
  store_logo: z.string().url().max(500).optional().nullable(),
  contact_phone: z.string().max(20).optional().nullable(),
  contact_email: z.string().email().max(100).optional().nullable(),
  maintenance_mode: z.boolean().optional(),
  announcement_text: z.string().max(2000).optional().nullable(),
  login_banner_image: z.string().url().max(500).optional().nullable(),
  exchange_rate: z.coerce.number().positive().optional(),
});
