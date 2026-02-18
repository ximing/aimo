# Attachment API

Base URL: `/api/v1/attachments`

附件管理相关的 API 端点，用于上传、下载和管理笔记附件。

**认证要求：** 所有端点都需要有效的 JWT token

---

## Endpoints

### 1. Upload Attachment

**POST** `/api/v1/attachments/upload`

上传文件作为附件。

#### Request

**Headers:**

| Header | Required | Description |
| ------ | -------- | ----------- |
| Authorization | Yes | JWT Token |
| Content-Type | Yes | multipart/form-data |

**Form Parameters:**

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| file      | file   | Yes      | 要上传的文件           |
| createdAt | number | No       | 创建时间戳（毫秒）     |

**Example Request:**

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
      "id": "attachment_123456",
      "filename": "file.pdf",
      "size": 102400,
      "mimeType": "application/pdf",
      "createdAt": 1704067200000
    }
  }
}
```

**Error Responses:**

| Status | Description                 |
| ------ | -------------------------- |
| 400    | 参数错误或未上传文件        |
| 401    | 未授权                     |
| 413    | 文件太大                   |
| 415    | 不支持的文件类型            |
| 500    | 存储错误                   |

---

### 2. Get Attachments

**GET** `/api/v1/attachments`

获取当前用户的附件列表。

#### Request

**Headers:**

| Header | Required | Description |
| ------ | -------- | ----------- |
| Authorization | Yes | JWT Token |

**Query Parameters:**

| Parameter | Type   | Default | Description |
| --------- | ------ | ------- | ----------- |
| page      | number | 1       | 页码       |
| limit     | number | 20      | 每页数量   |

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
        "id": "attachment_123456",
        "filename": "file.pdf",
        "size": 102400,
        "mimeType": "application/pdf",
        "createdAt": 1704067200000
      },
      {
        "id": "attachment_789012",
        "filename": "image.png",
        "size": 204800,
        "mimeType": "image/png",
        "createdAt": 1704067200000
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 20
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 401    | 未授权      |
| 500    | 数据库错误  |

---

### 3. Get Attachment

**GET** `/api/v1/attachments/:attachmentId`

获取单个附件的详细信息。

#### Request

**Headers:**

| Header | Required | Description |
| ------ | -------- | ----------- |
| Authorization | Yes | JWT Token |

**Path Parameters:**

| Parameter    | Type   | Description |
| ------------ | ------ | ----------- |
| attachmentId | string | 附件 ID     |

**Example Request:**

```bash
curl -X GET http://localhost:3000/api/v1/attachments/attachment_123456 \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "attachment_123456",
    "filename": "file.pdf",
    "size": 102400,
    "mimeType": "application/pdf",
    "createdAt": 1704067200000
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 401    | 未授权      |
| 404    | 附件不存在  |
| 500    | 数据库错误  |

---

### 4. Delete Attachment

**DELETE** `/api/v1/attachments/:attachmentId`

删除附件。

#### Request

**Headers:**

| Header | Required | Description |
| ------ | -------- | ----------- |
| Authorization | Yes | JWT Token |

**Path Parameters:**

| Parameter    | Type   | Description |
| ------------ | ------ | ----------- |
| attachmentId | string | 附件 ID     |

**Example Request:**

```bash
curl -X DELETE http://localhost:3000/api/v1/attachments/attachment_123456 \
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

| Status | Description |
| ------ | ----------- |
| 401    | 未授权      |
| 404    | 附件不存在  |
| 500    | 数据库错误  |

---

### 5. Download Attachment

**GET** `/api/v1/attachments/:attachmentId/download`

下载附件文件。

#### Request

**Headers:**

| Header | Required | Description |
| ------ | -------- | ----------- |
| Authorization | Yes | JWT Token |

**Path Parameters:**

| Parameter    | Type   | Description |
| ------------ | ------ | ----------- |
| attachmentId | string | 附件 ID     |

**Example Request:**

```bash
curl -X GET http://localhost:3000/api/v1/attachments/attachment_123456/download \
  -H "Authorization: Bearer <jwt_token>" \
  -o downloaded_file.pdf
```

#### Response

**Success Response (200 OK):**

响应头包含文件信息：
```
Content-Type: application/pdf
Content-Length: 102400
Content-Disposition: attachment; filename="file.pdf"
Cache-Control: private, max-age=3600
```

文件内容以二进制流返回。

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 401    | 未授权      |
| 404    | 附件不存在  |
| 500    | 系统错误    |

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

## 文件限制

- **最大文件大小**: 由服务器配置决定（默认 50MB）
- **允许的文件类型**: 图片、PDF、文档、音频、视频等（由服务器白名单控制）

---

## Error Codes Reference

| Code | HTTP Status | Meaning                      |
| ---- | ---------- | ---------------------------- |
| 4001 | 400        | PARAMS_ERROR - 参数错误       |
| 4004 | 404        | ATTACHMENT_NOT_FOUND - 附件不存在 |
| 4010 | 401        | UNAUTHORIZED - 未授权         |
| 4130 | 413        | FILE_TOO_LARGE - 文件太大     |
| 4150 | 415        | UNSUPPORTED_FILE_TYPE - 不支持的文件类型 |
| 5001 | 500        | DB_ERROR - 数据库错误         |
| 5002 | 500        | STORAGE_ERROR - 存储错误      |
| 5003 | 500        | FILE_UPLOAD_ERROR - 文件上传错误 |
| 5004 | 500        | SYSTEM_ERROR - 系统错误       |
