# Memo BA API

Base URL: `/api/v1/memos/ba`

BA (Basic Auth) 认证的笔记 API 端点，用于无需 JWT Token 的场景。

**认证要求：** 需要设置以下环境变量：

| 环境变量 | 描述 |
| -------- | ---- |
| `BA_AUTH_ENABLED` | 设置为 `true` 启用 BA 认证 |
| `BA_AUTH_TOKEN` | BA 认证的 Token |

如果 `BA_AUTH_ENABLED` 未设置为 `true`，所有端点将返回 401。

---

## Endpoints

### 1. Create Memo (BA)

**POST** `/api/v1/memos/ba/create`

通过 BA 认证创建笔记。用户 ID 通过查询参数传入，无需 JWT Token。

#### Request

**Headers:**

| Header         | Required | Description                |
| -------------- | -------- | -------------------------- |
| Authorization  | Yes     BA | Bearer Token (_AUTH_TOKEN) |
| Content-Type   | Yes      | application/json           |

**Query Parameters:**

| Parameter | Type   | Required | Description        |
| --------- | ------ | -------- | ------------------ |
| uid       | string | Yes      | 用户唯一标识符     |

**Body Parameters:**

| Parameter    | Type        | Required | Description                                    |
| ------------ | ----------- | -------- | -------------------------------------------- |
| content      | string      | Yes      | 笔记内容                                      |
| type         | string      | No       | 笔记类型：`text`、`audio`、`video`，默认 `text` |
| categoryId   | string      | No       | 分类 ID                                       |
| isPublic     | boolean     | No       | 是否公开                                      |
| tags         | string[]    | No       | 标签名称数组                                  |
| tagIds       | string[]    | No       | 标签 ID 数组                                  |
| attachments  | object[]    | No       | 附件列表                                      |
| relationIds  | string[]    | No       | 关联笔记 ID 数组                              |
| source       | string      | No       | 来源标记                                      |
| createdAt    | number      | No       | 创建时间戳（毫秒）                            |
| updatedAt    | number      | No       | 更新时间戳（毫秒）                            |

**Example Request:**

```bash
curl -X POST "http://localhost:3000/api/v1/memos/ba/create?uid=user123" \
  -H "Authorization: Bearer your-ba-auth-token" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello World",
    "type": "text",
    "tags": ["important", "todo"]
  }'
```

#### Response

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Memo created successfully via BA authentication",
    "memo": {
      "memoId": "memo_xxx",
      "uid": "user123",
      "content": "Hello World",
      "type": "text",
      "tags": [
        {
          "tagId": "tag_xxx",
          "uid": "user123",
          "name": "important",
          "createdAt": 1700000000000,
          "updatedAt": 1700000000000
        }
      ],
      "isPublic": false,
      "createdAt": 1700000000000,
      "updatedAt": 1700000000000
    }
  }
}
```

**Error Responses:**

| Status Code | Description                                      |
| ----------- | ------------------------------------------------ |
| 401         | BA 认证未启用 / Token 无效 / Token 缺失          |
| 400         | 参数错误（缺少 uid 或 content）                  |
| 404         | 用户不存在                                       |
| 500         | 服务器错误                                       |

**401 (BA Not Enabled):**

```json
{
  "success": false,
  "message": "BA authentication is not configured"
}
```

**401 (Invalid Token):**

```json
{
  "success": false,
  "message": "Invalid token"
}
```

**400 (Missing UID):**

```json
{
  "success": false,
  "message": "User ID (uid) is required",
  "errorCode": "PARAMS_ERROR"
}
```

**400 (Missing Content):**

```json
{
  "success": false,
  "message": "Content is required",
  "errorCode": "PARAMS_ERROR"
}
```

**404 (User Not Found):**

```json
{
  "success": false,
  "message": "User not found",
  "errorCode": "NOT_FOUND"
}
```
