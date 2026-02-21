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
>   email?: string;     // 用户邮箱
>   nickname?: string;  // 用户昵称
>   avatar?: string;    // 用户头像 URL
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "uid": "user_123456",
    "email": "user@example.com",
    "nickname": "User Nickname",
    "avatar": "https://example.com/avatar.png"
  }
}
```

**Error Responses:**

| Code | Meaning |
| ---- | ------- |
| 4    | UNAUTHORIZED - 未授权 |
| 1000 | USER_NOT_FOUND - 用户不存在 |
| 2000 | DB_ERROR - 数据库错误 |

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
>   email?: string;     // 用户邮箱
>   nickname?: string;  // 用户昵称
>   avatar?: string;    // 用户头像 URL
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
      "nickname": "New Nickname",
      "avatar": "https://example.com/avatar.png"
    }
  }
}
```

**Error Responses:**

| Code | Meaning |
| ---- | ------- |
| 4    | UNAUTHORIZED - 未授权 |
| 1000 | USER_NOT_FOUND - 用户不存在 |
| 2000 | DB_ERROR - 数据库错误 |

---

### 3. Upload Avatar

**POST** `/api/v1/user/avatar`

上传当前用户头像（图片文件）。请求使用 `multipart/form-data`，字段名为 `avatar`。

#### Request

**Headers:**

| Header | Required | Description |
| ------ | -------- | ----------- |
| Authorization | Yes | JWT Token |

**Body Parameters (form-data):**

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| avatar | file | Yes | 图片文件（`image/*`，默认最大 50MB） |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/v1/user/avatar \
  -H "Authorization: Bearer <jwt_token>" \
  -F "avatar=@/path/to/avatar.png"
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<{ message: string; avatar: string }>`

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "Avatar uploaded successfully",
    "avatar": "https://example.com/avatar.png"
  }
}
```

**Error Responses:**

| Code | Meaning |
| ---- | ------- |
| 2    | PARAMS_ERROR - No file uploaded |
| 4    | UNAUTHORIZED - 未授权 |
| 4000 | FILE_TOO_LARGE - 文件过大 |
| 4001 | UNSUPPORTED_FILE_TYPE - 仅支持图片文件 |
| 4003 | STORAGE_ERROR - 存储错误 |
| 4004 | FILE_UPLOAD_ERROR - 文件上传失败 |

---

### 4. Change Password

**POST** `/api/v1/user/password`

修改当前登录用户的密码。

#### Request

**Headers:**

| Header | Required | Description |
| ------ | -------- | ----------- |
| Authorization | Yes | JWT Token |

**Body Parameters (JSON):**

> **Request Type:** `ChangePasswordDto`
>
> **ChangePasswordDto 类型定义:**
> ```typescript
> interface ChangePasswordDto {
>   oldPassword: string;  // 当前密码
>   newPassword: string; // 新密码（至少6位）
> }
> ```

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| oldPassword | string | Yes | 当前密码 |
| newPassword | string | Yes | 新密码（至少6位） |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/v1/user/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "oldPassword": "oldPassword123",
    "newPassword": "newPassword456"
  }'
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<{ message: string }>`

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "密码修改成功"
  }
}
```

**Error Responses:**

| Code | Meaning |
| ---- | ------- |
| 2    | PARAMS_ERROR - 请填写完整信息或新密码长度至少6位 |
| 4    | UNAUTHORIZED - 未授权 |
| 1002 | PASSWORD_ERROR - 当前密码错误 |
| 2000 | DB_ERROR - 数据库错误 |

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

| Code | Meaning |
| ---- | ------- |
| 2    | PARAMS_ERROR - 参数错误 |
| 4    | UNAUTHORIZED - 未授权 |
| 1000 | USER_NOT_FOUND - 用户不存在 |
| 1002 | PASSWORD_ERROR - 密码错误 |
| 2000 | DB_ERROR - 数据库错误 |
| 4000 | FILE_TOO_LARGE - 文件过大 |
| 4001 | UNSUPPORTED_FILE_TYPE - 不支持的文件类型 |
| 4003 | STORAGE_ERROR - 存储错误 |
| 4004 | FILE_UPLOAD_ERROR - 文件上传失败 |
