#!/bin/bash
set -e

# 加载环境变量
if [ -f .env.development ]; then
  export $(cat .env.development | grep -v '^#' | xargs)
fi

# 数据库连接信息
DB_USER=$(echo $DATABASE_URL | sed -n 's/^postgres:\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/^postgres:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/^postgres:\/\/[^@]*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/^postgres:\/\/[^@]*@[^:]*:\([^/]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/^postgres:\/\/[^@]*@[^/]*\/\([^?]*\).*/\1/p')

# 检查必要的环境变量
if [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ] || [ -z "$DB_NAME" ]; then
  echo "Error: Missing database configuration in DATABASE_URL"
  exit 1
fi

if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo "Error: Missing admin configuration (ADMIN_EMAIL or ADMIN_PASSWORD)"
  exit 1
fi

# 检查 psql 命令是否可用
if ! command -v psql &> /dev/null; then
  echo "Error: psql command not found. Please install PostgreSQL client."
  exit 1
fi

# 检查数据库是否存在
DB_EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

# 如果数据库不存在，创建数据库
if [ -z "$DB_EXISTS" ]; then
  echo "Creating database $DB_NAME..."
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE \"$DB_NAME\""
fi

# 连接到数据库并执行初始化
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
-- 创建扩展（如果需要）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
EOF

echo "Database initialization completed successfully!"