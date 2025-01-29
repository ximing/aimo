#!/bin/bash

# 检查是否安装了必要的工具
if ! command -v psql &> /dev/null; then
    echo "❌ Error: PostgreSQL client (psql) is not installed"
    echo "Please install PostgreSQL client tools:"
    echo "  macOS:    brew install postgresql"
    echo "  Ubuntu:   sudo apt-get install postgresql-client"
    echo "  Windows:  scoop install postgresql"
    exit 1
fi

# 获取环境变量
if [ ! -f .env.test ]; then
    echo "❌ Error: .env.test file not found"
    exit 1
fi

source .env.test

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL is not set in .env.test"
    exit 1
fi

# 从 DATABASE_URL 解析数据库信息
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "📦 Creating test database..."

# 创建数据库
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" || {
    echo "❌ Error: Failed to drop database"
    exit 1
}

PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;" || {
    echo "❌ Error: Failed to create database"
    exit 1
}

echo "✅ Database created successfully"

echo "🔧 Enabling pgvector extension..."

# 启用 pgvector 扩展
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS vector;" || {
    echo "❌ Error: Failed to enable pgvector extension"
    exit 1
}

echo "✅ pgvector extension enabled"
echo "✨ Database setup completed successfully"