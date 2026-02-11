# LanceDB 自动备份系统

## 概述

AIMO 服务器集成了一套完整的 LanceDB 自动备份系统，可以在数据变更时自动触发备份操作。该系统支持多种存储后端（本地文件系统、AWS S3、阿里 OSS），并具备智能截流和数据保留策略。

## 功能特性

- **事件驱动备份**：在用户、笔记创建/更新/删除时自动触发备份
- **智能截流**：可配置的最小备份间隔，避免频繁备份
- **多存储支持**：本地文件系统、AWS S3、阿里 OSS（S3 兼容）
- **自动压缩**：tar.gz 格式压缩备份，节省存储空间
- **日期分组**：按 `YYYY-MM-DD` 格式组织备份文件
- **智能保留策略**：支持按数量和按天数保留备份
- **独立处理**：备份操作异步执行，不阻塞主线程
- **并发安全**：规避 OSS 条件 PUT 限制下的并发写入问题

## 系统架构

### 核心模块

1. **BackupService** (`src/services/backup.service.ts`)
   - 核心备份服务，管理备份触发和调度
   - 实现事件驱动和截流机制
   - 状态管理和错误处理

2. **BackupExecutor** (`src/services/backup-executor.ts`)
   - 备份执行引擎
   - 数据导出、压缩、上传
   - 旧备份清理

3. **存储适配器** (`src/sources/storage-adapter/`)
   - `base.adapter.ts` - 基类定义
   - `local.adapter.ts` - 本地文件系统
   - `s3.adapter.ts` - AWS S3 和 S3 兼容服务
   - `oss.adapter.ts` - 阿里 OSS
   - `factory.ts` - 工厂类

4. **数据模型集成**
   - `MemoService` - 笔记数据变更时触发备份
   - `UserService` - 用户数据变更时触发备份

## 配置说明

### 环境变量

```bash
# 启用备份功能
BACKUP_ENABLED=true

# 备份存储类型：local, s3, oss
BACKUP_STORAGE_TYPE=local

# 最小备份间隔（毫秒，默认 3600000 = 1小时）
BACKUP_THROTTLE_INTERVAL_MS=3600000

# 备份保留策略
BACKUP_MAX_COUNT=10        # 最多保留 10 个备份
BACKUP_MAX_DAYS=30         # 保留 30 天内的备份

# 本地存储配置
BACKUP_LOCAL_PATH=./backups

# S3 存储配置
BACKUP_STORAGE_TYPE=s3
BACKUP_S3_BUCKET=my-bucket
BACKUP_S3_PREFIX=backups
BACKUP_AWS_ACCESS_KEY_ID=your-key
BACKUP_AWS_SECRET_ACCESS_KEY=your-secret
BACKUP_AWS_REGION=us-east-1
BACKUP_S3_ENDPOINT=http://minio:9000  # 可选：S3 兼容服务端点

# OSS 存储配置
BACKUP_STORAGE_TYPE=oss
BACKUP_OSS_BUCKET=my-bucket
BACKUP_OSS_PREFIX=backups
BACKUP_OSS_ACCESS_KEY_ID=your-key-id
BACKUP_OSS_ACCESS_KEY_SECRET=your-key-secret
BACKUP_OSS_REGION=cn-hangzhou
BACKUP_OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
```

## 工作流程

### 1. 自动备份流程

```
数据变更（创建/更新/删除）
    ↓
MemoService/UserService 捕捉变更事件
    ↓
调用 BackupService.triggerBackup()
    ↓
检查截流机制（距离上次备份是否超过最小间隔）
    ↓
如果满足条件，异步执行 BackupExecutor
    ├─ 导出 LanceDB 数据
    ├─ 压缩为 tar.gz
    ├─ 上传到存储服务
    └─ 清理旧备份
```

### 2. 备份文件结构

```
存储路径: {prefix}/{YYYY-MM-DD}/backup_{YYYY-MM-DD}_{HH-mm-ss}_{timestamp}.tar.gz

示例:
- backups/2025-02-10/backup_2025-02-10_14-30-45_1707580245000.tar.gz
- backups/2025-02-11/backup_2025-02-11_09-15-30_1707653730000.tar.gz
```

