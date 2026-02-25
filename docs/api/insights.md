# Insights API

Base URL: `/api/v1/insights`

统计与推荐相关的 API 端点，包括活动热力图、历史上的今天与每日推荐。

**认证要求：** 所有端点都需要有效的 JWT token

---

## Endpoints

### 1. Get Activity Stats

**GET** `/api/v1/insights/activity`

获取笔记活动统计数据（过去 N 天的创建统计）。

#### Request

**Headers:**

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Query Parameters:**

| Parameter | Type   | Default | Description      |
| --------- | ------ | ------- | ---------------- |
| days      | number | 90      | 统计天数 (1-365) |

> 服务端会将 days 限制在 1-365 之间。

**Example Request:**

```bash
curl -X GET "http://localhost:3000/api/v1/insights/activity?days=90" \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<MemoActivityStatsDto>`
>
> **MemoActivityStatsDto 类型定义:**
>
> ```typescript
> interface MemoActivityStatsItemDto {
>   date: string; // ISO 日期字符串 (YYYY-MM-DD)
>   count: number; // 该日期创建的笔记数量
> }
>
> interface MemoActivityStatsDto {
>   items: MemoActivityStatsItemDto[]; // 每日活动统计列表
>   startDate: string; // 统计开始日期（ISO 格式）
>   endDate: string; // 统计结束日期（ISO 格式）
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "date": "2024-01-01",
        "count": 5
      }
    ],
    "startDate": "2024-01-01",
    "endDate": "2024-03-31"
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 401    | 未授权      |
| 500    | 数据库错误  |

---

### 2. Get On This Day Memos

**GET** `/api/v1/insights/on-this-day`

获取历史上的今天创建的笔记。

#### Request

**Headers:**

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Example Request:**

```bash
curl -X GET http://localhost:3000/api/v1/insights/on-this-day \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<OnThisDayResponseDto>`
>
> **OnThisDayResponseDto 类型定义:**
>
> ```typescript
> interface OnThisDayMemoDto {
>   memoId: string; // 笔记唯一标识符
>   content: string; // 笔记内容
>   createdAt: number; // 创建时间戳（毫秒）
>   year: number; // 创建年份
> }
>
> interface OnThisDayResponseDto {
>   items: OnThisDayMemoDto[]; // 历史上的今天创建的笔记列表
>   total: number; // 总数量
>   todayMonthDay: string; // 当天月日（MM-DD 格式）
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "memoId": "memo_123456",
        "content": "去年今天的笔记...",
        "createdAt": 1704067200000,
        "year": 2023
      }
    ],
    "total": 3,
    "todayMonthDay": "02-18"
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 401    | 未授权      |
| 500    | 数据库错误  |

---

### 3. Get Daily Recommendations

**GET** `/api/v1/insights/daily-recommendations`

获取每日推荐笔记，通常返回 3 条内容（按天缓存）。

#### Request

**Headers:**

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Example Request:**

```bash
curl -X GET http://localhost:3000/api/v1/insights/daily-recommendations \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<{ items: MemoListItemDto[]; total: number }>`
>
> **MemoListItemDto 类型定义:**
>
> ```typescript
> interface AttachmentDto {
>   attachmentId: string; // 附件唯一标识符
>   filename: string; // 文件名
>   url: string; // 访问 URL（存储访问地址）
>   type: string; // MIME 类型
>   size: number; // 文件大小（字节）
>   createdAt: number; // 创建时间戳（毫秒）
>   properties?: Record<string, unknown>; // 附件属性：audio(duration), image(width,height), video(duration)
> }
>
> interface MemoListItemDto {
>   memoId: string; // 笔记唯一标识符
>   uid: string; // 用户唯一标识符
>   content: string; // 笔记内容
>   type: 'text' | 'audio' | 'video'; // 笔记类型
>   categoryId?: string; // 分类 ID
>   attachments?: AttachmentDto[]; // 附件列表
>   relations?: MemoListItemDto[]; // 相关笔记
>   createdAt: number; // 创建时间戳（毫秒）
>   updatedAt: number; // 更新时间戳（毫秒）
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "memoId": "memo_123456",
        "uid": "user_123456",
        "content": "今日推荐笔记...",
        "type": "text",
        "categoryId": "category_123456",
        "attachments": [],
        "relations": [],
        "createdAt": 1704067200000,
        "updatedAt": 1704067200000
      }
    ],
    "total": 3
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 401    | 未授权      |
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

| Code | HTTP Status | Meaning                 |
| ---- | ----------- | ----------------------- |
| 4001 | 400         | PARAMS_ERROR - 参数错误 |
| 4004 | 404         | NOT_FOUND - 资源不存在  |
| 4010 | 401         | UNAUTHORIZED - 未授权   |
| 5001 | 500         | DB_ERROR - 数据库错误   |
