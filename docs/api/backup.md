# Backup API

Base URL: `/api/v1/backup`

备份管理相关的 API 端点，用于管理数据备份和恢复。

**认证要求：** 所有端点都需要有效的 JWT token

**权限要求：** 仅管理员可访问（@Authorized）

---

## Endpoints

### 1. Get Backup Status

**GET** `/api/v1/backup/status`

获取备份服务的当前状态。

#### Request

**Headers:**

```bash
Authorization: Bearer <jwt_token>
```

**Example Request:**

```bash
curl -X GET http://localhost:3000/api/v1/backup/status \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "backup": {
      "lastBackupTime": 1704067200000,
      "lastBackupStatus": "success",
      "backupCount": 15,
      "nextScheduledBackup": 1704153600000,
      "isRunning": false,
      "backupPath": "/data/backups",
      "retentionDays": 30
    }
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| lastBackupTime | number | 最后一次备份时间戳（毫秒） |
| lastBackupStatus | string | 最后一次备份状态（success/failed） |
| backupCount | number | 备份文件总数 |
| nextScheduledBackup | number | 下一次计划备份的时间戳（毫秒） |
| isRunning | boolean | 备份是否正在进行中 |
| backupPath | string | 备份存储路径 |
| retentionDays | number | 备份保留天数 |

**Error Responses:**

| HTTP Status | Description |
|------------|-------------|
| 401 | 未授权或非管理员 |
| 500 | 数据库或系统错误 |

---

### 2. Force Backup

**POST** `/api/v1/backup/force`

立即触发手动备份，绕过节流机制。

#### Request

**Headers:**

```bash
Authorization: Bearer <jwt_token>
```

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/v1/backup/force \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "Backup started successfully"
  }
}
```

备份将在后台异步执行，此端点返回表示备份任务已启动。

**Error Responses:**

| HTTP Status | Description |
|------------|-------------|
| 401 | 未授权或非管理员 |
| 500 | 备份启动失败 |

---

### 3. Cleanup Old Backups

**POST** `/api/v1/backup/cleanup`

根据保留策略清理旧备份文件。

#### Request

**Headers:**

```bash
Authorization: Bearer <jwt_token>
```

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/v1/backup/cleanup \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "Backup cleanup completed"
  }
}
```

清理操作将删除超过保留期的备份文件。

**Error Responses:**

| HTTP Status | Description |
|------------|-------------|
| 401 | 未授权或非管理员 |
| 500 | 清理失败 |

---

## Authentication

所有端点都需要有效的 JWT token。在请求头中包含：

```bash
Authorization: Bearer <jwt_token>
```

或通过 Cookie 自动发送：

```
Cookie: aimo_token=<jwt_token>
```

---

## Authorization

这些端点仅限于具有管理员权限的用户访问。系统将检查用户的授权状态（@Authorized）。

如果没有足够的权限，将返回 401 Unauthorized。

---

## Backup Strategy

### 自动备份

系统通常会根据配置自动进行定期备份：
- 可能每天执行一次
- 或在关键操作后自动执行

### 手动备份

通过 `/force` 端点可以随时触发备份，用于：
- 在进行重要操作前手动备份
- 绕过自动备份的频率限制

### 备份保留

通过 `/cleanup` 端点清理旧备份：
- 根据配置的 `retentionDays` 参数删除超期备份
- 定期执行以节省存储空间

---

## Notes

- 备份操作是后台异步执行的
- 备份路径和保留策略由后端配置管理
- 备份文件包含用户的所有数据（笔记、分类、附件元数据等）
- 大型数据库的备份可能需要一定时间

---

## Error Codes Reference

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| 4010 | 401 | UNAUTHORIZED - 未授权或无管理员权限 |
| 5001 | 500 | DB_ERROR - 数据库错误 |

