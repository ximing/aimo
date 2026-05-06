# Files & Media API

Use this file for attachments, BA attachment upload, OCR, and ASR.

## Attachment DTO

```json
{
  "attachmentId": "att_xxx",
  "filename": "voice.m4a",
  "url": "https://...signed-url...",
  "type": "audio/mp4",
  "size": 123456,
  "createdAt": 1715000000000,
  "coverUrl": "https://...",
  "properties": {
    "duration": 12.3,
    "width": 1920,
    "height": 1080
  }
}
```

---

## `POST /api/v1/attachments/upload`

Uploads one file as an attachment for the current user.

- Auth: JWT or personal API token
- Content type: `multipart/form-data`
- Form fields:
  - `file`: file, required
  - `createdAt`: stringified epoch milliseconds, optional
  - `properties`: JSON string, optional
- Success `data`:

```json
{
  "message": "File uploaded successfully",
  "attachment": {
    "attachmentId": "att_xxx",
    "filename": "voice.m4a",
    "url": "https://...signed-url...",
    "type": "audio/mp4",
    "size": 123456,
    "createdAt": 1715000000000,
    "properties": {
      "duration": 12.3
    }
  }
}
```

- Notes:
  - Uses a blocklist-based MIME check.
  - Oversized files return `code=4000`.
  - Blocked MIME types return `code=4001`.
  - Invalid JSON in `properties` is ignored rather than rejected.

## `GET /api/v1/attachments`

Lists the current user's attachments.

- Auth: JWT or personal API token
- Query params:
  - `page`: number, default `1`
  - `limit`: number, default `20`
- Success `data`:

