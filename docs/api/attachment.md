# Attachment API

Base URL: `/api/v1/attachments`

文件附件相关的 API 端点，包括文件上传、获取和删除功能。

---

## Endpoints

### 1. Upload Attachment

**POST** `/api/v1/attachments/upload`

上传文件附件。

**认证要求：** 需要有效的 JWT token

#### Request

**Headers:**

```bash
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Form Data:**

| Field     | Type   | Required | Description                      |
| --------- | ------ | -------- | -------------------------------- |
| file      | binary | Yes      | 要上传的文件                     |
| createdAt | number | No       | 创建时间戳（毫秒），用于导入场景 |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/v1/attachments/upload \
  -H "Authorization: Bearer <jwt_token>" \
  -F "file=@/path/to/file.pdf"
```

使用 createdAt 参数（用于导入）：

```bash
curl -X POST http://localhost:3000/api/v1/attachments/upload \
  -H "Authorization: Bearer <jwt_token>" \
  -F "file=@/path/to/file.pdf" \
  -F "createdAt=1704067200000"
```

#### Response

**Success Response (200 OK):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "File uploaded successfully",
    "attachment": {
      "id": "attachments/file_123456",
      "filename": "file.pdf",
      "size": 102400,
      "mimeType": "application/pdf",
      "uid": "user_123456",
      "createdAt": 1704067200000,
      "updatedAt": 1704067200000
    }
  }
}
```

**Error Responses:**

| Error Code | HTTP Status | Description      |
| ---------- | ----------- | ---------------- |
| 4001       | 400         | 未上传文件       |
| 4019       | 413         | 文件过大         |
| 4018       | 415         | 不支持的文件类型 |
| 5003       | 500         | 存储错误         |
| 5000       | 500         | 系统错误         |

**File Size Limit:** 取决于配置，默认值需参考后端 config

**Allowed MIME Types:** 需参考后端 config 的 `allowedMimeTypes` 配置

---

### 2. Get Attachments (List)

**GET** `/api/v1/attachments`

获取当前用户的文件列表，支持分页。

**认证要求：** 需要有效的 JWT token

#### Request

**Headers:**

```bash
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

| Parameter | Type   | Default | Description |
| --------- | ------ | ------- | ----------- |
| page      | number | 1       | 页码        |
| limit     | number | 20      | 每页记录数  |

**Example Request:**

```bash
curl -X GET "http://localhost:3000/api/v1/attachments?page=1&limit=20" \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "attachments/file_123456",
        "filename": "file.pdf",
        "size": 102400,
        "mimeType": "application/pdf",
        "uid": "user_123456",
        "createdAt": 1704067200000,
        "updatedAt": 1704067200000
      },
      {
        "id": "attachments/file_789012",
        "filename": "image.jpg",
        "size": 256000,
        "mimeType": "image/jpeg",
        "uid": "user_123456",
        "createdAt": 1704067300000,
        "updatedAt": 1704067300000
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 20
  }
}
```

**Error Responses:**

| HTTP Status | Description |
| ----------- | ----------- |
| 401         | 未授权      |
| 500         | 数据库错误  |

---

### 3. Get Attachment Info

**GET** `/api/v1/attachments/:attachmentId`

获取单个文件的详细信息。

**认证要求：** 需要有效的 JWT token

#### Request

**Headers:**

```bash
Authorization: Bearer <jwt_token>
```

**Path Parameters:**

| Parameter    | Type   | Description                                                         |
| ------------ | ------ | ------------------------------------------------------------------- |
| attachmentId | string | 文件 ID（可以是 `attachmentId` 或 `attachments/attachmentId` 格式） |

**Example Request:**

```bash
curl -X GET http://localhost:3000/api/v1/attachments/file_123456 \
  -H "Authorization: Bearer <jwt_token>"
```

或：

```bash
curl -X GET http://localhost:3000/api/v1/attachments/attachments/file_123456 \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "attachments/file_123456",
    "filename": "file.pdf",
    "size": 102400,
    "mimeType": "application/pdf",
    "uid": "user_123456",
    "url": "http://localhost:3000/api/v1/attachments/file/file_123456",
    "createdAt": 1704067200000,
    "updatedAt": 1704067200000
  }
}
```

**Error Responses:**

| HTTP Status | Description |
| ----------- | ----------- |
| 401         | 未授权      |
| 404         | 文件不存在  |
| 500         | 数据库错误  |

---

### 4. Delete Attachment

**DELETE** `/api/v1/attachments/:attachmentId`

删除文件附件。

**认证要求：** 需要有效的 JWT token

#### Request

**Headers:**

```bash
Authorization: Bearer <jwt_token>
```

**Path Parameters:**

| Parameter    | Type   | Description                                                         |
| ------------ | ------ | ------------------------------------------------------------------- |
| attachmentId | string | 文件 ID（可以是 `attachmentId` 或 `attachments/attachmentId` 格式） |

**Example Request:**

```bash
curl -X DELETE http://localhost:3000/api/v1/attachments/file_123456 \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "Attachment deleted successfully"
  }
}
```

**Error Responses:**

| HTTP Status | Description |
| ----------- | ----------- |
| 401         | 未授权      |
| 404         | 文件不存在  |
| 500         | 数据库错误  |

---

## File Access (Public)

### 5. Get Local File

**GET** `/api/v1/attachments/file/:filename`

获取本地存储的文件内容。

**认证要求：** 不需要认证（公开端点）

**说明：** 仅当配置了 `storageType: 'local'` 时可用

#### Request

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| filename  | string | 文件名      |

**Example Request:**

```bash
curl -X GET http://localhost:3000/api/v1/attachments/file/file_123456
```

#### Response

**Success Response (200 OK):**

直接返回文件内容（二进制数据）

**Response Headers:**

```
Content-Type: <file-mime-type>
Content-Length: <file-size>
Cache-Control: public, max-age=31536000
```

**Error Responses:**

| HTTP Status | Description                    |
| ----------- | ------------------------------ |
| 404         | 文件不存在或存储类型不是 local |

---

## Authentication

上传、获取列表和删除文件需要认证。在请求头中包含：

```bash
Authorization: Bearer <jwt_token>
```

或通过 Cookie 自动发送：

```
Cookie: aimo_token=<jwt_token>
```

获取公开文件不需要认证。

---

## Notes

- 文件存储支持多种后端（如 S3、本地等），取决于配置
- 本地文件有缓存策略（max-age=1 年）
- 只有文件所有者可以访问或删除自己的文件
- attachmentId 可以是简单 ID 或完整路径格式（系统会自动处理）

---

## Error Codes Reference

| Code | HTTP Status | Meaning                                  |
| ---- | ----------- | ---------------------------------------- |
| 4001 | 400         | PARAMS_ERROR - 参数错误                  |
| 4009 | 404         | ATTACHMENT_NOT_FOUND - 文件不存在        |
| 4010 | 401         | UNAUTHORIZED - 未授权                    |
| 4018 | 415         | UNSUPPORTED_FILE_TYPE - 不支持的文件类型 |
| 4019 | 413         | FILE_TOO_LARGE - 文件过大                |
| 5000 | 500         | SYSTEM_ERROR - 系统错误                  |
| 5001 | 500         | DB_ERROR - 数据库错误                    |
| 5002 | 500         | FILE_UPLOAD_ERROR - 文件上传错误         |
| 5003 | 500         | STORAGE_ERROR - 存储错误                 |
