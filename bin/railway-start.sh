#!/bin/sh
set -e

echo "=== TG Mall Railway 启动 ==="

# 1. 运行数据库迁移
echo "--- 运行 Prisma Migration ---"
cd /app && npx prisma migrate deploy

# 2. 启动 Nginx + Node.js（supervisord 管理）
echo "--- 启动服务 ---"
exec supervisord -c /etc/supervisord.conf
