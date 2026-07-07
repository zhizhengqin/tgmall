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

# 1. 运行数据库迁移 + 种子默认管理员
echo "--- 同步数据库 Schema ---"
cd /app
timeout 60 npx prisma db push --skip-generate || {
  echo "⚠️ 数据库同步失败，跳过继续启动..."
}

echo "--- 种子默认管理员 ---"
node src/seed-admin.js || echo "⚠️ 种子脚本执行失败"

# 2. 动态生成 Nginx 配置
# Railway 可能从 PORT 环境变量或 EXPOSE 推断端口，也可能默认转发到 3000
# 为保险起见，同时监听分配的端口 + 3000
NGINX_PORT=${PORT:-8080}
echo "--- Nginx 将监听端口: $NGINX_PORT ---"

# 构建 listen 指令（避免重复端口）
LISTEN_DIRECTIVES="    listen ${NGINX_PORT};"
if [ "$NGINX_PORT" != "3000" ]; then
  LISTEN_DIRECTIVES="${LISTEN_DIRECTIVES}
    listen 3000;"
  echo "--- 额外监听备用端口: 3000 ---"
fi

cat > /etc/nginx/http.d/default.conf <<EOF
# Railway Nginx 配置 — 单容器托管 API + 所有前端
server {
${LISTEN_DIRECTIVES}

    # ── 后端 API ──
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # ── 健康检查 ──
    location /api/v1/health {
        proxy_pass http://127.0.0.1:3001/api/v1/health;
    }

    # ── 扫码落地页 ──
    location /go {
        proxy_pass http://127.0.0.1:3001/go;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # ── Mini App (消费者端) — Telegram 打开时使用 ──
    location / {
        root /usr/share/nginx/html/miniapp;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # ── 商家后台 → 301 重定向到运营后台 ──
    location /merchant/ {
        return 301 \$scheme://\$host/admin/\$is_args\$args;
    }

    # ── 运营后台 ──
    location /admin/ {
        alias /usr/share/nginx/html/admin/;
        try_files \$uri \$uri/ /admin/index.html;
    }
}
EOF

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
    API_PORT=3001 node src/index.js || true
    echo "[$(date)] Node.js 异常退出，3秒后重启..."
    sleep 3
  done
) &

# 4. 启动 Nginx（前台，阻塞主进程）
echo "--- 启动 Nginx ---"
exec nginx -g "daemon off;"