## API 端点

### 获取备份状态

```bash
GET /api/v1/backup/status

响应示例:
{
  "code": 0,
  "data": {
    "backup": {
      "enabled": true,
      "inProgress": false,
      "lastBackupTime": 1707580245000,
      "throttleInterval": 3600000
    }
  }
}
```

### 手动触发备份

```bash
POST /api/v1/backup/force

响应示例:
{
  "code": 0,
  "data": {
    "message": "Backup started successfully"
  }
}
```

### 清理旧备份

```bash
POST /api/v1/backup/cleanup

响应示例:
{
  "code": 0,
  "data": {
    "message": "Backup cleanup completed"
  }
}
```

## 存储配置详解

### 本地存储

最简单的配置，适合开发和测试环境。

```bash
BACKUP_ENABLED=true
BACKUP_STORAGE_TYPE=local
BACKUP_LOCAL_PATH=./backups
```

备份文件将存储在 `./backups` 目录下，按日期分组。

### AWS S3

适用于 AWS 环境或任何 S3 兼容的服务。

```bash
BACKUP_ENABLED=true
BACKUP_STORAGE_TYPE=s3
BACKUP_S3_BUCKET=my-bucket
BACKUP_S3_PREFIX=backups
BACKUP_AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
BACKUP_AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
BACKUP_AWS_REGION=us-east-1
```

### 阿里 OSS

专为阿里云对象存储服务优化。

```bash
BACKUP_ENABLED=true
BACKUP_STORAGE_TYPE=oss
BACKUP_OSS_BUCKET=my-bucket
BACKUP_OSS_PREFIX=backups
BACKUP_OSS_ACCESS_KEY_ID=LTAI5txxxxxx
BACKUP_OSS_ACCESS_KEY_SECRET=xxxxxxxxxxxxxx
BACKUP_OSS_REGION=cn-hangzhou
# 可选：自定义端点，如私有域名
BACKUP_OSS_ENDPOINT=my-oss-domain.com
```

### MinIO（S3 兼容服务）

用于本地或私有云 S3 兼容存储。

```bash
BACKUP_ENABLED=true
BACKUP_STORAGE_TYPE=s3
BACKUP_S3_BUCKET=my-bucket
BACKUP_S3_PREFIX=backups
BACKUP_AWS_ACCESS_KEY_ID=minioadmin
BACKUP_AWS_SECRET_ACCESS_KEY=minioadmin
BACKUP_AWS_REGION=us-east-1
BACKUP_S3_ENDPOINT=http://minio:9000
```

## 触发机制

### 自动触发场景

备份会在以下场景下自动触发（受截流限制）：

1. **笔记操作**
   - 创建笔记 (`memo_created`)
   - 更新笔记 (`memo_updated`)
   - 删除笔记 (`memo_deleted`)

2. **用户操作**
   - 创建用户 (`user_created`)
   - 更新用户 (`user_updated`)
   - 删除用户 (`user_deleted`)

### 手动触发

通过 API 端点 `POST /api/v1/backup/force` 手动触发备份，绕过截流限制。

### 截流机制

为了避免频繁备份导致的性能问题，系统实现了截流机制：

- **最小备份间隔**：可通过 `BACKUP_THROTTLE_INTERVAL_MS` 配置（默认 1 小时）
- **多次触发**：如果在间隔内多次触发备份请求，只有第一个请求会执行
- **异步执行**：备份执行不阻塞主线程，业务操作正常进行

示例配置：

```bash
# 每 30 分钟最多备份一次
BACKUP_THROTTLE_INTERVAL_MS=1800000

# 每 1 小时最多备份一次（默认）
BACKUP_THROTTLE_INTERVAL_MS=3600000

# 每 6 小时最多备份一次
BACKUP_THROTTLE_INTERVAL_MS=21600000
```

## 保留策略

系统支持两种保留策略的组合使用：

