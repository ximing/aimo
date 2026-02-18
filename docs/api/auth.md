# Auth API

Base URL: `/api/v1/auth`

用户认证相关的 API 端点，包括用户注册和登录功能。

**认证要求：** 公开端点，无需认证即可访问

---

## Endpoints

### 1. Register

**POST** `/api/v1/auth/register`

注册新用户账号。

#### Request

**Body Parameters (JSON):**

| Parameter | Type   | Required | Description      |
| --------- | ------ | -------- | ---------------- |
| email     | string | Yes      | 用户邮箱         |
| password  | string | Yes      | 用户密码         |
| nickname  | string | No       | 用户昵称         |
| phone     | string | No       | 手机号码         |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your-password",
    "nickname": "User Nickname"
  }'
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<{ user: UserInfoDto }>`
>
> **UserInfoDto 类型定义:**
> ```typescript
> interface UserInfoDto {
>   uid: string;           // 用户唯一标识符
>   email?: string;       // 用户邮箱
>   nickname?: string;    // 用户昵称
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "user": {
      "uid": "user_123456",
      "email": "user@example.com",
      "nickname": "User Nickname"
    }
  }
}
```

**Error Responses:**

| Status | Description                 |
| ------ | --------------------------- |
| 400    | 参数错误 (邮箱或密码为空)   |
| 500    | 数据库错误或用户已存在      |

---

### 2. Login

**POST** `/api/v1/auth/login`

用户登录，获取 JWT token。

#### Request

**Body Parameters (JSON):**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| email     | string | Yes     | 用户邮箱    |
| password  | string | Yes     | 用户密码    |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your-password"
  }'
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<LoginResponseDto>`
>
> **LoginResponseDto 类型定义:**
> ```typescript
> interface UserInfoDto {
>   uid: string;           // 用户唯一标识符
>   email?: string;       // 用户邮箱
>   nickname?: string;    // 用户昵称
> }
>
> interface LoginResponseDto {
>   token: string;         // JWT 访问令牌
>   user: UserInfoDto;     // 用户信息
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "uid": "user_123456",
      "email": "user@example.com",
      "nickname": "User Nickname"
    }
  }
}
```

**Response Headers:**

登录成功后，token 会被设置为 HTTP-only Cookie：
```
Set-Cookie: aimo_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=7776000000
```

**Error Responses:**

| Status | Description        |
| ------ | ------------------ |
| 400    | 参数错误           |
| 401    | 用户不存在或密码错误 |
| 500    | 数据库错误        |

---

## Authentication

登录成功后，访问需要认证的 API 需要在请求头中包含 token：

```bash
Authorization: Bearer <jwt_token>
```

或通过 Cookie 自动发送：

```
Cookie: aimo_token=<jwt_token>
```

Token 有效期为 90 天。

---

## Error Codes Reference

| Code | HTTP Status | Meaning                       |
| ---- | ---------- | ----------------------------- |
| 4001 | 400        | PARAMS_ERROR - 参数错误       |
| 4003 | 409        | USER_ALREADY_EXISTS - 用户已存在 |
| 4010 | 401        | UNAUTHORIZED - 未授权         |
| 5001 | 500        | DB_ERROR - 数据库错误         |
