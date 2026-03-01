# Docker Migration Guide

This guide explains how to run database migrations in Docker environment.

## Overview

After building the Docker image, you need to run three types of migrations:

1. **migrate:generate** - Generate new Drizzle migration files (development only)
2. **migrate** - Run pending Drizzle migrations to create/update MySQL schema
3. **migrate:data** - One-time migration of data from LanceDB to MySQL

## Prerequisites

1. Docker and Docker Compose installed
2. `.env` file configured with required variables
3. LanceDB data directory available (if migrating existing data)

## Environment Variables

Create a `.env` file in the project root:

```env
# MySQL Configuration
MYSQL_ROOT_PASSWORD=aimo_root_password
MYSQL_DATABASE=aimo
MYSQL_USER=aimo
MYSQL_PASSWORD=aimo_password
MYSQL_HOST=mysql
MYSQL_PORT=3306

# LanceDB Configuration
LANCEDB_STORAGE_TYPE=local
LANCEDB_PATH=./lancedb_data

# Required for server
JWT_SECRET=your-super-secret-key-at-least-32-characters-long
OPENAI_API_KEY=sk-xxx
```

## Migration Methods

### Method 1: Using Docker Compose (Recommended)

#### Step 1: Start MySQL

```bash
# Start MySQL service
docker compose -f docker-compose.migrate.yml up -d mysql

# Wait for MySQL to be ready (check health)
docker compose -f docker-compose.migrate.yml ps
```

#### Step 2: Run Drizzle Migrations

```bash
# Run pending migrations to create MySQL schema
docker compose -f docker-compose.migrate.yml run --rm migrate \
  node apps/server/dist/scripts/docker-migrate.js migrate
```

#### Step 3: Migrate Data from LanceDB (One-time)

```bash
# Migrate existing data from LanceDB to MySQL
docker compose -f docker-compose.migrate.yml run --rm migrate \
  node apps/server/dist/scripts/docker-migrate.js migrate-data
```

#### Step 4: Clean Up

```bash
# Stop and remove migration containers
docker compose -f docker-compose.migrate.yml down
```

### Method 2: Using Docker Commands Directly

#### Step 1: Build Migration Image

```bash
docker build -f Dockerfile.migrate -t aimo-migrate:latest .
```

#### Step 2: Create Network and Start MySQL

```bash
# Create network
docker network create aimo-network

# Start MySQL
docker run -d \
  --name aimo-mysql \
  --network aimo-network \
  -e MYSQL_ROOT_PASSWORD=aimo_root_password \
  -e MYSQL_DATABASE=aimo \
  -e MYSQL_USER=aimo \
  -e MYSQL_PASSWORD=aimo_password \
  -p 3306:3306 \
  -v aimo_mysql_data:/var/lib/mysql \
  mysql:8.0

# Wait for MySQL to be ready
docker exec aimo-mysql mysqladmin ping -h localhost --silent
```

#### Step 3: Run Migrations

```bash
# Run Drizzle migrations
docker run --rm \
  --network aimo-network \
  -e MYSQL_HOST=aimo-mysql \
  -e MYSQL_PORT=3306 \
  -e MYSQL_USER=aimo \
  -e MYSQL_PASSWORD=aimo_password \
  -e MYSQL_DATABASE=aimo \
  -e JWT_SECRET=your-super-secret-key-at-least-32-characters-long \
  -e OPENAI_API_KEY=sk-xxx \
  -v $(pwd)/lancedb_data:/app/lancedb_data \
  aimo-migrate:latest \
  node apps/server/dist/scripts/docker-migrate.js migrate
```

#### Step 4: Migrate Data

```bash
# Migrate data from LanceDB to MySQL
docker run --rm \
  --network aimo-network \
  -e MYSQL_HOST=aimo-mysql \
  -e MYSQL_PORT=3306 \
  -e MYSQL_USER=aimo \
  -e MYSQL_PASSWORD=aimo_password \
  -e MYSQL_DATABASE=aimo \
  -e JWT_SECRET=your-super-secret-key-at-least-32-characters-long \
  -e OPENAI_API_KEY=sk-xxx \
  -e LANCEDB_PATH=/app/lancedb_data \
  -v $(pwd)/lancedb_data:/app/lancedb_data \
  aimo-migrate:latest \
  node apps/server/dist/scripts/docker-migrate.js migrate-data
```

### Method 3: Using Makefile (If Available)

```bash
# Run all migrations
make migrate

# Run only schema migrations
make migrate-schema

# Run only data migration
make migrate-data
```

## Migration Commands Explained

### 1. migrate:generate (Development Only)

Generates new Drizzle migration files based on schema changes.

```bash
# Not typically needed in production
docker compose -f docker-compose.migrate.yml run --rm migrate \
  node apps/server/dist/scripts/docker-migrate.js generate
```

