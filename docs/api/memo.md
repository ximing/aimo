# Memo API

Base URL: `/api/v1/memos`

笔记相关的 API 端点，包括创建、读取、更新、删除笔记以及向量搜索功能。

**认证要求：** 所有端点都需要有效的 JWT token

---

## Endpoints

### 1. Get Memos (List)

**GET** `/api/v1/memos`

获取当前用户的笔记列表，支持分页、排序和搜索。

#### Request

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | 页码 |
| limit | number | 10 | 每页记录数 |
| sortBy | string | createdAt | 排序字段：`createdAt` 或 `updatedAt` |
| sortOrder | string | desc | 排序顺序：`asc` 或 `desc` |
| search | string | - | 搜索关键词（标题、内容、标签） |
| categoryId | string | - | 按分类过滤 |
| startDate | string | - | 开始日期（ISO 8601 格式） |
| endDate | string | - | 结束日期（ISO 8601 格式） |

**Example Request:**

```bash
curl -X GET "http://localhost:3000/api/v1/memos?page=1&limit=20&sortBy=updatedAt&sortOrder=desc" \
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
        "memoId": "memo_123456",
        "uid": "user_123456",
        "title": "示例笔记",
        "content": "笔记内容",
        "categoryId": "category_123456",
        "attachments": [],
        "relationIds": [],
        "createdAt": 1704067200000,
        "updatedAt": 1704067200000
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

**Error Response:**

- `401` - 未授权，需要登录
- `500` - 数据库错误

---

### 2. Get Memo by ID

**GET** `/api/v1/memos/:memoId`

获取单个笔记的详细信息。

#### Request

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| memoId | string | 笔记 ID |

**Example Request:**

```bash
curl -X GET http://localhost:3000/api/v1/memos/memo_123456 \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "memoId": "memo_123456",
    "uid": "user_123456",
    "title": "示例笔记",
    "content": "笔记内容",
    "categoryId": "category_123456",
    "attachments": [
      {
        "id": "attachment_123456",
        "filename": "file.pdf",
        "size": 102400,
        "mimeType": "application/pdf",
        "createdAt": 1704067200000
      }
    ],
    "relationIds": ["memo_789012"],
    "createdAt": 1704067200000,
    "updatedAt": 1704067200000
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | 未授权 |
| 404 | 笔记不存在 |
| 500 | 数据库错误 |

---

### 3. Create Memo

**POST** `/api/v1/memos`

创建新笔记。

#### Request

**Body Parameters (JSON):**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| content | string | Yes | 笔记内容 |
| attachments | array | No | 附件 ID 列表 |
| categoryId | string | No | 分类 ID |
| relationIds | array | No | 相关笔记 ID 列表 |
| createdAt | number | No | 创建时间戳（毫秒） |
| updatedAt | number | No | 更新时间戳（毫秒） |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/v1/memos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "content": "这是一个新笔记",
    "categoryId": "category_123456",
    "attachments": ["attachment_123456"],
    "relationIds": ["memo_789012"]
  }'
```

#### Response

**Success Response (200 OK):**

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
      "categoryId": "category_123456",
      "attachments": ["attachment_123456"],
      "relationIds": ["memo_789012"],
      "createdAt": 1704067200000,
      "updatedAt": 1704067200000
    }
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Content 为空 |
| 401 | 未授权 |
| 500 | 数据库错误 |

---

### 4. Update Memo

**PUT** `/api/v1/memos/:memoId`

更新笔记信息。

#### Request

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| memoId | string | 笔记 ID |

**Body Parameters (JSON):**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| content | string | Yes | 笔记内容 |
| attachments | array | No | 附件 ID 列表 |
| categoryId | string | No | 分类 ID |
| relationIds | array | No | 相关笔记 ID 列表 |

**Example Request:**

```bash
curl -X PUT http://localhost:3000/api/v1/memos/memo_123456 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "content": "更新后的笔记内容",
    "categoryId": "category_123456"
  }'
```

#### Response

**Success Response (200 OK):**

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
      "categoryId": "category_123456",
      "attachments": [],
      "relationIds": [],
      "createdAt": 1704067200000,
      "updatedAt": 1704067201000
    }
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Content 为空 |
| 401 | 未授权 |
| 404 | 笔记不存在 |
| 500 | 数据库错误 |

---

### 5. Delete Memo

**DELETE** `/api/v1/memos/:memoId`

删除笔记。

#### Request

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| memoId | string | 笔记 ID |

**Example Request:**

```bash
curl -X DELETE http://localhost:3000/api/v1/memos/memo_123456 \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

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
|--------|-------------|
| 401 | 未授权 |
| 404 | 笔记不存在 |
| 500 | 数据库错误 |

---

### 6. Vector Search

**POST** `/api/v1/memos/search/vector`

基于语义向量搜索笔记。

#### Request

**Body Parameters (JSON):**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | Yes | 搜索查询文本 |
| page | number | No | 页码，默认为 1 |
| limit | number | No | 每页记录数，默认为 20 |

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

#### Response

**Success Response (200 OK):**

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
        "similarity": 0.95,
        "createdAt": 1704067200000,
        "updatedAt": 1704067200000
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 20
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Query 为空 |
| 401 | 未授权 |
| 500 | 数据库错误 |

---

### 7. Find Related Memos

**GET** `/api/v1/memos/:memoId/related`

查找与指定笔记相关的笔记。

#### Request

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| memoId | string | 笔记 ID |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 10 | 返回相关笔记的最大数量 |

**Example Request:**

```bash
curl -X GET "http://localhost:3000/api/v1/memos/memo_123456/related?limit=10" \
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
        "memoId": "memo_789012",
        "uid": "user_123456",
        "content": "相关笔记内容...",
        "similarity": 0.92,
        "createdAt": 1704067200000,
        "updatedAt": 1704067200000
      }
    ],
    "count": 3
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | 未授权 |
| 500 | 数据库错误 |

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

## Error Codes Reference

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| 4001 | 400 | PARAMS_ERROR - 参数错误 |
| 4004 | 404 | NOT_FOUND - 资源不存在 |
| 4010 | 401 | UNAUTHORIZED - 未授权 |
| 5001 | 500 | DB_ERROR - 数据库错误 |

