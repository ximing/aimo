# AI API

Base URL: `/api/v1/ai`

AI 功能相关的 API 端点，提供智能标签生成等功能。

**认证要求：** 所有端点都需要有效的 JWT token

---

## Endpoints

### 1. Generate Tags

**POST** `/api/v1/ai/generate-tags`

使用 AI 分析笔记内容，自动生成相关标签建议。

#### Request

**Headers:**

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Body Parameters (JSON):**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| content   | string | Yes      | 笔记内容    |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/v1/ai/generate-tags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "content": "今天学习了 React 19 的新特性，包括 Server Components 和 Actions"
  }'
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<{ tags: string[] }>`
>
> **Response 说明:**
>
> - 返回 3-8 个与内容相关的标签建议
> - 标签基于 AI 对内容的语义分析生成

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "tags": ["React", "前端开发", "技术学习", "JavaScript"]
  }
}
```

**Error Responses:**

| Status | Description                |
| ------ | -------------------------- |
| 401    | 未授权                     |
| 2      | PARAMS为空                 |
| 500    | 系统\_ERROR - 内容不能错误 |

---

### 2. Get Available AI Tools

**GET** `/api/v1/ai/tools`

获取当前可用的 AI 工具列表。

#### Request

**Headers:**

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Example Request:**

```bash
curl -X GET http://localhost:3000/api/v1/ai/tools \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<{ tools: AIToolConfigDto[] }>`
>
> **AIToolConfigDto 类型定义:**
>
> ```typescript
> interface AIToolConfigDto {
>   id: string; // 工具唯一标识符
>   name: string; // 工具名称
>   description: string; // 工具描述
>   icon: string; // 图标名称
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "tools": [
      {
        "id": "generate-tags",
        "name": "智能添加标签",
        "description": "AI 分析笔记内容，自动生成相关标签建议",
        "icon": "Tags"
      }
    ]
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 401    | 未授权      |

---

## Error Codes Reference

| Code | Meaning                 |
| ---- | ----------------------- |
| 2    | PARAMS_ERROR - 参数错误 |
| 4    | UNAUTHORIZED - 未授权   |
| 500  | SYSTEM_ERROR - 系统错误 |
