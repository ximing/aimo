# Attachment BA API

Base URL: `/api/v1/attachments/ba`

BA (Basic Auth) 认证的附件上传 API，用于无需 JWT Token 的服务端集成场景。

---

## 认证要求

需要在服务端配置以下环境变量：

| 环境变量          | 描述                       |
| ----------------- | -------------------------- |
| `BA_AUTH_ENABLED` | 设置为 `true` 启用 BA 认证 |
| `BA_AUTH_TOKEN`   | BA 认证使用的 Token        |

如果 `BA_AUTH_ENABLED` 未设置为 `true`，接口会返回 401。

> 说明：该接口走 BA 鉴权，不需要 JWT，也不依赖 `@CurrentUser()`。

---

## Endpoints

### 1. Upload Attachment (BA)

**POST** `/api/v1/attachments/ba/upload`

通过 BA 认证上传附件。用户 ID 通过查询参数 `uid` 传入。

#### Request

**Headers:**

| Header        | Required | Description              |
| ------------- | -------- | ------------------------ |
| Authorization | Yes BA   | `Bearer <BA_AUTH_TOKEN>` |
| Content-Type  | Yes      | `multipart/form-data`    |

**Query Parameters:**

| Parameter | Type   | Required | Description    |
| --------- | ------ | -------- | -------------- |
| uid       | string | Yes      | 用户唯一标识符 |

**Form Parameters:**

| Parameter  | Type   | Required | Description                                     |
| ---------- | ------ | -------- | ----------------------------------------------- |
| file       | file   | Yes      | 要上传的文件                                    |
| createdAt  | number | No       | 创建时间戳（毫秒）                              |
| properties | string | No       | 附件属性 JSON 字符串；见下方「Properties 详解」 |

#### Properties 详解

`properties` 是一个 JSON 字符串，用于存储不同类型附件的元数据。不同文件类型需要传递不同的属性：

| 文件类型 | 属性名称   | 类型   | 说明                   | 示例                                   |
| -------- | ---------- | ------ | ---------------------- | -------------------------------------- |
| **图片** | `width`    | number | 图片宽度（像素）       | `{"width": 1920, "height": 1080}`      |
|          | `height`   | number | 图片高度（像素）       |                                        |
| **视频** | `duration` | number | 视频时长（秒）         | `{"duration": 120.5}`                  |
|          | `coverUrl` | string | 视频封面图 URL（可选） | `{"duration": 120, "coverUrl": "..."}` |
| **音频** | `duration` | number | 音频时长（秒）         | `{"duration": 65.5}`                   |

> ⚠️ 注意：properties 必须是合法的 JSON 字符串。如果解析失败，该字段将被忽略。

**示例 - 上传图片：**

```bash
curl -X POST "http://localhost:3000/api/v1/attachments/ba/upload?uid=user_123" \
  -H "Authorization: Bearer your-ba-auth-token" \
  -F "file=@/path/to/photo.jpg" \
  -F 'properties={"width":3840,"height":2160}'
```

**示例 - 上传视频：**

```bash
curl -X POST "http://localhost:3000/api/v1/attachments/ba/upload?uid=user_123" \
  -H "Authorization: Bearer your-ba-auth-token" \
  -F "file=@/path/to/video.mp4" \
  -F 'properties={"duration":185.5,"coverUrl":"user_123/covers/xxx.jpg"}'
```

**示例 - 上传音频：**

```bash
curl -X POST "http://localhost:3000/api/v1/attachments/ba/upload?uid=user_123" \
  -H "Authorization: Bearer your-ba-auth-token" \
  -F "file=@/path/to/audio.mp3" \
  -F 'properties={"duration":180}'
```

**文件类型限制：**

- 服务端会校验 `config.attachment.blockedMimeTypes` 黑名单
- 命中黑名单（含 `text/*` 这类通配规则）会返回 `UNSUPPORTED_FILE_TYPE`

**Example Request:**

```bash
curl -X POST "http://localhost:3000/api/v1/attachments/ba/upload?uid=user_123" \
  -H "Authorization: Bearer your-ba-auth-token" \
  -F "file=@/path/to/file.pdf" \
  -F "createdAt=1704067200000" \
  -F 'properties={"source":"import","duration":12.5}'
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiResponse<UploadAttachmentByBAResponseDto>`
>
> `ApiResponse<T>` 结构：
>
> ```typescript
> interface ApiResponse<T> {
>   code: number;
>   msg: string;
>   data: T;
> }
> ```
>
> `AttachmentDto`（摘录）：
>
> ```typescript
> interface AttachmentDto {
>   attachmentId: string;
>   filename: string;
>   url: string;
>   type: string; // MIME type
>   size: number; // bytes
>   createdAt: number; // timestamp(ms)
>   coverUrl?: string;
>   properties?: Record<string, unknown>;
> }
>
> interface UploadAttachmentByBAResponseDto {
>   message: string;
>   attachment: AttachmentDto;
> }
> ```

```json
{
  "code": 0,
  "msg": "操作成功",
  "data": {
    "message": "File uploaded successfully via BA authentication",
    "attachment": {
      "attachmentId": "0zYw8w9lxnL2wVJxR3Rk8b9M",
      "filename": "file.pdf",
      "url": "user_123/2026-03-01/0zYw8w9lxnL2wVJxR3Rk8b9M.pdf",
      "type": "application/pdf",
      "size": 102400,
      "createdAt": 1704067200000,
      "properties": {}
    }
  }
}
```

---

## Error Responses

### A. BA 鉴权失败（HTTP 401）

> 由 `baAuthInterceptor` 直接返回，响应结构与 `ApiResponse` 不同：

```json
{
  "success": false,
  "message": "BA authentication is not configured"
}
```

可能的 `message` 包括：

- `BA authentication is not configured`
- `Authorization header is required`
- `Invalid authorization format. Expected: Bearer <token>`
- `Invalid BA token`

### B. 业务错误（HTTP 200 + code != 0）

| code | 常量                    | 场景说明                                     |
| ---- | ----------------------- | -------------------------------------------- |
| 2    | `PARAMS_ERROR`          | `uid` 缺失，或未上传 `file`                  |
| 3    | `NOT_FOUND`             | `uid` 对应用户不存在                         |
| 4000 | `FILE_TOO_LARGE`        | 上传文件超出 `config.attachment.maxFileSize` |
| 4001 | `UNSUPPORTED_FILE_TYPE` | MIME 类型被安全黑名单拦截                    |
| 4004 | `FILE_UPLOAD_ERROR`     | Multer 处理失败                              |
| 4003 | `STORAGE_ERROR`         | 附件写入存储/数据库失败                      |
| 1    | `SYSTEM_ERROR`          | 其他未捕获系统错误                           |

**示例：缺少 uid**

```json
{
  "code": 2,
  "msg": "User ID (uid) is required",
  "data": null
}
```

**示例：用户不存在**

```json
{
  "code": 3,
  "msg": "User not found",
  "data": null
}
```

---

## 使用建议

- 上传成功后使用返回的 `attachment.attachmentId` 组装笔记创建请求
- 若需要透传附件元数据（如 `duration`、`width/height`），请将 `properties` 作为合法 JSON 字符串传入
- 建议调用方对 401（鉴权错误）与 `code != 0`（业务错误）分别处理
