# User API

Base URL: `/api/v1/user`

用户信息管理相关的 API 端点。

**认证要求：** 所有端点都需要有效的 JWT token

---

## Endpoints

### 1. Get User Info

**GET** `/api/v1/user/info`

获取当前登录用户的信息。

#### Request

**Headers:**

| Header | Required | Description |
| ------ | -------- | ----------- |
| Authorization | Yes | JWT Token |

**Example Request:**

```bash
curl -X GET http://localhost:3000/api/v1/user/info \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<UserInfoDto>`
>
> **UserInfoDto 类型定义:**
> ```typescript
> interface UserInfoDto {
>   uid: string;        // 用户唯一标识符
>   email?: string;      // 用户邮箱
>   nickname?: string;   // 用户昵称
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "uid": "user_123456",
    "email": "user@example.com",
    "nickname": "User Nickname"
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 401    | 未授权      |
| 500    | 数据库错误 |

---

### 2. Update User Info

**PUT** `/api/v1/user/info`

更新当前登录用户的信息。

#### Request

**Headers:**

| Header | Required | Description |
| ------ | -------- | ----------- |
| Authorization | Yes | JWT Token |

**Body Parameters (JSON):**

> **Request Type:** `UpdateUserDto`
>
> **UpdateUserDto 类型定义:**
> ```typescript
> interface UpdateUserDto {
>   nickname?: string;   // 用户昵称
>   avatar?: string;     // 用户头像 URL
> }
> ```

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| nickname  | string | No       | 用户昵称    |
| avatar    | string | No       | 用户头像 URL |

**Example Request:**

```bash
curl -X PUT http://localhost:3000/api/v1/user/info \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "nickname": "New Nickname"
  }'
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<{ message: string; user: UserInfoDto }>`
>
> **UserInfoDto 类型定义:**
> ```typescript
> interface UserInfoDto {
>   uid: string;        // 用户唯一标识符
>   email?: string;      // 用户邮箱
>   nickname?: string;   // 用户昵称
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "User info updated successfully",
    "user": {
      "uid": "user_123456",
      "email": "user@example.com",
      "nickname": "New Nickname"
    }
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 401    | 未授权      |
| 404    | 用户不存在  |
| 500    | 数据库错误 |

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

| Code | HTTP Status | Meaning                 |
| ---- | ---------- | ----------------------- |
| 4010 | 401        | UNAUTHORIZED - 未授权   |
| 4004 | 404        | NOT_FOUND - 用户不存在  |
| 5001 | 500        | DB_ERROR - 数据库错误   |
