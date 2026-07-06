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
  // Railway 通过 PORT 环境变量暴露内部端口，必须优先监听该端口
  port: parseInt(process.env.PORT || process.env.API_PORT) || 3001,
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  botToken: process.env.BOT_TOKEN,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
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
  paymentMockMode: process.env.PAYMENT_MOCK_MODE === 'true' || process.env.NODE_ENV === 'test',
  abaPaySecret: process.env.ABA_PAY_SECRET || '',
  wingPaySecret: process.env.WING_PAY_SECRET || '',
  adminTelegramIds: process.env.ADMIN_TELEGRAM_IDS || '',
  cdnBaseUrl: process.env.CDN_BASE_URL || 'http://localhost:3000/static',
  // Mini App
  miniAppUrl: process.env.MINI_APP_URL || '',
  botUsername: process.env.BOT_USERNAME || '',
  // SMS 配置
  sms: {
    provider: process.env.SMS_PROVIDER || 'mock',
    mockEnabled: process.env.SMS_MOCK_ENABLED === 'true' || process.env.NODE_ENV !== 'production',
    apiKey: process.env.SMS_API_KEY || '',
    apiSecret: process.env.SMS_API_SECRET || '',
    senderId: process.env.SMS_SENDER_ID || '',
    cooldownSeconds: 60,
    codeTtlSeconds: 300,
    maxAttempts: 5,
    blockSeconds: 900,
  },
};