**When to use:**
- After modifying Drizzle schema files in `apps/server/src/db/schema/`
- During development to create new migration files

**Output:**
- New migration files in `apps/server/drizzle/` directory

### 2. migrate

Runs pending Drizzle migrations to create/update MySQL schema.

```bash
docker compose -f docker-compose.migrate.yml run --rm migrate \
  node apps/server/dist/scripts/docker-migrate.js migrate
```

**When to use:**
- First deployment to create all MySQL tables
- After pulling new code with schema changes
- Before starting the application server

**What it does:**
- Creates tables: users, memos, categories, tags, memo_relations, attachments, etc.
- Creates indexes and foreign key constraints
- Tracks migration history in `__drizzle_migrations` table

### 3. migrate:data

One-time migration of existing data from LanceDB to MySQL.

```bash
docker compose -f docker-compose.migrate.yml run --rm migrate \
  node apps/server/dist/scripts/docker-migrate.js migrate-data
```

**When to use:**
- **ONLY ONCE** when migrating from LanceDB-only to hybrid MySQL+LanceDB architecture
- After running schema migrations (step 2)

**What it does:**
- Reads all scalar data from LanceDB tables
- Inserts scalar data into MySQL tables
- Preserves LanceDB tables unchanged (they still contain complete records)
- Idempotent: skips records that already exist in MySQL

**⚠️ Important:**
- Backup your LanceDB data before running!
- Run with `--dry-run` flag first to preview changes
- Can be run multiple times safely (skips existing records)

## Complete Migration Flow (New Deployment)

```bash
# 1. Clone repository
git clone <repo-url>
cd aimo

# 2. Configure environment
cp .env.example .env
# Edit .env with your values

# 3. Start MySQL
docker compose -f docker-compose.migrate.yml up -d mysql

# 4. Wait for MySQL to be ready
sleep 10

# 5. Run schema migrations
docker compose -f docker-compose.migrate.yml run --rm migrate \
  node apps/server/dist/scripts/docker-migrate.js migrate

# 6. Migrate existing data (if any)
docker compose -f docker-compose.migrate.yml run --rm migrate \
  node apps/server/dist/scripts/docker-migrate.js migrate-data

# 7. Start application
docker compose up -d

# 8. Verify
curl http://localhost:3000/health
```

## Troubleshooting

### MySQL Connection Failed

```bash
# Check MySQL is running
docker compose -f docker-compose.migrate.yml ps

# Check MySQL logs
docker compose -f docker-compose.migrate.yml logs mysql

# Test connection
docker exec aimo-mysql mysql -uaimo -paimo_password -e "SELECT 1"
```

### Migration Failed

```bash
# Check migration logs
docker compose -f docker-compose.migrate.yml logs migrate

# Manually connect to MySQL to check state
docker exec -it aimo-mysql mysql -uaimo -paimo_password aimo

# Check migration history
SELECT * FROM __drizzle_migrations;

# Reset migrations (DANGEROUS - only for development)
DROP DATABASE aimo;
CREATE DATABASE aimo;
```

### Data Migration Issues

```bash
# Run in dry-run mode first
docker compose -f docker-compose.migrate.yml run --rm migrate \
  tsx apps/server/src/scripts/migrate-lancedb-to-mysql.ts --dry-run

# Check specific table
docker exec -it aimo-mysql mysql -uaimo -paimo_password -e "SELECT COUNT(*) FROM aimo.memos"

# View migration stats
docker compose -f docker-compose.migrate.yml run --rm migrate \
  tsx apps/server/src/scripts/migrate-lancedb-to-mysql.ts --table=memos
```

## Production Deployment Checklist

- [ ] Backup LanceDB data directory
- [ ] Backup MySQL database (if exists)
- [ ] Configure `.env` with production values
- [ ] Run schema migrations first
- [ ] Test application startup
- [ ] Run data migration (if needed)
- [ ] Verify data integrity
- [ ] Monitor application logs
- [ ] Update DNS/load balancer to new deployment

## Rollback Plan

If migration fails:

```bash
# 1. Stop application
docker compose down

# 2. Restore MySQL backup (if needed)
docker exec -i aimo-mysql mysql -uaimo -paimo_password aimo < backup.sql

# 3. Restore LanceDB data (if modified)
rm -rf lancedb_data
cp -r lancedb_data.backup lancedb_data

# 4. Restart with previous version
git checkout <previous-version>
docker compose up -d
```

## Notes

- **LanceDB tables remain unchanged**: They still contain complete records (scalar + vector)
- **MySQL is the primary data source**: Used for all CRUD operations
- **Dual-write strategy**: Both databases are kept in sync
- **No downtime required**: Can run migrations before switching traffic
- **Idempotent migrations**: Safe to run multiple times

## Support

For issues or questions:
- Check logs: `docker compose logs`
- Review migration docs: `apps/server/MIGRATION.md`
- Open issue: https://github.com/ximing/aimo/issues
