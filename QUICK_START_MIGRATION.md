# Quick Start: Docker Migration

快速指南：如何在 Docker 环境中运行数据库迁移。

## 🚀 最简单的方式（推荐）

使用 Makefile 一键完成所有迁移：

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置 MySQL 和其他配置

# 2. 运行所有迁移
make -f Makefile.migrate migrate-all

# 3. 验证迁移结果
make -f Makefile.migrate verify

# 4. 启动应用
docker-compose up -d
```

## 📋 分步执行

如果你想分步执行每个迁移：

```bash
# 步骤 1: 启动 MySQL
make -f Makefile.migrate migrate-mysql-up

# 步骤 2: 运行 Schema 迁移（创建表结构）
make -f Makefile.migrate migrate-schema

# 步骤 3: 迁移数据（从 LanceDB 到 MySQL）
make -f Makefile.migrate migrate-data

# 步骤 4: 清理迁移容器
make -f Makefile.migrate migrate-clean
```

## 🔍 验证迁移

```bash
# 查看所有表
make -f Makefile.migrate mysql-shell
> SHOW TABLES;
> SELECT COUNT(*) FROM memos;
> exit

# 或使用验证命令
make -f Makefile.migrate verify
```

## 📝 环境变量配置

创建 `.env` 文件：

```env
# MySQL 配置
MYSQL_ROOT_PASSWORD=aimo_root_password
MYSQL_DATABASE=aimo
MYSQL_USER=aimo
MYSQL_PASSWORD=aimo_password
MYSQL_HOST=mysql
MYSQL_PORT=3306

# LanceDB 配置
LANCEDB_STORAGE_TYPE=local
LANCEDB_PATH=./lancedb_data

# 应用配置
JWT_SECRET=your-super-secret-key-at-least-32-characters-long
OPENAI_API_KEY=sk-xxx
```

## 🎯 三个迁移命令说明

### 1. migrate:generate（开发用）
生成新的 Drizzle 迁移文件（修改 schema 后使用）

```bash
# 通常不需要在生产环境运行
pnpm --filter @aimo/server migrate:generate
```

### 2. migrate（必须）
运行 Drizzle 迁移，创建 MySQL 表结构

```bash
make -f Makefile.migrate migrate-schema
```

**作用：**
- 创建所有 MySQL 表（users, memos, categories, tags, etc.）
- 创建索引和外键约束
- 记录迁移历史

### 3. migrate:data（一次性）
从 LanceDB 迁移数据到 MySQL

```bash
make -f Makefile.migrate migrate-data
```

**作用：**
- 读取 LanceDB 中的所有标量数据
- 插入到 MySQL 对应的表中
- LanceDB 表保持不变（仍包含完整数据）
- 可以安全地多次运行（跳过已存在的记录）

## ⚠️ 重要提示

1. **数据备份**
   ```bash
   # 备份 LanceDB 数据
   cp -r lancedb_data lancedb_data.backup

   # 备份 MySQL（如果已有数据）
   docker exec aimo-mysql mysqldump -uaimo -paimo_password aimo > backup.sql
   ```

2. **迁移顺序**
   - 必须先运行 `migrate-schema`（创建表）
   - 再运行 `migrate-data`（迁移数据）
   - 顺序不能颠倒！

3. **LanceDB 数据**
   - LanceDB 表不会被删除或修改
   - 仍然包含完整的数据（标量 + 向量）
   - 向量搜索仍然使用 LanceDB

4. **干运行模式**
   ```bash
   # 先预览迁移，不实际写入
   make -f Makefile.migrate migrate-data-dry-run
   ```

## 🐛 故障排查

### MySQL 连接失败

```bash
# 检查 MySQL 状态
docker-compose -f docker-compose.migrate.yml ps

# 查看 MySQL 日志
make -f Makefile.migrate mysql-logs

# 测试连接
docker exec aimo-mysql mysqladmin ping -h localhost
```

### 迁移失败

```bash
# 查看迁移日志
make -f Makefile.migrate migrate-logs

# 进入 MySQL 检查
make -f Makefile.migrate mysql-shell
> SHOW TABLES;
> SELECT * FROM __drizzle_migrations;
```

### 重新开始

```bash
# 清理所有内容（危险！）
docker-compose -f docker-compose.migrate.yml down -v
docker volume rm aimo_mysql_data

# 重新开始
make -f Makefile.migrate migrate-all
```

## 📚 完整文档

详细文档请查看：
- [DOCKER_MIGRATION_GUIDE.md](./DOCKER_MIGRATION_GUIDE.md) - 完整迁移指南
- [ARCHITECTURE_UPDATE.md](./apps/server/ARCHITECTURE_UPDATE.md) - 架构说明

## 🎉 成功标志

迁移成功后，你应该看到：

```bash
✅ MySQL is ready
✅ Schema migrations completed
✅ Data migration completed
✅ All migrations completed successfully!
```

然后可以启动应用：

```bash
docker-compose up -d
curl http://localhost:3000/health
```

## 💡 提示

- 使用 `make -f Makefile.migrate help` 查看所有可用命令
- 迁移过程中保持终端打开，观察日志输出
- 第一次迁移可能需要几分钟，取决于数据量
- 迁移是幂等的，可以安全地多次运行
