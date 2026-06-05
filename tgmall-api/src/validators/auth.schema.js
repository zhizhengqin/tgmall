// 认证模块 Zod Schema
import { z } from 'zod';

export const telegramLoginSchema = z.object({
  init_data: z.string().min(1, 'initData 不能为空').max(4096, 'initData 过长'),
});
