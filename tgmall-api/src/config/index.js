// 环境变量统一管理 + 必填校验
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

// 启动时必填的核心环境变量（支付密钥在真实支付模式下才需要，不应阻塞部署）
const requiredEnvVars = ['DATABASE_URL', 'REDIS_URL', 'BOT_TOKEN', 'JWT_SECRET'];

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`❌ 缺少必要的环境变量: ${varName}`);
    process.exit(1);
  }
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  // Node.js 监听固定内部端口 3001，不与 Railway PORT（Nginx 监听）冲突
  port: parseInt(process.env.API_PORT) || 3001,
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  botToken: process.env.BOT_TOKEN,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  aws: {
    region: process.env.AWS_REGION || 'ap-southeast-1',
    s3Bucket: process.env.S3_BUCKET || 'tgmall-images-dev',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  // 支付
  bakongApiUrl: process.env.BAKONG_API_URL || '',
  bakongMerchantId: process.env.BAKONG_MERCHANT_ID || 'MOCK_MERCHANT',
  bakongWebhookSecret: process.env.BAKONG_WEBHOOK_SECRET || '',
  paymentMockMode: process.env.PAYMENT_MOCK_MODE === 'true' || process.env.NODE_ENV !== 'production',
  abaPaySecret: process.env.ABA_PAY_SECRET || '',
  wingPaySecret: process.env.WING_PAY_SECRET || '',
  adminTelegramIds: process.env.ADMIN_TELEGRAM_IDS || '',
  cdnBaseUrl: process.env.CDN_BASE_URL || 'http://localhost:3000/static',
};
