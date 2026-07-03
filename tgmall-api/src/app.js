// Express 应用配置 —— 中间件流水线
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { registerBigIntSerializer } from './utils/jsonSerializer.js';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';

// Prisma 的 telegramId 等字段使用 BigInt，Express res.json() 默认无法序列化。
// 在应用最顶层注册 toJSON，使所有 JSON.stringify 统一把 BigInt 输出为字符串。
registerBigIntSerializer();

const app = express();

// HTML 转义辅助函数 —— 防止反射型 XSS
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 1. 安全头（关闭 CSP，落地页 /go 有内联样式和脚本）
app.use(helmet({
  contentSecurityPolicy: false,
}));

// 2. CORS（生产环境读取 ALLOWED_ORIGINS，默认不再信任 localhost）
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [];

if (process.env.NODE_ENV !== 'production' && allowedOrigins.length === 0) {
  allowedOrigins.push('http://localhost:5173', 'http://localhost:3000');
}

app.use(cors({
  origin: (origin, callback) => {
    // 允许无 origin 的请求（如移动 App、服务器间调用）
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS 策略拒绝来源: ${origin}`));
  },
  credentials: true,
}));

// 3. 全局速率限制
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  limit: 100,                // 每 IP 100 次
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: '请求过于频繁，请稍后再试' } },
}));

// 4. 请求体解析（限制大小防攻击）
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 4. 请求日志
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// 5. 扫码落地页 —— 智能引导用户进入 Mini App
app.get('/go', (req, res) => {
  const ref = req.query.ref || '';
  const rawBotUsername = process.env.BOT_USERNAME || 'xhzmall_bot';
  const rawMiniAppUrl = process.env.MINI_APP_URL || 'https://tgmall-production.up.railway.app';
  const botUsername = escapeHtml(rawBotUsername);
  const miniAppUrl = escapeHtml(rawMiniAppUrl);

  // 检测是否在 Telegram 环境内
  const rawUa = req.headers['user-agent'] || '';
  const ua = escapeHtml(rawUa);
  const isTelegram = rawUa.includes('Telegram') || req.query.tg;

  // Telegram 内直接跳转
  if (isTelegram) {
    const directLink = ref
      ? `https://t.me/${rawBotUsername}?startapp=${encodeURIComponent(ref)}`
      : `https://t.me/${rawBotUsername}`;
    return res.redirect(directLink);
  }

  // 非 Telegram 环境显示引导页
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>TG Mall — ចូលទៅហាង</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#fafaf8;color:#2d2b28;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:24px;text-align:center}
.logo{width:80px;height:80px;background:linear-gradient(135deg,#c4932a,#e8b84a);border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:36px;margin-bottom:20px;box-shadow:0 4px 20px rgba(196,147,42,.3)}
.title{font-size:22px;font-weight:700;margin-bottom:8px}
.subtitle{color:#7a7670;font-size:15px;margin-bottom:32px;line-height:1.6}
.btn{display:block;width:100%;max-width:320px;padding:16px 24px;border-radius:12px;font-size:17px;font-weight:600;text-decoration:none;margin-bottom:12px;transition:transform .15s}
.btn-primary{background:#c4932a;color:#fff;box-shadow:0 4px 16px rgba(196,147,42,.3)}
.btn-secondary{background:#fff;color:#c4932a;border:2px solid #c4932a}
.btn:active{transform:scale(.97)}
.tips{margin-top:24px;font-size:13px;color:#9a9590;line-height:1.8}
.tips strong{color:#c4932a}
.lang-km{font-family:'Noto Sans Khmer',system-ui,sans-serif}
</style>
</head>
<body>
<div class="logo">🛒</div>
<div class="title">TG Mall</div>
<div class="subtitle">
柬埔寨 Telegram 电商平台<br>
<span class="lang-km">វេទិកាទីផ្សារ Telegram កម្ពុជា</span>
</div>
<a class="btn btn-primary" href="tg://resolve?domain=${botUsername}">
📲 បើកក្នុង Telegram / 在 Telegram 中打开
</a>
<a class="btn btn-secondary" href="https://t.me/${botUsername}">
🔗 បើកតំណភ្ជាប់ / 打开链接
</a>
<div class="tips">
<strong>提示：</strong>请确保已安装 Telegram App<br>
微信/系统相机扫码会进入 Bot 聊天，点击底部按钮即可打开商城<br>
<span class="lang-km">សូមបើកតាមរយៈកម្មវិធី Telegram</span>
</div>
<script>
// 尝试自动跳转到 Telegram
setTimeout(() => {
  window.location.href = 'tg://resolve?domain=${botUsername}';
}, 800);
</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// 6. 业务路由
app.use('/api/v1', routes);

// 7. 全局错误处理（必须在路由之后）
app.use(errorHandler);

export default app;