### 按数量保留

```bash
BACKUP_MAX_COUNT=10
```

保留最近的 10 个备份，超过数量的旧备份会被删除。

### 按天数保留

```bash
BACKUP_MAX_DAYS=30
```

保留 30 天内的备份，超过 30 天的备份会被删除。

### 组合使用

两种策略可同时配置，系统会同时应用两个条件：

```bash
BACKUP_MAX_COUNT=10
BACKUP_MAX_DAYS=30
```

这样配置会保留最近 10 个备份，且仅保留 30 天内的备份。

## 并发安全性

### OSS 条件 PUT 问题

阿里 OSS 不支持条件 PUT 操作（如 ETag 校验），这在高并发场景下可能导致数据冲突。本备份系统通过以下机制规避该问题：

1. **截流限制**：限制备份频率，减少并发操作
2. **异步处理**：备份在独立流程中处理，不与业务逻辑竞争
3. **原子性保证**：备份完成后再清理旧备份，确保数据完整性

### 并发备份限制

系统不允许并发备份操作：

```typescript
if (this.backupInProgress) {
  console.log('Backup already in progress, skipping new backup request');
  return;
}
```

## 监控和维护

### 检查备份状态

```bash
curl http://localhost:3000/api/v1/backup/status
```

### 查看备份日志

- 本地存储：检查 `./backups` 目录结构
- S3/OSS：使用对应的云服务控制台或 CLI 工具

### 手动清理旧备份

```bash
curl -X POST http://localhost:3000/api/v1/backup/cleanup
```

## 故障排查

### 问题：备份未触发

**可能原因**：

1. `BACKUP_ENABLED` 未设为 `true`
2. 距离上次备份未超过 `BACKUP_THROTTLE_INTERVAL_MS`
3. 已有备份在进行中

**解决**：

1. 检查配置
2. 使用 `POST /api/v1/backup/force` 手动触发
3. 查看日志排查备份进度

### 问题：备份上传失败

**可能原因**：

1. 存储服务凭证错误
2. 存储服务连接失败
3. 权限不足

**解决**：

1. 验证 S3/OSS 凭证
2. 检查网络连接和端点配置
3. 验证 IAM/RAM 权限

### 问题：磁盘空间不足

**可能原因**：

1. 备份文件过大
2. 保留策略配置过宽松
3. 本地备份路径磁盘已满

**解决**：

1. 调整 `BACKUP_MAX_COUNT` 或 `BACKUP_MAX_DAYS`
2. 使用远程存储（S3/OSS）
3. 手动清理旧备份

## 扩展指南

### 添加新的存储适配器

1. 继承 `BaseStorageAdapter`
2. 实现 `StorageAdapter` 接口的所有方法
3. 在 `StorageAdapterFactory` 中注册新类型
4. 扩展配置类型

示例：

```typescript
export class CustomStorageAdapter extends BaseStorageAdapter {
  async uploadFile(key: string, buffer: Buffer): Promise<void> {
    // 实现上传逻辑
  }

  async downloadFile(key: string): Promise<Buffer> {
    // 实现下载逻辑
  }

  // 实现其他接口方法...
}
```

## 性能考虑

- **备份大小**：LanceDB 数据库大小直接影响备份时间和存储空间
- **压缩率**：tar.gz 压缩通常能达到 50-80% 的压缩率
- **网络带宽**：上传到远程存储受网络带宽限制
- **存储成本**：使用云存储服务需要考虑存储成本和传输成本

## 最佳实践

1. **定期备份**：设置适当的备份间隔，如 1 小时
2. **远程存储**：使用 S3/OSS 等远程存储，不要仅依赖本地备份
3. **监控备份**：定期检查备份状态和日志
4. **测试恢复**：定期测试备份的恢复流程
5. **文档维护**：记录备份配置和恢复步骤

## 参考

- AWS S3 SDK：https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/
- 阿里 OSS：https://help.aliyun.com/document_detail/32087.html
- Archiver 库：https://www.archiverjs.com/
- LanceDB：https://lancedb.com/
