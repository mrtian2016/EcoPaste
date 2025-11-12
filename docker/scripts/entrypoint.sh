#!/bin/bash
set -e

# 创建统一的数据目录结构
mkdir -p /ecopaste/data \
         /ecopaste/logs/app \
         /ecopaste/logs/nginx \
         /ecopaste/logs/supervisord \
         /ecopaste/uploads

# 设置目录权限
chown -R root:root /ecopaste
chmod -R 755 /ecopaste

# 生成 .env 文件
cat > /app/backend/.env <<EOF
HOST=${HOST:-0.0.0.0}
PORT=${PORT:-5281}
DEBUG=${DEBUG:-False}
LOG_LEVEL=${LOG_LEVEL:-INFO}
DATABASE_PATH=/ecopaste/data/clipboard.db
LOG_PATH=/ecopaste/logs/app
UPLOAD_DIR=/ecopaste/uploads
EOF

echo "✓ 生成 .env 配置文件"
cat /app/backend/.env

python /app/backend/scripts/create_admin.py

# 启动 supervisord（后台运行）
/usr/bin/supervisord -c /etc/supervisord.conf

# 等待服务启动
sleep 2

# 检查服务状态
supervisorctl -c /etc/supervisord.conf status

# 确保日志文件存在并监控它（保持容器运行）
touch -a /ecopaste/logs/fastapi.out.log
tail -f /ecopaste/logs/fastapi.out.log /ecopaste/logs/fastapi.err.log