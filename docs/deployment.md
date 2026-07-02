# TG Mall 上线部署文档

> 最后更新：2026-07-03 | Sprint 8 Alpha 打磨完成

## 一、环境变量清单

### Backend (`tgmall-api/.env`)

```bash
# 数据库
DATABASE_URL=postgresql://user:password@host:5432/tgmall

# Redis（缓存 + 分布式锁）
REDIS_URL=redis://user:password@host:6379

# JWT
JWT_SECRET=<random-64-char-string>

# Telegram Bot
BOT_TOKEN=<telegram-bot-token-from-botfather>

# Bakong KHQR（柬埔寨国家支付）
BAKONG_API_URL=https://api.bakong.gov.kh/v1
BAKONG_MERCHANT_ID=<merchant-id>
BAKONG_PUBLIC_KEY=<rsa-public-key>

# ABA Pay
ABA_PAY_API_KEY=<api-key>
ABA_PAY_MERCHANT_ID=<merchant-id>

# Wing Pay
WING_PAY_API_KEY=<api-key>
WING_PAY_MERCHANT_ID=<merchant-id>

# SMS（短信验证码）
SMS_PROVIDER=twilio  # 或 localstack（本地开发）
SMS_API_KEY=<twilio-api-key>
SMS_API_SECRET=<twilio-api-secret>
```

### Frontend (`tgmall-miniapp/.env.production`)

```bash
VITE_API_BASE_URL=https://api.tgmall.kh/api/v1
VITE_SITE_URL=https://tgmall.kh
```

## 二、依赖服务

| 服务 | 用途 | 备注 |
|------|------|------|
| PostgreSQL 16+ | 主数据库 | Prisma ORM 需要 |
| Redis 7+ | 缓存 + 分布式锁 + 幂等标记 | | 支付回调必备 |
| Telegram Bot API | Bot 通知 + Mini App 认证 | BotFather 创建 |

## 三、部署流程

### 1. 数据库

```bash
cd tgmall-api

# 首次部署：创建数据库
npx prisma db push

# 已有数据库：运行迁移
npx prisma migrate deploy

# 导入种子数据（城市、品类、配送规则、客服）
npx prisma db seed
```

### 2. 后端（Railway / Docker）

```bash
cd tgmall-api

# 安装依赖
npm ci --production

# 启动
npm start
# 默认端口 3000，健康检查 GET /api/v1/health
```

**Health Check:** `GET /api/v1/health` → `{ "ok": true, "db": "connected", "redis": "connected" }`

### 3. 前端

```bash
cd tgmall-miniapp

# 安装依赖
npm ci

# 构建生产版本
npm run build

# 部署 dist/ 到 CloudFlare Pages / Nginx
```

**Nginx 配置要点：**

```nginx
# SPA fallback
location / {
  try_files $uri $uri/ /index.html;
}

# API 反向代理（可选）
location /api/v1/ {
  proxy_pass http://backend:3000;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

# 静态资源缓存
location /assets/ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

### 4. 管理后台

```bash
cd tgmall-admin

# 安装依赖
npm ci

# 构建
npm run build

# 部署 dist/ 同上
```

## 四、回滚方案

### 代码回滚

```bash
# 回滚到上一个稳定版本
git revert HEAD --no-edit
git push origin main
# Railway / CloudFlare 自动重新部署

# 或指定具体 commit
git reset --hard <stable-commit>
git push --force-with-lease origin main
```

### 数据库回滚

```bash
cd tgmall-api

# 回滚最近一次 migration
npx prisma migrate down 1

# 或手动执行 SQL 回滚（推荐有备份）
```

### 回滚检查清单

- [ ] 数据库 schema 兼容性（回滚 migration 不会删数据）
- [ ] API 版本兼容（前端向后兼容至少 1 个版本）
- [ ] Redis 缓存失效（`redis-cli FLUSHDB` 清除应用缓存）
- [ ] CDN 缓存刷新（CloudFlare Purge Everything）

## 五、监控告警

### 关键指标

| 指标 | 来源 | 告警阈值 |
|------|------|---------|
| API 响应时间 P95 | Railway Metrics | > 2s |
| 支付回调失败率 | `payment:callback:error:*` 计数器 | > 0 in 5min |
| 5xx 错误率 | Railway Metrics | > 1% |
| DB 连接池使用率 | Prisma 日志 | > 80% |
| Redis 连接状态 | Health Check | DISCONNECTED |
| 未处理异常 | 全局 error handler | any |

### 日志

```bash
# 查看 Railway 日志
railway logs --service tgmall-api

# 查看最近 100 行
railway logs --service tgmall-api --lines 100

# 实时跟踪
railway logs --service tgmall-api --follow
```

## 六、测试

```bash
# 运行全部后端测试
cd tgmall-api
npm test

# 预期输出: 207 tests, 27 suites, all green

# 运行前端构建检查
cd tgmall-miniapp
npm run build   # 无报错即可

# 运行管理后台构建检查
cd tgmall-admin
npm run build   # 无报错即可
```

## 七、紧急联系人

- **开发负责人**：qinzhizheng
- **Telegram Bot**: @xhzmall_bot
- **柬埔寨支付支持**：Bakong API Support / ABA Pay Merchant Support
