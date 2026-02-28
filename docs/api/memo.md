# Memo API

Base URL: `/api/v1/memos`

笔记相关的 API 端点，包括创建、读取、更新、删除、向量搜索、关联与反向链接等功能。

**认证要求：** 除公开接口 `/api/v1/memos/public/:uid`、`/api/v1/memos/public/:uid/random` 和 `/api/v1/memos/public/memo/:memoId` 外，其余端点都需要有效的 JWT token

---

## Endpoints

### 1. Get Memos (List)

**GET** `/api/v1/memos`

获取当前用户的笔记列表，支持分页、排序和搜索。

#### Request

**Headers:**

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Query Parameters:**

| Parameter  | Type     | Default   | Description                                     |
| ---------- | -------- | --------- | ----------------------------------------------- |
| page       | number   | 1         | 页码                                            |
| limit      | number   | 10        | 每页记录数                                      |
| sortBy     | string   | createdAt | 排序字段：`createdAt` 或 `updatedAt`            |
| sortOrder  | string   | desc      | 排序顺序：`asc` 或 `desc`                       |
| search     | string   | -         | 搜索关键词（内容）                              |
| categoryId | string   | -         | 按分类过滤，使用 `__uncategorized__` 查询未分类 |
| tags       | string[] | -         | 按多个标签名称过滤（逗号分隔）                  |
| startDate  | number   | -         | 开始时间戳（毫秒）                              |
| endDate    | number   | -         | 结束时间戳（毫秒）                              |

**过滤未分类:**

- 传入 `categoryId=__uncategorized__` 仅返回未分类笔记（`categoryId` 为 `null` 或未设置）。
- 不传 `categoryId` 则返回全部分类。

**Example Request (Uncategorized):**

```bash
curl -X GET "http://localhost:3000/api/v1/memos?categoryId=__uncategorized__" \
  -H "Authorization: Bearer <jwt_token>"
```

**Example Request:**

```bash
curl -X GET "http://localhost:3000/api/v1/memos?page=1&limit=20&sortBy=updatedAt&sortOrder=desc" \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<PaginatedMemoListDto>`
>
> **PaginatedMemoListDto 类型定义:**
>
> ```typescript
> interface TagDto {
>   tagId: string; // 标签唯一标识符
>   uid: string; // 用户唯一标识符
>   name: string; // 标签名称
>   createdAt: number; // 创建时间戳（毫秒）
>   updatedAt: number; // 更新时间戳（毫秒）
> }
>
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
> interface MemoListItemDto {
>   memoId: string; // 笔记唯一标识符
>   uid: string; // 用户唯一标识符
>   content: string; // 笔记内容
>   type: 'text' | 'audio' | 'video'; // 笔记类型
>   categoryId?: string; // 分类 ID
>   tags?: TagDto[]; // 标签列表
>   attachments?: AttachmentDto[]; // 附件列表
>   relations?: MemoListItemDto[]; // 相关笔记
>   isPublic?: boolean; // 是否公开（无需登录访问）
>   createdAt: number; // 创建时间戳（毫秒）
>   updatedAt: number; // 更新时间戳（毫秒）
> }
>
> interface PaginatedMemoListDto {
>   items: MemoListItemDto[];
>   pagination: {
>     total: number;
>     page: number;
>     limit: number;
>     totalPages: number;
>   };
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "memoId": "memo_123456",
        "uid": "user_123456",
        "content": "笔记内容",
        "type": "text",
        "categoryId": "category_123456",
        "attachments": [],
        "relations": [],
        "createdAt": 1704067200000,
        "updatedAt": 1704067200000
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "totalPages": 5
    }
  }
}
```

**Error Response:**

| Status | Description |
| ------ | ----------- |
| 401    | 未授权      |
| 500    | 数据库错误  |

---

### 2. Get Memo by ID

**GET** `/api/v1/memos/:memoId`

获取单个笔记的详细信息。

#### Request

**Headers:**

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| memoId    | string | 笔记 ID     |

**Example Request:**

