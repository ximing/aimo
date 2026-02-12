# Auth API

Base URL: `/api/v1/auth`

认证相关的 API 端点，包括用户注册和登录功能。

---

## Endpoints

### 1. Register User

**POST** `/api/v1/auth/register`

注册新用户账户。

#### Request

**Body Parameters (JSON):**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| email     | string | Yes      | 用户邮箱    |
| password  | string | Yes      | 用户密码    |
| nickname  | string | No       | 用户昵称    |
| phone     | string | No       | 用户电话    |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "nickname": "John Doe",
    "phone": "+1234567890"
  }'
```

#### Response

**Success Response (200 OK):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "user": {
      "uid": "user_123456",
      "email": "user@example.com",
      "nickname": "John Doe"
    }
  }
}
```

**Error Responses:**

| Error Code | Status | Description                     |
| ---------- | ------ | ------------------------------- |
| 4001       | 400    | Email and password are required |
| 4011       | 409    | User already exists             |
| 5001       | 500    | Database error                  |

---

### 2. Login User

**POST** `/api/v1/auth/login`

用户登录，获取 JWT token。

#### Request

**Body Parameters (JSON):**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| email     | string | Yes      | 用户邮箱    |
| password  | string | Yes      | 用户密码    |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

#### Response

**Success Response (200 OK):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "uid": "user_123456",
      "email": "user@example.com",
      "nickname": "John Doe"
    }
  }
}
```

**Response Headers:**

```
Set-Cookie: aimo_token=<jwt_token>; HttpOnly; Path=/; Max-Age=7776000; Secure; SameSite=Lax
```

Token 会同时在响应体和 Cookie 中返回，有效期为 90 天。

**Error Responses:**

| Error Code | Status | Description                     |
| ---------- | ------ | ------------------------------- |
| 4001       | 400    | Email and password are required |
| 4004       | 404    | User not found                  |
| 4010       | 401    | Password error                  |
| 5001       | 500    | Database error                  |

---

## Authentication

登录后，需要在后续请求中包含 JWT token：

**Option 1: 使用 Cookie（推荐）**

登录成功后，token 会自动存储在 Cookie 中，后续请求会自动发送。

**Option 2: 使用 Authorization Header**

```bash
curl -X GET http://localhost:3000/api/v1/user/info \
  -H "Authorization: Bearer <jwt_token>"
```

---

## Error Codes Reference

| Code | Meaning                          |
| ---- | -------------------------------- |
| 4001 | PARAMS_ERROR - 参数错误          |
| 4004 | USER_NOT_FOUND - 用户不存在      |
| 4010 | PASSWORD_ERROR - 密码错误        |
| 4011 | USER_ALREADY_EXISTS - 用户已存在 |
| 5001 | DB_ERROR - 数据库错误            |
