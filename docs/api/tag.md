# Tag API

Base URL: `/api/v1/tags`

标签管理相关的 API 端点，用于组织和管理笔记标签。

**认证要求：** 所有端点都需要有效的 JWT token

---

## Endpoints

### 1. Get Tags

**GET** `/api/v1/tags`

获取当前用户的所有标签列表。

#### Request

**Headers:**

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Example Request:**

```bash
curl -X GET http://localhost:3000/api/v1/tags \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<{ tags: TagDto[] }>`
>
> **TagDto 类型定义:**
>
> ```typescript
> interface TagDto {
>   tagId: string; // 标签唯一标识符
>   uid: string; // 用户唯一标识符
>   name: string; // 标签名称
>   createdAt: number; // 创建时间戳（毫秒）
>   updatedAt: number; // 更新时间戳（毫秒）
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "tags": [
      {
        "tagId": "tag_123456",
        "uid": "user_123456",
        "name": "工作",
        "createdAt": 1704067200000,
        "updatedAt": 1704067200000
      },
      {
        "tagId": "tag_789012",
        "uid": "user_123456",
        "name": "生活",
        "createdAt": 1704067200000,
        "updatedAt": 1704067200000
      }
    ]
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 401    | 未授权      |
| 500    | 数据库错误  |

---

### 2. Get Tag by ID

**GET** `/api/v1/tags/:tagId`

获取单个标签的详细信息。

#### Request

**Headers:**

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| tagId     | string | 标签 ID     |

**Example Request:**

```bash
curl -X GET http://localhost:3000/api/v1/tags/tag_123456 \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<{ tag: TagDto }>`
>
> **TagDto 类型定义:**
>
> ```typescript
> interface TagDto {
>   tagId: string; // 标签唯一标识符
>   uid: string; // 用户唯一标识符
>   name: string; // 标签名称
>   createdAt: number; // 创建时间戳（毫秒）
>   updatedAt: number; // 更新时间戳（毫秒）
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "tag": {
      "tagId": "tag_123456",
      "uid": "user_123456",
      "name": "工作",
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
| 404    | 标签不存在  |
| 500    | 数据库错误  |

---

### 3. Create Tag

**POST** `/api/v1/tags`

创建新标签。

#### Request

**Headers:**

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Body Parameters (JSON):**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| name      | string | Yes      | 标签名称    |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/v1/tags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "name": "技术"
  }'
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<{ tag: TagDto }>`
>
> **TagDto 类型定义:**
>
> ```typescript
> interface TagDto {
>   tagId: string; // 标签唯一标识符
>   uid: string; // 用户唯一标识符
>   name: string; // 标签名称
>   createdAt: number; // 创建时间戳（毫秒）
>   updatedAt: number; // 更新时间戳（毫秒）
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "Tag created successfully",
    "tag": {
      "tagId": "tag_123456",
      "uid": "user_123456",
      "name": "技术",
      "createdAt": 1704067200000,
      "updatedAt": 1704067200000
    }
  }
}
```

**Error Responses:**

| Status | Description                     |
| ------ | ------------------------------- |
| 401    | 未授权                          |
| 2      | PARAMS_ERROR - 标签名称不能为空 |
| 500    | 数据库错误                      |

---

### 4. Update Tag

**PUT** `/api/v1/tags/:tagId`

更新标签信息。

#### Request

**Headers:**

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| tagId     | string | 标签 ID     |

**Body Parameters (JSON):**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| name      | string | No       | 标签名称    |

**Example Request:**

```bash
curl -X PUT http://localhost:3000/api/v1/tags/tag_123456 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "name": "新技术"
  }'
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<{ tag: TagDto }>`
>
> **TagDto 类型定义:**
>
> ```typescript
> interface TagDto {
>   tagId: string; // 标签唯一标识符
>   uid: string; // 用户唯一标识符
>   name: string; // 标签名称
>   createdAt: number; // 创建时间戳（毫秒）
>   updatedAt: number; // 更新时间戳（毫秒）
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "Tag updated successfully",
    "tag": {
      "tagId": "tag_123456",
      "uid": "user_123456",
      "name": "新技术",
      "createdAt": 1704067200000,
      "updatedAt": 1704153600000
    }
  }
}
```

**Error Responses:**

| Status | Description                     |
| ------ | ------------------------------- |
| 401    | 未授权                          |
| 2      | PARAMS_ERROR - 标签名称不能为空 |
| 404    | 标签不存在                      |
| 500    | 数据库错误                      |

---

### 5. Delete Tag

**DELETE** `/api/v1/tags/:tagId`

删除标签。

#### Request

**Headers:**

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| tagId     | string | 标签 ID     |

**Example Request:**

```bash
curl -X DELETE http://localhost:3000/api/v1/tags/tag_123456 \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "Tag deleted successfully"
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 401    | 未授权      |
| 404    | 标签不存在  |
| 500    | 数据库错误  |

---

## Error Codes Reference

| Code | Meaning                 |
| ---- | ----------------------- |
| 2    | PARAMS_ERROR - 参数错误 |
| 4    | UNAUTHORIZED - 未授权   |
| 5    | NOT_FOUND - 资源不存在  |
| 2000 | DB_ERROR - 数据库错误   |