```bash
curl -X GET http://localhost:3000/api/v1/memos/memo_123456 \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<MemoWithAttachmentsDto>`
>
> **MemoWithAttachmentsDto 类型定义:**
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
> interface MemoWithAttachmentsDto {
>   memoId: string; // 笔记唯一标识符
>   uid: string; // 用户唯一标识符
>   content: string; // 笔记内容
>   type: 'text' | 'audio' | 'video'; // 笔记类型
>   categoryId?: string; // 分类 ID
>   attachments?: AttachmentDto[]; // 附件列表（含 URL）
>   embedding: number[]; // 向量嵌入
>   relations?: MemoWithAttachmentsDto[]; // 相关笔记（含附件详情）
>   isPublic?: boolean; // 是否公开（无需登录访问）
>   createdAt: number; // 创建时间戳（毫秒）
>   updatedAt: number; // 更新时间戳（毫秒）
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "memoId": "memo_123456",
    "uid": "user_123456",
    "content": "笔记内容",
    "type": "text",
    "categoryId": "category_123456",
    "attachments": [
      {
        "attachmentId": "attachment_123456",
        "filename": "file.pdf",
        "url": "user_123456/2024-01-01/attachment_123456.pdf",
        "type": "application/pdf",
        "size": 102400,
        "createdAt": 1704067200000
      }
    ],
    "embedding": [0.1, 0.2, ...],
    "relations": [
      {
        "memoId": "memo_789012",
        "uid": "user_123456",
        "content": "相关笔记内容",
        "type": "text",
        "categoryId": "category_123456",
        "attachments": [],
        "embedding": [0.1, 0.2, ...],
        "createdAt": 1704067200000,
        "updatedAt": 1704067200000
      }
    ],
    "createdAt": 1704067200000,
    "updatedAt": 1704067200000
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 401    | 未授权      |
| 404    | 笔记不存在  |
| 500    | 数据库错误  |

---

### 3. Create Memo

**POST** `/api/v1/memos`

创建新笔记。

#### Request

**Headers:**

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Body Parameters (JSON):**

| Parameter   | Type    | Required | Description              |
| ----------- | ------- | -------- | ------------------------ |
| content     | string  | Yes      | 笔记内容                 |
| type        | string  | No       | 笔记类型 (默认: text)    |
| attachments | array   | No       | 附件 ID 列表             |
| categoryId  | string  | No       | 分类 ID                  |
| tags        | array   | No       | 标签名称列表（新建标签） |
| tagIds      | array   | No       | 标签 ID 列表（已有标签） |
| relationIds | array   | No       | 相关笔记 ID 列表         |
| isPublic    | boolean | No       | 是否公开（默认 false）   |
| source      | string  | No       | 来源标识（如 'web', 'extension', 'api' 等） |
| createdAt   | number  | No       | 创建时间戳（毫秒）       |
| updatedAt   | number  | No       | 更新时间戳（毫秒）       |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/v1/memos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "content": "这是一个新笔记",
    "type": "text",
    "categoryId": "category_123456",
    "attachments": ["attachment_123456"],
    "relationIds": ["memo_789012"],
    "source": "extension",
    "isPublic": true
  }'
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<{ message: string; memo: MemoWithAttachmentsDto }>`
>
> **MemoWithAttachmentsDto 类型定义:**
>
> ```typescript
> interface TagDto {
>   tagId: string; // 标签唯一标识符
>   uid: string; // 用户唯一标识符
>   name: string; // 标签名称
>   createdAt: number; // 创建时间戳（毫秒）
>   updatedAt: number; // 更新时间戳（毫秒）
> }
>
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
> interface MemoWithAttachmentsDto {
>   memoId: string; // 笔记唯一标识符
>   uid: string; // 用户唯一标识符
>   content: string; // 笔记内容
>   type: 'text' | 'audio' | 'video'; // 笔记类型
>   categoryId?: string; // 分类 ID
>   tags?: TagDto[]; // 标签列表
>   attachments?: AttachmentDto[]; // 附件列表（含 URL）
>   embedding: number[]; // 向量嵌入
>   relations?: MemoWithAttachmentsDto[]; // 相关笔记（含附件详情）
>   isPublic?: boolean; // 是否公开（无需登录访问）
>   createdAt: number; // 创建时间戳（毫秒）
>   updatedAt: number; // 更新时间戳（毫秒）
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "Memo created successfully",
    "memo": {
      "memoId": "memo_new_123456",
      "uid": "user_123456",
      "content": "这是一个新笔记",
      "type": "text",
      "categoryId": "category_123456",
      "attachments": [
        {
          "attachmentId": "attachment_123456",
          "filename": "file.pdf",
          "url": "user_123456/2024-01-01/attachment_123456.pdf",
          "type": "application/pdf",
          "size": 102400,
          "createdAt": 1704067200000
        }
      ],
      "embedding": [0.1, 0.2, ...],
      "relations": [
        {
          "memoId": "memo_789012",
          "uid": "user_123456",
          "content": "相关笔记内容",
          "type": "text",
          "categoryId": "category_123456",
          "attachments": [],
          "embedding": [0.1, 0.2, ...],
          "createdAt": 1704067200000,
          "updatedAt": 1704067200000
        }
      ],
      "createdAt": 1704067200000,
      "updatedAt": 1704067200000
    }
  }
}
```

**Error Responses:**

| Status | Description  |
| ------ | ------------ |
| 400    | Content 为空 |
| 401    | 未授权       |
| 500    | 数据库错误   |

---

### 4. Update Memo

**PUT** `/api/v1/memos/:memoId`

更新笔记信息。

#### Request

**Headers:**

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| memoId    | string | 笔记 ID     |

**Body Parameters (JSON):**

| Parameter   | Type    | Required | Description                                      |
| ----------- | ------- | -------- | ------------------------------------------------ |
| content     | string  | Yes      | 笔记内容                                         |
| type        | string  | No       | 笔记类型，不传保持不变，传 `null` 重置为默认类型 |
| attachments | array   | No       | 附件 ID 列表（传入时覆盖现有附件）               |
| categoryId  | string  | No       | 分类 ID，不传保持不变，传 `null` 取消分类        |
| relationIds | array   | No       | 相关笔记 ID 列表（传入时覆盖现有关系）           |
| isPublic    | boolean | No       | 是否公开，不传保持不变                           |

**Example Request:**

```bash
curl -X PUT http://localhost:3000/api/v1/memos/memo_123456 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "content": "更新后的笔记内容",
    "type": "text",
    "categoryId": "category_123456",
    "isPublic": true
  }'
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<{ message: string; memo: MemoWithAttachmentsDto }>`
>
> **MemoWithAttachmentsDto 类型定义:**
>
> ```typescript
> interface TagDto {
>   tagId: string; // 标签唯一标识符
>   uid: string; // 用户唯一标识符
>   name: string; // 标签名称
>   createdAt: number; // 创建时间戳（毫秒）
>   updatedAt: number; // 更新时间戳（毫秒）
> }
>
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
> interface MemoWithAttachmentsDto {
>   memoId: string; // 笔记唯一标识符
>   uid: string; // 用户唯一标识符
>   content: string; // 笔记内容
>   type: 'text' | 'audio' | 'video'; // 笔记类型
>   categoryId?: string; // 分类 ID
>   tags?: TagDto[]; // 标签列表
>   attachments?: AttachmentDto[]; // 附件列表（含 URL）
>   embedding: number[]; // 向量嵌入
>   relations?: MemoWithAttachmentsDto[]; // 相关笔记（含附件详情）
>   isPublic?: boolean; // 是否公开（无需登录访问）
>   createdAt: number; // 创建时间戳（毫秒）
>   updatedAt: number; // 更新时间戳（毫秒）
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "Memo updated successfully",
    "memo": {
      "memoId": "memo_123456",
      "uid": "user_123456",
      "content": "更新后的笔记内容",
      "type": "text",
      "categoryId": "category_123456",
      "attachments": [],
      "embedding": [0.1, 0.2, ...],
      "relations": [],
      "createdAt": 1704067200000,
      "updatedAt": 1704067201000
    }
  }
}
```

**Error Responses:**

| Status | Description  |
| ------ | ------------ |
| 400    | Content 为空 |
| 401    | 未授权       |
| 404    | 笔记不存在   |
| 500    | 数据库错误   |

---

### 5. Update Memo Tags

**PUT** `/api/v1/memos/:memoId/tags`

更新笔记的标签。

#### Request

**Headers:**

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| memoId    | string | 笔记 ID     |

**Body Parameters (JSON):**

| Parameter | Type  | Required | Description              |
| --------- | ----- | -------- | ------------------------ |
| tags      | array | No       | 标签名称列表（新建标签） |
| tagIds    | array | No       | 标签 ID 列表（已有标签） |

**Example Request:**

```bash
curl -X PUT http://localhost:3000/api/v1/memos/memo_123456/tags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "tags": ["技术", "学习"],
    "tagIds": ["tag_123456"]
  }'
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<{ message: string; memo: MemoWithAttachmentsDto }>`
>
> **返回完整的笔记对象，包含 tags 字段：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "Tags updated successfully",
    "memo": {
      "memoId": "memo_123456",
      "uid": "user_123456",
      "content": "笔记内容",
      "type": "text",
      "categoryId": "category_123456",
      "tags": [
        {
          "tagId": "tag_123456",
          "uid": "user_123456",
          "name": "技术",
          "createdAt": 1704067200000,
          "updatedAt": 1704067200000
        },
        {
          "tagId": "tag_789012",
          "uid": "user_123456",
          "name": "学习",
          "createdAt": 1704067200000,
          "updatedAt": 1704067200000
        }
      ],
      "attachments": [],
      "relations": [],
      "createdAt": 1704067200000,
      "updatedAt": 1704067200000
    }
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 401    | 未授权      |
| 404    | 笔记不存在  |
| 500    | 数据库错误  |

---

### 6. Delete Memo

**DELETE** `/api/v1/memos/:memoId`

删除笔记。

#### Request

**Headers:**

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| memoId    | string | 笔记 ID     |

**Example Request:**

```bash
curl -X DELETE http://localhost:3000/api/v1/memos/memo_123456 \
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
    "message": "Memo deleted successfully"
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 401    | 未授权      |
| 404    | 笔记不存在  |
| 500    | 数据库错误  |

