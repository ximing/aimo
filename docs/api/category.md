# Category API

Base URL: `/api/v1/categories`

分类相关的 API 端点，包括创建、读取、更新和删除分类。

**认证要求：** 所有端点都需要有效的 JWT token

---

## Endpoints

### 1. Get Categories (List)

**GET** `/api/v1/categories`

获取当前用户的所有分类。

#### Request

**Headers:**

```bash
Authorization: Bearer <jwt_token>
```

**Example Request:**

```bash
curl -X GET http://localhost:3000/api/v1/categories \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "Categories fetched successfully",
    "categories": [
      {
        "categoryId": "category_123456",
        "uid": "user_123456",
        "name": "工作",
        "color": "#4CAF50",
        "description": "工作相关的笔记",
        "createdAt": 1704067200000,
        "updatedAt": 1704067200000
      },
      {
        "categoryId": "category_789012",
        "uid": "user_123456",
        "name": "学习",
        "color": "#2196F3",
        "description": "学习相关的笔记",
        "createdAt": 1704067300000,
        "updatedAt": 1704067300000
      }
    ]
  }
}
```

**Error Responses:**

| HTTP Status | Description |
| ----------- | ----------- |
| 401         | 未授权      |
| 500         | 数据库错误  |

---

### 2. Get Category by ID

**GET** `/api/v1/categories/:categoryId`

获取单个分类的详细信息。

#### Request

**Headers:**

```bash
Authorization: Bearer <jwt_token>
```

**Path Parameters:**

| Parameter  | Type   | Description |
| ---------- | ------ | ----------- |
| categoryId | string | 分类 ID     |

**Example Request:**

```bash
curl -X GET http://localhost:3000/api/v1/categories/category_123456 \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "Category fetched successfully",
    "category": {
      "categoryId": "category_123456",
      "uid": "user_123456",
      "name": "工作",
      "color": "#4CAF50",
      "description": "工作相关的笔记",
      "createdAt": 1704067200000,
      "updatedAt": 1704067200000
    }
  }
}
```

**Error Responses:**

| HTTP Status | Description |
| ----------- | ----------- |
| 401         | 未授权      |
| 404         | 分类不存在  |
| 500         | 数据库错误  |

---

### 3. Create Category

**POST** `/api/v1/categories`

创建新分类。

#### Request

**Headers:**

```bash
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body Parameters (JSON):**

| Parameter   | Type   | Required | Description                        |
| ----------- | ------ | -------- | ---------------------------------- |
| name        | string | Yes      | 分类名称                           |
| color       | string | No       | 分类颜色（十六进制格式如 #4CAF50） |
| description | string | No       | 分类描述                           |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/v1/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "name": "生活",
    "color": "#FF9800",
    "description": "生活相关的笔记"
  }'
```

#### Response

**Success Response (200 OK):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "Category created successfully",
    "category": {
      "categoryId": "category_new_123456",
      "uid": "user_123456",
      "name": "生活",
      "color": "#FF9800",
      "description": "生活相关的笔记",
      "createdAt": 1704067200000,
      "updatedAt": 1704067200000
    }
  }
}
```

**Error Responses:**

| HTTP Status | Description  |
| ----------- | ------------ |
| 400         | 分类名称为空 |
| 401         | 未授权       |
| 500         | 数据库错误   |

---

### 4. Update Category

**PUT** `/api/v1/categories/:categoryId`

更新分类信息。

#### Request

**Headers:**

```bash
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Path Parameters:**

| Parameter  | Type   | Description |
| ---------- | ------ | ----------- |
| categoryId | string | 分类 ID     |

**Body Parameters (JSON):**

| Parameter   | Type   | Required | Description              |
| ----------- | ------ | -------- | ------------------------ |
| name        | string | No       | 分类名称                 |
| color       | string | No       | 分类颜色（十六进制格式） |
| description | string | No       | 分类描述                 |

至少需要提供一个参数。

**Example Request:**

```bash
curl -X PUT http://localhost:3000/api/v1/categories/category_123456 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "name": "工作和学习",
    "color": "#9C27B0"
  }'
```

#### Response

**Success Response (200 OK):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "Category updated successfully",
    "category": {
      "categoryId": "category_123456",
      "uid": "user_123456",
      "name": "工作和学习",
      "color": "#9C27B0",
      "description": "工作相关的笔记",
      "createdAt": 1704067200000,
      "updatedAt": 1704067201000
    }
  }
}
```

**Error Responses:**

| HTTP Status | Description |
| ----------- | ----------- |
| 401         | 未授权      |
| 404         | 分类不存在  |
| 500         | 数据库错误  |

---

### 5. Delete Category

**DELETE** `/api/v1/categories/:categoryId`

删除分类。

#### Request

**Headers:**

```bash
Authorization: Bearer <jwt_token>
```

**Path Parameters:**

| Parameter  | Type   | Description |
| ---------- | ------ | ----------- |
| categoryId | string | 分类 ID     |

**Example Request:**

```bash
curl -X DELETE http://localhost:3000/api/v1/categories/category_123456 \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

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

| HTTP Status | Description |
| ----------- | ----------- |
| 401         | 未授权      |
| 404         | 分类不存在  |
| 500         | 数据库错误  |

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

## Color Scheme Examples

常用的分类颜色建议：

| 颜色 | 十六进制 | 用途 |
| ---- | -------- | ---- |
| 绿色 | #4CAF50  | 工作 |
| 蓝色 | #2196F3  | 学习 |
| 橙色 | #FF9800  | 生活 |
| 紫色 | #9C27B0  | 创意 |
| 红色 | #F44336  | 紧急 |
| 青色 | #00BCD4  | 项目 |
| 粉色 | #E91E63  | 个人 |
| 靛蓝 | #3F51B5  | 笔记 |

---

## Notes

- 每个分类只属于创建它的用户
- 删除分类不会删除该分类下的笔记，笔记的 categoryId 会被清空
- 颜色格式应为标准的十六进制颜色值（#RRGGBB）

---

## Error Codes Reference

| Code | HTTP Status | Meaning                 |
| ---- | ----------- | ----------------------- |
| 4001 | 400         | PARAMS_ERROR - 参数错误 |
| 4004 | 404         | NOT_FOUND - 资源不存在  |
| 4010 | 401         | UNAUTHORIZED - 未授权   |
| 5001 | 500         | DB_ERROR - 数据库错误   |
