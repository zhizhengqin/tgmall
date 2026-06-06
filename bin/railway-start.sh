#!/bin/sh
set -e

echo "=== TG Mall Railway 启动 ==="

# 检查必要环境变量（Node.js 启动前友好提示）
for var in DATABASE_URL REDIS_URL BOT_TOKEN JWT_SECRET; do
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
sed -i "s/\$NGINX_PORT/$NGINX_PORT/g" /etc/nginx/http.d/default.conf

# 验证 Nginx 配置语法
echo "--- 验证 Nginx 配置 ---"
nginx -t || {
  echo "❌ Nginx 配置验证失败"
  exit 1
}

# 3. 启动 Node.js（后台 + 自动重启循环）
echo "--- 启动 Node.js (端口 3001) ---"
(
  while true; do
    echo "[$(date)] Node.js 启动中..."
    node src/index.js || true
    echo "[$(date)] Node.js 异常退出，3秒后重启..."
    sleep 3
  done
) &

# 4. 启动 Nginx（前台，阻塞主进程）
echo "--- 启动 Nginx ---"
exec nginx -g "daemon off;"
