#!/bin/sh
set -e

echo "=== TG Mall Railway 启动 ==="

# 检查必要环境变量（Node.js 启动前友好提示）
for var in DATABASE_URL REDIS_URL BOT_TOKEN JWT_SECRET BAKONG_WEBHOOK_SECRET ABA_PAY_SECRET WING_PAY_SECRET; do
  if [ -z "$(eval echo \$$var)" ]; then
    echo "❌ 缺少必要的环境变量: $var"
    echo "请在 Railway Dashboard → Variables 中配置"
    exit 1
  fi
done

# 1. 运行数据库迁移（带超时，防止无限卡住）
echo "--- 运行 Prisma Migration ---"
cd /app
timeout 60 npx prisma migrate deploy || {
  echo "⚠️ 数据库迁移失败（超时或连接错误），跳过迁移继续启动..."
  echo "请检查 DATABASE_URL 是否正确，以及 Railway Postgres 是否已绑定"
}

# 2. 配置 Nginx 监听 Railway 分配的 PORT（默认 8080）
NGINX_PORT=${PORT:-8080}
echo "--- Nginx 将监听端口: $NGINX_PORT ---"

# Alpine 没有 envsubst，用 sed 替换端口变量
sed -i "s/\$NGINX_PORT/$NGINX_PORT/g" /etc/nginx/http.d/default.conf

# 验证 Nginx 配置语法
echo "--- 验证 Nginx 配置 ---"
nginx -t || {
  echo "❌ Nginx 配置验证失败"
  exit 1
}

# 3. 启动 Nginx + Node.js（supervisord 管理）
echo "--- 启动服务 ---"
exec supervisord -c /etc/supervisord.conf
