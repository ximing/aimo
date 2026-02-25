# Attachment API

Base URL: `/api/v1/attachments`

附件管理相关的 API 端点，用于上传、下载和管理笔记附件。

附件接口返回的 `url` 为存储访问地址：本地存储时为相对路径，S3/OSS 为签名或直链地址。需要导出文件时使用 `/download` 端点。

**认证要求：** 所有端点都需要有效的 JWT token

---

## Endpoints

### 1. Upload Attachment

**POST** `/api/v1/attachments/upload`

上传文件作为附件。

#### Request

**Headers:**

| Header        | Required | Description         |
| ------------- | -------- | ------------------- |
| Authorization | Yes      | JWT Token           |
| Content-Type  | Yes      | multipart/form-data |

**Form Parameters:**

| Parameter | Type   | Required | Description        |
| --------- | ------ | -------- | ------------------ |
| file      | file   | Yes      | 要上传的文件       |
| createdAt | number | No       | 创建时间戳（毫秒） |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/v1/attachments/upload \
  -H "Authorization: Bearer <jwt_token>" \
  -F "file=@/path/to/file.pdf" \
  -F "createdAt=1704067200000"
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<UploadAttachmentResponseDto>`
>
> **UploadAttachmentResponseDto 类型定义:**
>
> ```typescript
> interface AttachmentDto {
>   attachmentId: string; // 附件唯一标识符
>   filename: string; // 文件名
>   url: string; // 访问 URL（存储访问地址）
>   type: string; // MIME 类型
>   size: number; // 文件大小（字节）
>   createdAt: number; // 创建时间戳（毫秒）
>   properties?: Record<string, unknown>; // 附件属性：audio(duration), image(width,height), video(duration)
> }
>
> interface UploadAttachmentResponseDto {
>   message: string;
>   attachment: AttachmentDto;
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "File uploaded successfully",
    "attachment": {
      "attachmentId": "attachment_123456",
      "filename": "file.pdf",
      "url": "user_123456/2024-01-01/attachment_123456.pdf",
      "type": "application/pdf",
      "size": 102400,
      "createdAt": 1704067200000,
      "properties": {}
    }
  }
}
```

**Error Responses:**

| Status | Description          |
| ------ | -------------------- |
| 400    | 参数错误或未上传文件 |
| 401    | 未授权               |
| 413    | 文件太大             |
| 415    | 不支持的文件类型     |
| 500    | 存储错误             |

---

### 2. Get Attachments

**GET** `/api/v1/attachments`

获取当前用户的附件列表。

#### Request

**Headers:**

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Query Parameters:**

| Parameter | Type   | Default | Description |
| --------- | ------ | ------- | ----------- |
| page      | number | 1       | 页码        |
| limit     | number | 20      | 每页数量    |

**Example Request:**

```bash
curl -X GET "http://localhost:3000/api/v1/attachments?page=1&limit=20" \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<AttachmentListResponseDto>`
>
> **AttachmentListResponseDto 类型定义:**
>
> ```typescript
> interface AttachmentDto {
>   attachmentId: string; // 附件唯一标识符
>   filename: string; // 文件名
>   url: string; // 访问 URL（存储访问地址）
>   type: string; // MIME 类型
>   size: number; // 文件大小（字节）
>   createdAt: number; // 创建时间戳（毫秒）
>   properties?: Record<string, unknown>; // 附件属性
> }
>
> interface AttachmentListResponseDto {
>   items: AttachmentDto[];
>   total: number;
>   page: number;
>   limit: number;
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "attachmentId": "attachment_123456",
        "filename": "file.pdf",
        "url": "user_123456/2024-01-01/attachment_123456.pdf",
        "type": "application/pdf",
        "size": 102400,
        "createdAt": 1704067200000
      },
      {
        "attachmentId": "attachment_789012",
        "filename": "image.png",
        "url": "user_123456/2024-01-01/attachment_789012.png",
        "type": "image/png",
        "size": 204800,
        "createdAt": 1704067200000,
        "properties": {
          "width": 1920,
          "height": 1080
        }
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

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

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

> **Response Type:** `ApiSuccessDto<AttachmentDto>`
>
> **AttachmentDto 类型定义:**
>
> ```typescript
> interface AttachmentDto {
>   attachmentId: string; // 附件唯一标识符
>   filename: string; // 文件名
>   url: string; // 访问 URL（存储访问地址）
>   type: string; // MIME 类型
>   size: number; // 文件大小（字节）
>   createdAt: number; // 创建时间戳（毫秒）
>   properties?: Record<string, unknown>; // 附件属性
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "attachmentId": "attachment_123456",
    "filename": "file.pdf",
    "url": "user_123456/2024-01-01/attachment_123456.pdf",
    "type": "application/pdf",
    "size": 102400,
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

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

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

> **Response Type:** `ApiSuccessDto<{ message: string }>`

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

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Path Parameters:**

| Parameter    | Type   | Description |
| ------------ | ------ | ----------- |
| attachmentId | string | 附件 ID     |

**Example Request:**

```bash
curl -X GET http://localhost:3000user_123456/2024-01-01/attachment_123456.pdf \
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

### 6. Update Attachment Properties

**PATCH** `/api/v1/attachments/:attachmentId/properties`

更新附件的属性信息。属性会与现有属性合并（新值覆盖旧值）。

支持的属性类型：

- **图片 (image/\*)**: `width` (宽度), `height` (高度)
- **音频 (audio/\*)**: `duration` (时长，单位：秒)
- **视频 (video/\*)**: `duration` (时长，单位：秒)

#### Request

**Headers:**

| Header        | Required | Description      |
| ------------- | -------- | ---------------- |
| Authorization | Yes      | JWT Token        |
| Content-Type  | Yes      | application/json |

**Path Parameters:**

| Parameter    | Type   | Description |
| ------------ | ------ | ----------- |
| attachmentId | string | 附件 ID     |

**Request Body:**

| Parameter  | Type   | Required | Description      |
| ---------- | ------ | -------- | ---------------- |
| properties | object | Yes      | 要更新的属性对象 |

**Example Request:**

```bash
curl -X PATCH http://localhost:3000/api/v1/attachments/attachment_123456/properties \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"properties": {"width": 1920, "height": 1080}}'
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<UpdateAttachmentPropertiesResponseDto>`
>
> **UpdateAttachmentPropertiesResponseDto 类型定义:**
>
> ```typescript
> interface AttachmentDto {
>   attachmentId: string; // 附件唯一标识符
>   filename: string; // 文件名
>   url: string; // 访问 URL（存储访问地址）
>   type: string; // MIME 类型
>   size: number; // 文件大小（字节）
>   createdAt: number; // 创建时间戳（毫秒）
>   properties?: Record<string, unknown>; // 附件属性
> }
>
> interface UpdateAttachmentPropertiesResponseDto {
>   message: string;
>   attachment: AttachmentDto;
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "Properties updated successfully",
    "attachment": {
      "attachmentId": "attachment_123456",
      "filename": "image.png",
      "url": "user_123456/2024-01-01/attachment_123456.png",
      "type": "image/png",
      "size": 204800,
      "createdAt": 1704067200000,
      "properties": {
        "width": 1920,
        "height": 1080
      }
    }
  }
}
```

**Error Responses:**

| Status | Description               |
| ------ | ------------------------- |
| 400    | 参数错误或缺少 properties |
| 401    | 未授权                    |
| 404    | 附件不存在                |
| 500    | 数据库错误                |

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

| Code | HTTP Status | Meaning                                  |
| ---- | ----------- | ---------------------------------------- |
| 4001 | 400         | PARAMS_ERROR - 参数错误                  |
| 4004 | 404         | ATTACHMENT_NOT_FOUND - 附件不存在        |
| 4010 | 401         | UNAUTHORIZED - 未授权                    |
| 4130 | 413         | FILE_TOO_LARGE - 文件太大                |
| 4150 | 415         | UNSUPPORTED_FILE_TYPE - 不支持的文件类型 |
| 5001 | 500         | DB_ERROR - 数据库错误                    |
| 5002 | 500         | STORAGE_ERROR - 存储错误                 |
| 5003 | 500         | FILE_UPLOAD_ERROR - 文件上传错误         |
| 5004 | 500         | SYSTEM_ERROR - 系统错误                  |