---

### 6. Vector Search

**POST** `/api/v1/memos/search/vector`

基于语义向量搜索笔记。

#### Request

**Headers:**

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Body Parameters (JSON):**

| Parameter  | Type   | Required | Description                                     |
| ---------- | ------ | -------- | ----------------------------------------------- |
| query      | string | Yes      | 搜索查询文本                                    |
| page       | number | No       | 页码，默认为 1                                  |
| limit      | number | No       | 每页记录数，默认为 20                           |
| categoryId | string | No       | 按分类过滤，使用 `__uncategorized__` 查询未分类 |
| startDate  | number | No       | 开始时间戳（毫秒）                              |
| endDate    | number | No       | 结束时间戳（毫秒）                              |

**过滤说明:**

- 传入 `categoryId=__uncategorized__` 仅返回未分类笔记（`categoryId` 为 `null` 或未设置）。
- `startDate`/`endDate` 为创建时间的毫秒级时间戳。

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/v1/memos/search/vector \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "query": "如何学习编程",
    "page": 1,
    "limit": 20
  }'
```

**Example Request (With Filters):**

```bash
curl -X POST http://localhost:3000/api/v1/memos/search/vector \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "query": "如何学习编程",
    "categoryId": "__uncategorized__",
    "startDate": 1704067200000,
    "endDate": 1706659200000,
    "page": 1,
    "limit": 20
  }'
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<PaginatedMemoListWithScoreDto>`
>
> **PaginatedMemoListWithScoreDto 类型定义:**
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
> interface MemoListItemWithScoreDto {
>   memoId: string; // 笔记唯一标识符
>   uid: string; // 用户唯一标识符
>   content: string; // 笔记内容
>   type: 'text' | 'audio' | 'video'; // 笔记类型
>   categoryId?: string; // 分类 ID
>   attachments?: AttachmentDto[]; // 附件列表
>   relations?: MemoListItemWithScoreDto[]; // 相关笔记
>   isPublic?: boolean; // 是否公开（无需登录访问）
>   createdAt: number; // 创建时间戳（毫秒）
>   updatedAt: number; // 更新时间戳（毫秒）
>   relevanceScore?: number; // 相似度分数 (0-1)，越高越相关
> }
>
> interface PaginatedMemoListWithScoreDto {
>   items: MemoListItemWithScoreDto[];
>   pagination: {
>     total: number;
>     page: number;
>     limit: number;
>     totalPages: number;
>   };
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "memoId": "memo_123456",
        "uid": "user_123456",
        "content": "编程学习笔记...",
        "type": "text",
        "attachments": [],
        "relations": [],
        "createdAt": 1704067200000,
        "updatedAt": 1704067200000,
        "relevanceScore": 0.95
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 400    | Query 为空  |
| 401    | 未授权      |
| 500    | 数据库错误  |

---

### 7. Find Related Memos

**GET** `/api/v1/memos/:memoId/related`

基于当前笔记的向量相似度查找相关笔记，返回分页结果和相似度分数。

#### Request

**Headers:**

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| memoId    | string | 笔记 ID     |

**Query Parameters:**

| Parameter | Type   | Default | Description |
| --------- | ------ | ------- | ----------- |
| page      | number | 1       | 页码        |
| limit     | number | 10      | 每页数量    |

**Example Request:**

```bash
curl -X GET "http://localhost:3000/api/v1/memos/memo_123456/related?page=1&limit=10" \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<PaginatedMemoListWithScoreDto>`
>
> **PaginatedMemoListWithScoreDto 类型定义:**
>
> ```typescript
> interface MemoListItemWithScoreDto {
>   memoId: string; // 笔记唯一标识符
>   uid: string; // 用户唯一标识符
>   content: string; // 笔记内容
>   type: 'text' | 'audio' | 'video'; // 笔记类型
>   categoryId?: string; // 分类 ID
>   attachments?: AttachmentDto[]; // 附件列表
>   relations?: MemoListItemWithScoreDto[]; // 相关笔记
>   isPublic?: boolean; // 是否公开（无需登录访问）
>   createdAt: number; // 创建时间戳（毫秒）
>   updatedAt: number; // 更新时间戳（毫秒）
>   relevanceScore?: number; // 相似度分数 (0-1)，越高越相关
> }
>
> interface PaginatedMemoListWithScoreDto {
>   items: MemoListItemWithScoreDto[];
>   pagination: {
>     total: number;
>     page: number;
>     limit: number;
>     totalPages: number;
>   };
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "memoId": "memo_789012",
        "uid": "user_123456",
        "content": "相关笔记内容...",
        "type": "text",
        "attachments": [],
        "relations": [],
        "createdAt": 1704067200000,
        "updatedAt": 1704067200000,
        "relevanceScore": 0.87
      }
    ],
    "pagination": {
      "total": 12,
      "page": 1,
      "limit": 10,
      "totalPages": 2
    }
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 401    | 未授权      |
| 500    | 数据库错误  |

