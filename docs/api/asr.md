# ASR API

Base URL: `/api/v1/asr`

语音转文字（ASR）相关的 API 端点，基于 Fun-ASR 进行异步转写任务管理。

**认证要求：** 所有端点都需要有效的 JWT token

---

## Endpoints

### 1. Submit Transcription Task

**POST** `/api/v1/asr/transcribe`

提交异步转写任务。

#### Request

**Headers:**

| Header        | Required | Description      |
| ------------- | -------- | ---------------- |
| Authorization | Yes      | JWT Token        |
| Content-Type  | Yes      | application/json |

**Body Parameters (JSON):**

| Parameter     | Type     | Required | Description                   |
| ------------- | -------- | -------- | ----------------------------- |
| fileUrls      | string[] | Yes      | 音频/视频文件 URL 列表        |
| languageHints | string[] | No       | 语言提示，例如 `["zh", "en"]` |
| callbackUrl   | string   | No       | 异步回调 URL                  |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/v1/asr/transcribe \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fileUrls": ["https://example.com/audio.mp3"],
    "languageHints": ["zh"],
    "callbackUrl": "https://example.com/asr-callback"
  }'
```

#### Response

**Success Response (202 Accepted):**

> **Response Type:** `ApiSuccessDto<ASRTaskResponseDto>`
>
> **ASRTaskResponseDto 类型定义:**
>
> ```typescript
> interface ASRTaskResponseDto {
>   taskId: string; // 任务 ID
>   requestId: string; // 请求 ID
>   status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "taskId": "task_123456",
    "requestId": "request_abcdef",
    "status": "PENDING"
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 400    | 参数错误    |
| 401    | 未授权      |
| 500    | 系统错误    |

---

### 2. Get Task Status

**GET** `/api/v1/asr/task/:taskId`

查询转写任务状态。

#### Request

**Headers:**

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Path Parameters:**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| taskId    | string | Yes      | 任务 ID     |

**Example Request:**

```bash
curl -X GET http://localhost:3000/api/v1/asr/task/task_123456 \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<ASRTaskStatusDto>`
>
> **ASRTaskStatusDto 类型定义:**
>
> ```typescript
> interface ASRTaskStatusDto {
>   taskId: string; // 任务 ID
>   requestId: string; // 请求 ID
>   status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
>   message?: string; // 失败原因（可选）
>   completedTime?: number; // 完成时间戳（毫秒）
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "taskId": "task_123456",
    "requestId": "request_abcdef",
    "status": "SUCCEEDED",
    "completedTime": 1704067200000
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 400    | 参数错误    |
| 401    | 未授权      |
| 500    | 系统错误    |

---

### 3. Wait for Transcription

**GET** `/api/v1/asr/wait/:taskId`

阻塞等待转写完成（最多 5 分钟），返回转写结果。

#### Request

**Headers:**

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Path Parameters:**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| taskId    | string | Yes      | 任务 ID     |

**Example Request:**

```bash
curl -X GET http://localhost:3000/api/v1/asr/wait/task_123456 \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<ASRResultDto>`
>
> **ASRResultDto 类型定义:**
>
> ```typescript
> interface ASRResultDto {
>   results: ASRTranscriptionResultDto[]; // 转写结果列表
>   status: 'SUCCEEDED' | 'FAILED';
>   requestId: string;
> }
>
> interface ASRTranscriptionResultDto {
>   file_url: string; // 原始文件 URL
>   properties: {
>     audio_format: string;
>     channels: number[];
>     original_sampling_rate: number;
>     original_duration_in_milliseconds: number;
>   };
>   transcripts: ASRTranscriptDto[];
> }
>
> interface ASRTranscriptDto {
>   channel_id: number;
>   content_duration_in_milliseconds: number;
>   text: string;
>   sentences: ASRSentenceDto[];
> }
>
> interface ASRSentenceDto {
>   begin_time: number;
>   end_time: number;
>   text: string;
>   sentence_id: number;
>   words: ASRWordDto[];
> }
>
> interface ASRWordDto {
>   begin_time: number;
>   end_time: number;
>   text: string;
>   punctuation: string;
> }
> ```

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "status": "SUCCEEDED",
    "requestId": "request_abcdef",
    "results": [
      {
        "file_url": "https://example.com/audio.mp3",
        "properties": {
          "audio_format": "mp3",
          "channels": [0],
          "original_sampling_rate": 44100,
          "original_duration_in_milliseconds": 120000
        },
        "transcripts": [
          {
            "channel_id": 0,
            "content_duration_in_milliseconds": 120000,
            "text": "你好，欢迎使用 ASR 服务。",
            "sentences": [
              {
                "begin_time": 0,
                "end_time": 120000,
                "text": "你好，欢迎使用 ASR 服务。",
                "sentence_id": 1,
                "words": [
                  {
                    "begin_time": 0,
                    "end_time": 500,
                    "text": "你好",
                    "punctuation": "，"
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 400    | 参数错误    |
| 401    | 未授权      |
| 500    | 系统错误    |

---

### 4. Get Transcription Result

**GET** `/api/v1/asr/result/:taskId`

获取指定任务的转写结果（任务未完成时可能返回空结果）。

#### Request

**Headers:**

| Header        | Required | Description |
| ------------- | -------- | ----------- |
| Authorization | Yes      | JWT Token   |

**Path Parameters:**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| taskId    | string | Yes      | 任务 ID     |

**Example Request:**

```bash
curl -X GET http://localhost:3000/api/v1/asr/result/task_123456 \
  -H "Authorization: Bearer <jwt_token>"
```

#### Response

**Success Response (200 OK):**

> **Response Type:** `ApiSuccessDto<ASRResultDto>`
>
> **ASRResultDto 类型定义:** 见「Wait for Transcription」

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "status": "SUCCEEDED",
    "requestId": "request_abcdef",
    "results": []
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 400    | 参数错误    |
| 401    | 未授权      |
| 500    | 系统错误    |

---

### 5. Transcribe and Wait

**POST** `/api/v1/asr/transcribe-and-wait`

提交转写任务并等待完成（最多 5 分钟）。

#### Request

**Headers:**

| Header        | Required | Description      |
| ------------- | -------- | ---------------- |
| Authorization | Yes      | JWT Token        |
| Content-Type  | Yes      | application/json |

**Body Parameters (JSON):**

| Parameter     | Type     | Required | Description                   |
| ------------- | -------- | -------- | ----------------------------- |
| fileUrls      | string[] | Yes      | 音频/视频文件 URL 列表        |
| languageHints | string[] | No       | 语言提示，例如 `["zh", "en"]` |
| callbackUrl   | string   | No       | 异步回调 URL                  |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/v1/asr/transcribe-and-wait \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fileUrls": ["https://example.com/audio.mp3"],
    "languageHints": ["zh"]
  }'
```

#### Response

**Success Response (202 Accepted):**

> **Response Type:** `ApiSuccessDto<ASRResultDto>`
>
> **ASRResultDto 类型定义:** 见「Wait for Transcription」

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "status": "SUCCEEDED",
    "requestId": "request_abcdef",
    "results": []
  }
}
```

**Error Responses:**

| Status | Description |
| ------ | ----------- |
| 400    | 参数错误    |
| 401    | 未授权      |
| 500    | 系统错误    |

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

| Code | Meaning                 |
| ---- | ----------------------- |
| 1    | SYSTEM_ERROR - 系统错误 |
| 2    | PARAMS_ERROR - 参数错误 |
