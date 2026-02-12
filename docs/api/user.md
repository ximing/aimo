# User API

Base URL: `/api/v1/user`

用户相关的 API 端点，包括获取和更新用户信息。

**认证要求：** 所有端点都需要有效的 JWT token

---

## Endpoints

### 1. Get User Info

**GET** `/api/v1/user/info`

获取当前登录用户的信息。

#### Request

**Headers:**

```bash
Authorization: Bearer <jwt_token>
```

**Example Request:**

```bash
curl -X GET http://localhost:3000/api/v1/user/info \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "uid": "user_123456",
    "email": "user@example.com",
    "nickname": "John Doe"
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | 未授权，需要登录 |
| 404 | 用户不存在 |
| 500 | 数据库错误 |

---

### 2. Update User Info

**PUT** `/api/v1/user/info`

更新当前登录用户的信息。

#### Request

**Headers:**

```bash
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body Parameters (JSON):**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| email | string | No | 用户邮箱 |
| nickname | string | No | 用户昵称 |
| phone | string | No | 用户电话 |

至少需要提供一个参数。

**Example Request:**

```bash
curl -X PUT http://localhost:3000/api/v1/user/info \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "nickname": "Jane Doe",
    "phone": "+1987654321"
  }'
```

#### Response

**Success Response (200 OK):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "User info updated successfully",
    "user": {
      "uid": "user_123456",
      "email": "user@example.com",
      "nickname": "Jane Doe"
    }
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | 未授权，需要登录 |
| 404 | 用户不存在 |
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

## Notes

- 用户信息中不包含敏感信息如密码和盐值
- 邮箱通常不可在更新时修改（取决于后端业务逻辑）
- 昵称和电话可以更新为空值（取决于后端验证规则）

---

## Error Codes Reference

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| 4004 | 404 | NOT_FOUND - 用户不存在 |
| 4010 | 401 | UNAUTHORIZED - 未授权 |
| 5001 | 500 | DB_ERROR - 数据库错误 |