```json
{
  "items": ["AttachmentDto"],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

## `GET /api/v1/attachments/:attachmentId`

Returns attachment metadata for one attachment.

- Auth: JWT or personal API token
- Path params:
  - `attachmentId`: string
- Success `data`: `AttachmentDto`
- Notes:
  - Missing attachment returns `code=4002`.

## `DELETE /api/v1/attachments/:attachmentId`

Deletes an attachment owned by the current user.

- Auth: JWT or personal API token
- Success `data`:

```json
{ "message": "Attachment deleted successfully" }
```

## `GET /api/v1/attachments/:attachmentId/download`

Downloads the raw file bytes for one attachment.

- Auth: JWT or personal API token
- Response type: raw binary, not JSON on success
- Headers include:
  - `Content-Type`
  - `Content-Length`
  - `Content-Disposition: attachment; filename="..."`
- Error behavior:
  - On failure, the endpoint responds with JSON using the normal `{ code, msg, data }` envelope.

## `PATCH /api/v1/attachments/:attachmentId/properties`

Updates structured metadata stored on an attachment.

- Auth: JWT or personal API token
- Request body:

```json
{
  "properties": {
    "duration": 30.5,
    "width": 800,
    "height": 600
  }
}
```

- Success `data`:

```json
{
  "message": "Properties updated successfully",
  "attachment": "AttachmentDto"
}
```

---

## `POST /api/v1/attachments/ba/upload`

Uploads one attachment for a target user through BA auth.

- Auth: BA auth
- Query params:
  - `uid`: target user id, required
- Content type: `multipart/form-data`
- Form fields:
  - `file`: file, required
  - `createdAt`: stringified epoch milliseconds, optional
  - `properties`: JSON string, optional
- Success `data`:

```json
{
  "message": "File uploaded successfully via BA authentication",
  "attachment": "AttachmentDto"
}
```

- Notes:
  - `uid` must refer to an existing user.
  - MIME restrictions and file-size behavior match the normal upload endpoint.

---

## `POST /api/v1/ocr/parse`

Extracts plain text from one or more files.

- Auth: JWT or personal API token
- Request body:

```json
{
  "files": [
    "https://example.com/page.png",
    "data:image/png;base64,iVBOR..."
  ],
  "provider": "zhipu"
}
```

- Request fields:
  - `files`: string or string array, required; each item is a URL or Base64 payload
  - `provider`: `zhipu | baidu | ali | tencent`, optional
- Success `data`:

```json
{
  "texts": [
    "recognized text from file 1",
    "recognized text from file 2"
  ]
}
```

- Notes:
  - Returns `code=1` when OCR is disabled.

## `POST /api/v1/ocr/parse-full`

Extracts text plus layout/visualization data.

- Auth: JWT or personal API token
- Request body:

```json
{
  "files": ["https://example.com/page.png"],
  "provider": "zhipu",
  "options": {
    "returnCropImages": false,
    "needLayoutVisualization": true,
    "startPageId": 1,
    "endPageId": 3,
    "requestId": "req-123",
    "userId": "usr_xxx"
  }
}
```

- Success `data`:

```json
{
  "results": [
    {
      "index": 0,
      "text": "recognized text",
      "originalFile": "https://example.com/page.png",
      "layoutDetails": [
        {
          "index": 0,
          "label": "text",
          "bbox2d": [0.1, 0.1, 0.5, 0.2],
          "content": "recognized text",
          "height": 1000,
          "width": 800
        }
      ],
      "layoutVisualization": ["https://..."]
    }
  ]
}
```

## `GET /api/v1/ocr/status`

Returns OCR service status.

- Auth: JWT or personal API token
- Success `data`:

```json
{
  "enabled": true,
  "defaultProvider": "zhipu",
  "availableProviders": ["zhipu", "baidu", "ali", "tencent"]
}
```

## `GET /api/v1/ocr/providers`

Lists the currently available OCR providers.

- Auth: JWT or personal API token
- Success `data`:

```json
{
  "providers": ["zhipu", "baidu", "ali", "tencent"]
}
```

---

## `POST /api/v1/asr/transcribe`

Submits an async speech-to-text task.

- Auth: JWT or personal API token
- HTTP status on success: `202`
- Request body:

```json
{
  "fileUrls": ["https://example.com/audio.mp3"],
  "languageHints": ["zh", "en"],
  "callbackUrl": "https://example.com/callback"
}
```

- Request fields:
  - `fileUrls`: string array, required
  - `languageHints`: string array, optional
  - `callbackUrl`: string, optional
- Success `data`:

```json
{
  "taskId": "task_xxx",
  "requestId": "req_xxx",
  "status": "PENDING"
}
```

- Notes:
  - The service must be configured server-side.

## `GET /api/v1/asr/task/:taskId`

Returns async task status.

- Auth: JWT or personal API token
- Success `data`:

```json
{
  "taskId": "task_xxx",
  "requestId": "req_xxx",
  "status": "RUNNING",
  "message": "optional error or status message",
  "completedTime": 1715000000000
}
```

## `GET /api/v1/asr/wait/:taskId`

Blocks until transcription completes or times out.

- Auth: JWT or personal API token
- Behavior:
  - waits up to 5 minutes server-side
- Success `data`: same shape as `GET /result/:taskId`

## `GET /api/v1/asr/result/:taskId`

Returns transcription results for a completed task.

- Auth: JWT or personal API token
- Success `data`:

```json
{
  "results": [
    {
      "file_url": "https://example.com/audio.mp3",
      "properties": {
        "audio_format": "mp3",
        "channels": [0],
        "original_sampling_rate": 16000,
        "original_duration_in_milliseconds": 15342
      },
      "transcripts": [
        {
          "channel_id": 0,
          "content_duration_in_milliseconds": 15342,
          "text": "full transcript text",
          "sentences": [
            {
              "begin_time": 0,
              "end_time": 2500,
              "text": "hello world",
              "sentence_id": 0,
              "words": [
                {
                  "begin_time": 0,
                  "end_time": 300,
                  "text": "hello",
                  "punctuation": ""
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "status": "SUCCEEDED",
  "requestId": "req_xxx"
}
```

## `POST /api/v1/asr/transcribe-and-wait`

Convenience API that submits a transcription task and waits for the result.

- Auth: JWT or personal API token
- Request body: same as `/transcribe`
- Success `data`: same as `/result/:taskId`
