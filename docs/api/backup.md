# Backup API

Base URL: `/api/v1/backup`

备份管理相关的 API 端点，用于管理数据备份。

**认证要求：** 所有端点都需要有效的 JWT token（需要管理员权限）

---

## Endpoints

### 1. Get Backup Status

**GET** `/api/v1/backup/status`

获取备份服务状态信息。

#### Request

**Headers:**

| Header | Required | Description |
| ------ | -------- | ----------- |
| Authorization | Yes | JWT Token |

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
      "enabled": true,
      "lastBackupAt": 1704067200000,
      "nextBackupAt": 1704153600000,
      "backupCount": 10,
      "status": "idle",
      "storage": {
        "type": "local",
        "path": "./backups"
      }
    }
  }
}
```

**Response Fields:**

| Field | Type | Description |
| ----- | ---- | ----------- |
| enabled | boolean | 备份是否启用 |
| lastBackupAt | number | 上次备份时间戳 |
| nextBackupAt | number | 下次备份时间戳 |
| backupCount | number | 备份数量 |
| status | string | 备份状态 (idle/running/error) |
| storage.type | string | 存储类型 (local/s3) |
| storage.path | string | 存储路径 |

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 401    | 未授权      |
| 500    | 获取状态失败 |

---

### 2. Force Backup

**POST** `/api/v1/backup/force`

手动触发一次完整备份（绕过节流限制）。

#### Request

**Headers:**

| Header | Required | Description |
| ------ | -------- | ----------- |
| Authorization | Yes | JWT Token |

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

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 401    | 未授权      |
| 500    | 触发备份失败 |

---

### 3. Cleanup Old Backups

**POST** `/api/v1/backup/cleanup`

清理旧的备份文件（根据保留策略）。

#### Request

**Headers:**

| Header | Required | Description |
| ------ | -------- | ----------- |
| Authorization | Yes | JWT Token |

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

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 401    | 未授权      |
| 500    | 清理失败    |

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

**注意:** 这些端点需要管理员权限才能访问。

---

## 备份策略说明

- **自动备份**: 系统会根据配置的调度自动执行备份
- **手动备份**: 可以通过 `force` 端点手动触发备份
- **保留策略**: 系统会根据配置保留一定数量的备份，超出的会被自动清理

---

## Error Codes Reference

| Code | HTTP Status | Meaning                 |
| ---- | ---------- | ----------------------- |
| 4010 | 401        | UNAUTHORIZED - 未授权   |
| 5001 | 500        | DB_ERROR - 数据库错误   |