---

### 8. Get Backlinks

**GET** `/api/v1/memos/:memoId/backlinks`

获取链接到当前笔记的反向链接笔记。

#### Request

**Headers:**

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| memoId    | string | 笔记 ID     |

**Query Parameters:**

| Parameter | Type   | Default | Description |
| --------- | ------ | ------- | ----------- |
| page      | number | 1       | 页码        |
| limit     | number | 20      | 每页数量    |

**Example Request:**

```bash
curl -X GET "http://localhost:3000/api/v1/memos/memo_123456/backlinks?page=1&limit=20" \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<{ items: MemoListItemDto[]; pagination: PaginationDto }>`
>
> **MemoListItemDto 类型定义:**
>
> ```typescript
> interface MemoListItemDto {
>   memoId: string; // 笔记唯一标识符
>   uid: string; // 用户唯一标识符
>   content: string; // 笔记内容
>   type: 'text' | 'audio' | 'video'; // 笔记类型
>   categoryId?: string; // 分类 ID
>   attachments?: AttachmentDto[]; // 附件列表
>   relations?: MemoListItemDto[]; // 相关笔记
>   isPublic?: boolean; // 是否公开（无需登录访问）
>   createdAt: number; // 创建时间戳（毫秒）
>   updatedAt: number; // 更新时间戳（毫秒）
> }
>
> interface PaginationDto {
>   total: number;
>   page: number;
>   limit: number;
>   totalPages: number;
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "memoId": "memo_111111",
        "uid": "user_123456",
        "content": "这是链接到目标笔记的笔记...",
        "type": "text",
        "attachments": [],
        "relations": [],
        "createdAt": 1704067200000,
        "updatedAt": 1704067200000
      }
    ],
    "pagination": {
      "total": 10,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 401    | 未授权      |
| 404    | 笔记不存在  |
| 500    | 数据库错误  |

---

### 9. Get Public Memos

**GET** `/api/v1/memos/public/:uid`

获取指定用户的公开笔记列表（无需认证）。

#### Request

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| uid       | string | 用户 ID     |

**Query Parameters:**

| Parameter | Type   | Default   | Description                          |
| --------- | ------ | --------- | ------------------------------------ |
| page      | number | 1         | 页码                                 |
| limit     | number | 20        | 每页记录数                           |
| sortBy    | string | createdAt | 排序字段：`createdAt` 或 `updatedAt` |
| sortOrder | string | desc      | 排序顺序：`asc` 或 `desc`            |

**Example Request:**

```bash
curl -X GET "http://localhost:3000/api/v1/memos/public/user_123456?page=1&limit=20"
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<PaginatedMemoListDto>`
>
> **PaginatedMemoListDto 类型定义:**
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
> interface MemoListItemDto {
>   memoId: string; // 笔记唯一标识符
>   uid: string; // 用户唯一标识符
>   content: string; // 笔记内容
>   type: 'text' | 'audio' | 'video'; // 笔记类型
>   categoryId?: string; // 分类 ID
>   attachments?: AttachmentDto[]; // 附件列表
>   relations?: MemoListItemDto[]; // 相关笔记
>   isPublic?: boolean; // 是否公开（无需登录访问）
>   createdAt: number; // 创建时间戳（毫秒）
>   updatedAt: number; // 更新时间戳（毫秒）
> }
>
> interface PaginatedMemoListDto {
>   items: MemoListItemDto[];
>   pagination: {
>     total: number;
>     page: number;
>     limit: number;
>     totalPages: number;
>   };
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "memoId": "memo_123456",
        "uid": "user_123456",
        "content": "公开笔记内容",
        "type": "text",
        "attachments": [],
        "relations": [],
        "isPublic": true,
        "createdAt": 1704067200000,
        "updatedAt": 1704067200000
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 400    | 参数错误    |
| 500    | 数据库错误  |

---

### 10. Get Random Public Memo

**GET** `/api/v1/memos/public/:uid/random`

随机获取指定用户的一条公开笔记（无需认证）。

#### Request

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| uid       | string | 用户 ID     |

**Example Request:**

```bash
curl -X GET "http://localhost:3000/api/v1/memos/public/user_123456/random"
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<MemoListItemDto>`
>
> **MemoListItemDto 类型定义:**
>
> ```typescript
> interface TagDto {
>   tagId: string; // 标签唯一标识符
>   uid: string; // 用户唯一标识符
>   name: string; // 标签名称
>   createdAt: number; // 创建时间戳（毫秒）
>   updatedAt: number; // 更新时间戳（毫秒）
> }
>
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
> interface MemoListItemDto {
>   memoId: string; // 笔记唯一标识符
>   uid: string; // 用户唯一标识符
>   content: string; // 笔记内容
>   type: 'text' | 'audio' | 'video'; // 笔记类型
>   categoryId?: string; // 分类 ID
>   attachments?: AttachmentDto[]; // 附件列表
>   relations?: MemoListItemDto[]; // 相关笔记
>   isPublic?: boolean; // 是否公开（无需登录访问）
>   createdAt: number; // 创建时间戳（毫秒）
>   updatedAt: number; // 更新时间戳（毫秒）
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "memoId": "memo_123456",
    "uid": "user_123456",
    "content": "公开笔记内容",
    "type": "text",
    "attachments": [],
    "relations": [],
    "isPublic": true,
    "createdAt": 1704067200000,
    "updatedAt": 1704067200000
  }
}
```

**Error Responses:**

| Status | Description    |
| ------ | -------------- |
| 400    | 参数错误       |
| 404    | 未找到公开笔记 |
| 500    | 数据库错误     |

---

### 11. Get Public Memo by ID

**GET** `/api/v1/memos/public/memo/:memoId`

获取指定 ID 的公开笔记详情（无需认证）。返回笔记详情及发布者用户信息。

#### Request

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| memoId    | string | 笔记 ID     |

**Example Request:**

```bash
curl -X GET "http://localhost:3000/api/v1/memos/public/memo/memo_123456"
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<{ memo: PublicMemoDto; user: UserInfoDto }>`
>
> **PublicMemoDto 类型定义:**
>
> ```typescript
> interface TagDto {
>   tagId: string; // 标签唯一标识符
>   uid: string; // 用户唯一标识符
>   name: string; // 标签名称
>   createdAt: number; // 创建时间戳（毫秒）
>   updatedAt: number; // 更新时间戳（毫秒）
> }
>
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
> interface PublicMemoDto {
>   memoId: string; // 笔记唯一标识符
>   uid: string; // 用户唯一标识符
>   content: string; // 笔记内容
>   type: 'text' | 'audio' | 'video'; // 笔记类型
>   categoryId?: string; // 分类 ID
>   tags?: TagDto[]; // 标签列表
>   attachments?: AttachmentDto[]; // 附件列表
>   isPublic: boolean; // 是否公开
>   createdAt: number; // 创建时间戳（毫秒）
>   updatedAt: number; // 更新时间戳（毫秒）
> }
>
> interface UserInfoDto {
>   uid: string; // 用户唯一标识符
>   email: string; // 用户邮箱
>   nickname: string; // 用户昵称
>   avatar: string; // 用户头像 URL
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "memo": {
      "memoId": "memo_123456",
      "uid": "user_123456",
      "content": "公开笔记内容",
      "type": "text",
      "categoryId": "category_123456",
      "tags": [
        {
          "tagId": "tag_123456",
          "uid": "user_123456",
          "name": "技术",
          "createdAt": 1704067200000,
          "updatedAt": 1704067200000
        }
      ],
      "attachments": [],
      "isPublic": true,
      "createdAt": 1704067200000,
      "updatedAt": 1704067200000
    },
    "user": {
      "uid": "user_123456",
      "email": "user@example.com",
      "nickname": "张三",
      "avatar": "https://..."
    }
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 400    | 参数错误    |
| 404    | 公开笔记不存在 |
| 500    | 数据库错误  |

---

## Authentication

除公开接口外，其余端点都需要有效的 JWT token。

公开接口（无需认证）：

- `/api/v1/memos/public/:uid`
- `/api/v1/memos/public/:uid/random`
- `/api/v1/memos/public/memo/:memoId`

在请求头中包含：

```bash
Authorization: Bearer <jwt_token>
```

或通过 Cookie 自动发送：

```
Cookie: aimo_token=<jwt_token>
```

---

## Error Codes Reference

| Code | HTTP Status | Meaning                 |
| ---- | ----------- | ----------------------- |
| 4001 | 400         | PARAMS_ERROR - 参数错误 |
| 4004 | 404         | NOT_FOUND - 资源不存在  |
| 4010 | 401         | UNAUTHORIZED - 未授权   |
| 5001 | 500         | DB_ERROR - 数据库错误   |
