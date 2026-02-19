# Category API

Base URL: `/api/v1/categories`

分类管理相关的 API 端点，用于组织和管理笔记分类。

**认证要求：** 所有端点都需要有效的 JWT token

---

## Endpoints

### 1. Get Categories

**GET** `/api/v1/categories`

获取当前用户的所有分类列表。

#### Request

**Headers:**

| Header | Required | Description |
| ------ | -------- | ----------- |
| Authorization | Yes | JWT Token |

**Example Request:**

```bash
curl -X GET http://localhost:3000/api/v1/categories \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<{ categories: CategoryDto[] }>`
>
> **CategoryDto 类型定义:**
> ```typescript
> interface CategoryDto {
>   categoryId: string;   // 分类唯一标识符
>   uid: string;          // 用户唯一标识符
>   name: string;         // 分类名称
>   color?: string;       // 分类颜色（十六进制）
>   createdAt: number;    // 创建时间戳（毫秒）
>   updatedAt: number;    // 更新时间戳（毫秒）
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "categories": [
      {
        "categoryId": "category_123456",
        "uid": "user_123456",
        "name": "工作",
        "color": "#FF5722",
        "createdAt": 1704067200000,
        "updatedAt": 1704067200000
      },
      {
        "categoryId": "category_789012",
        "uid": "user_123456",
        "name": "生活",
        "color": "#4CAF50",
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

### 2. Get Category by ID

**GET** `/api/v1/categories/:categoryId`

获取单个分类的详细信息。

#### Request

**Headers:**

| Header | Required | Description |
| ------ | -------- | ----------- |
| Authorization | Yes | JWT Token |

**Path Parameters:**

| Parameter   | Type   | Description |
| ----------- | ------ | ----------- |
| categoryId  | string | 分类 ID     |

**Example Request:**

```bash
curl -X GET http://localhost:3000/api/v1/categories/category_123456 \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<{ category: CategoryDto }>`
>
> **CategoryDto 类型定义:**
> ```typescript
> interface CategoryDto {
>   categoryId: string;   // 分类唯一标识符
>   uid: string;          // 用户唯一标识符
>   name: string;         // 分类名称
>   color?: string;       // 分类颜色（十六进制）
>   createdAt: number;    // 创建时间戳（毫秒）
>   updatedAt: number;    // 更新时间戳（毫秒）
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "category": {
      "categoryId": "category_123456",
      "uid": "user_123456",
      "name": "工作",
      "color": "#FF5722",
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
| 404    | 分类不存在  |
| 500    | 数据库错误  |

---

### 3. Create Category

**POST** `/api/v1/categories`

创建新分类。

#### Request

**Headers:**

| Header | Required | Description |
| ------ | -------- | ----------- |
| Authorization | Yes | JWT Token |

**Body Parameters (JSON):**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| name      | string | Yes      | 分类名称     |
| color     | string | No       | 分类颜色     |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/v1/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "name": "技术",
    "color": "#2196F3"
  }'
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<{ category: CategoryDto }>`
>
> **CategoryDto 类型定义:**
> ```typescript
> interface CategoryDto {
>   categoryId: string;   // 分类唯一标识符
>   uid: string;          // 用户唯一标识符
>   name: string;         // 分类名称
>   color?: string;       // 分类颜色（十六进制）
>   createdAt: number;    // 创建时间戳（毫秒）
>   updatedAt: number;    // 更新时间戳（毫秒）
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "category": {
      "categoryId": "category_new_123456",
      "uid": "user_123456",
      "name": "技术",
      "color": "#2196F3",
      "createdAt": 1704067200000,
      "updatedAt": 1704067200000
    }
  }
}
```

**Error Responses:**

| Status | Description            |
| ------ | --------------------- |
| 400    | 分类名称为空           |
| 401    | 未授权                 |
| 409    | 分类已存在             |
| 500    | 数据库错误             |

---

### 4. Update Category

**PUT** `/api/v1/categories/:categoryId`

更新分类信息。

#### Request

**Headers:**

| Header | Required | Description |
| ------ | -------- | ----------- |
| Authorization | Yes | JWT Token |

**Path Parameters:**

| Parameter   | Type   | Description |
| ----------- | ------ | ----------- |
| categoryId  | string | 分类 ID     |

**Body Parameters (JSON):**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| name      | string | No       | 分类名称     |
| color     | string | No       | 分类颜色（传 `null` 清空） |

**Example Request:**

```bash
curl -X PUT http://localhost:3000/api/v1/categories/category_123456 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "name": "工作项目",
    "color": "#FF9800"
  }'
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<{ category: CategoryDto }>`
>
> **CategoryDto 类型定义:**
> ```typescript
> interface CategoryDto {
>   categoryId: string;   // 分类唯一标识符
>   uid: string;          // 用户唯一标识符
>   name: string;         // 分类名称
>   color?: string;       // 分类颜色（十六进制）
>   createdAt: number;    // 创建时间戳（毫秒）
>   updatedAt: number;    // 更新时间戳（毫秒）
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "category": {
      "categoryId": "category_123456",
      "uid": "user_123456",
      "name": "工作项目",
      "color": "#FF9800",
      "createdAt": 1704067200000,
      "updatedAt": 1704067201000
    }
  }
}
```

**Error Responses:**

| Status | Description            |
| ------ | --------------------- |
| 401    | 未授权                 |
| 404    | 分类不存在             |
| 409    | 分类名称已存在         |
| 500    | 数据库错误             |

---

### 5. Delete Category

**DELETE** `/api/v1/categories/:categoryId`

删除分类（会清空该分类下笔记的分类字段）。

#### Request

**Headers:**

| Header | Required | Description |
| ------ | -------- | ----------- |
| Authorization | Yes | JWT Token |

**Path Parameters:**

| Parameter   | Type   | Description |
| ----------- | ------ | ----------- |
| categoryId  | string | 分类 ID     |

**Example Request:**

```bash
curl -X DELETE http://localhost:3000/api/v1/categories/category_123456 \
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
    "message": "Category deleted successfully"
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 401    | 未授权      |
| 404    | 分类不存在  |
| 500    | 数据库错误  |

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

| Code | HTTP Status | Meaning                      |
| ---- | ---------- | ---------------------------- |
| 4001 | 400        | PARAMS_ERROR - 参数错误      |
| 4004 | 404        | NOT_FOUND - 资源不存在      |
| 4010 | 401        | UNAUTHORIZED - 未授权        |
| 4090 | 409        | CATEGORY_ALREADY_EXISTS - 分类已存在 |
| 5001 | 500        | DB_ERROR - 数据库错误        |
