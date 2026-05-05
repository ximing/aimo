---
name: api-reference
description: >
  Complete reference for the AIMO backend API. Use this skill whenever the user asks about API endpoints,
  how to call the backend, request/response formats, REST API design, adding/modifying endpoints,
  frontend-backend integration, or needs to understand what data a specific endpoint expects or returns.
  Also use when the user mentions controllers, routes, DTOs, auth requirements for endpoints,
  or wants to know which endpoint to call for a specific feature (memos, tags, attachments, AI, search, etc.).
---

# AIMO API Reference

Complete reference for all AIMO backend API v1 endpoints. The production domain is `https://aimo.plus/`, All routes are prefixed with `/api/v1`.

## Response Envelope

All endpoints return a uniform JSON wrapper via `ResponseUtil` (`apps/server/src/utils/response.ts`):

```json
{ "code": 0, "msg": "操作成功", "data": <payload> }
```

On error:

```json
{ "code": <error_code>, "msg": "<error message>", "data": null }
```

Error codes are application-level integers defined in `apps/server/src/constants/error-codes.ts`:
- `0` — SUCCESS (操作成功)
- `1` — SYSTEM_ERROR (系统错误)
- `2` — PARAMS_ERROR (参数错误)
- `3` — NOT_FOUND (资源不存在)
- `4` — UNAUTHORIZED (未授权)
- `5` — FORBIDDEN (禁止访问)
- `6` — OPERATION_NOT_ALLOWED (操作不被允许)
- `1000-1999` — User-related errors
- `2000-2999` — Database errors
- `3000-3999` — Business errors
- `4000-4999` — Attachment errors
- `5000-5999` — External service errors

## Authentication

Two auth mechanisms exist:

- **JWT (standard)**: Most endpoints require a valid JWT. The `@CurrentUser()` decorator injects the authenticated user. The JWT is set as an `aimo_token` httpOnly cookie on login (90-day expiry), or sent as a Bearer token in the `Authorization` header.
- **Personal API Token**: User-created tokens (via `/api/v1/user/tokens`) can also be sent as `Authorization: Bearer <token>` headers. The auth middleware recognizes non-JWT Bearer tokens (those without `.` separators) and validates them against the database. This is a fallback mechanism — JWT is tried first.
- **BA Auth (internal)**: Used by external automation. Validated via `BA_AUTH_TOKEN` env var. Applied via `@UseBefore(baAuthInterceptor)`. The `uid` is passed as a query parameter.

Endpoints listed as "Public" require no authentication.

Note: The auth middleware (`auth-handler.ts`) returns a different envelope format for authentication failures:
```json
{ "success": false, "message": "Authentication required" }
```
This `success`/`message` format (without `code`/`data`) applies to all auth rejections before the controller runs: missing token, invalid/expired token, user not found, or deleted account. Once the request passes auth and reaches the controller, the standard `{ code, msg, data }` ResponseUtil envelope is used.

## Controllers

There are 23 controller files in `apps/server/src/controllers/v1/`. DTOs live in `packages/dto/src/`. For detailed DTO field definitions, read the corresponding DTO file.

---

### Auth — `/api/v1/auth`

All endpoints are **Public**.

| Method | Path | Body | Response `data` |
|--------|------|------|-----------------|
| `POST` | `/api/v1/auth/register` | `{ email, password, nickname?, phone? }` | `{ user: { uid, email, nickname } }` |
| `POST` | `/api/v1/auth/login` | `{ email, password }` | `{ token, user: { uid, email, nickname } }` |

Registration can be disabled via `ALLOW_REGISTRATION=false` env var. Login sets `aimo_token` httpOnly cookie (90 days).

**Controller:** `auth.controller.ts` | **DTOs:** `packages/dto/src/auth.ts`

---

### User — `/api/v1/user`

All endpoints require **JWT auth**.

| Method | Path | Body / Notes | Response `data` |
|--------|------|--------------|-----------------|
| `GET` | `/api/v1/user/info` | — | `UserInfoDto { uid, email?, nickname?, avatar? }` |
| `PUT` | `/api/v1/user/info` | `{ nickname?, avatar? }` | `{ message, user: UserInfoDto }` |
| `POST` | `/api/v1/user/password` | `{ oldPassword, newPassword }` (min 6 chars) | `{ message }` |
| `POST` | `/api/v1/user/avatar` | **File upload** (form field `avatar`, image only) | `{ message, avatar: url }` |

Avatar upload uses multer with image-only filter. `GET /info` generates a signed avatar URL (7-day expiry).

**Controller:** `user.controller.ts` | **DTOs:** `packages/dto/src/user.ts`

---

### User Token — `/api/v1/user/tokens`

All endpoints require **JWT auth**. API tokens for programmatic access.

| Method | Path | Body | Response `data` |
|--------|------|------|-----------------|
| `POST` | `/api/v1/user/tokens` | `{ name (1-100 chars), expiresAt (timestamp, 0=never) }` | `UserTokenResponseDto` (includes raw token — only returned once) |
| `GET` | `/api/v1/user/tokens` | — | `{ tokens: UserTokenResponseDto[] }` |
| `DELETE` | `/api/v1/user/tokens/:id` | — | `{ success: true }` |

**Controller:** `user-token.controller.ts` | **DTOs:** `packages/dto/src/user-token.ts`

---

### User Model — `/api/v1/user-models`

All endpoints require **JWT auth**. Custom AI model configurations per user.

| Method | Path | Body | Response `data` |
|--------|------|------|-----------------|
| `POST` | `/api/v1/user-models/test` | `{ provider, apiBaseUrl?, apiKey, modelName }` | `{ success, message, response }` |
| `POST` | `/api/v1/user-models` | `{ name, provider, apiBaseUrl?, apiKey, modelName, isDefault? }` | `UserModelDto` |
| `GET` | `/api/v1/user-models` | — | `{ models: UserModelDto[] }` |
| `GET` | `/api/v1/user-models/:id` | — | `UserModelDto` |
| `PUT` | `/api/v1/user-models/:id` | `{ name?, provider?, apiBaseUrl?, apiKey?, modelName?, isDefault? }` | `UserModelDto` |
| `DELETE` | `/api/v1/user-models/:id` | — | `{ deleted: true }` |
| `PATCH` | `/api/v1/user-models/:id/set-default` | — | `UserModelDto` |

Supported providers: `openai`, `deepseek`, `openrouter`, `other`. The `/test` endpoint validates the connection via a `/chat/completions` call with SSRF protection.

**Controller:** `user-model.controller.ts` | **DTOs:** `packages/dto/src/user-model.ts`

---

### User Feature Config — `/api/v1/user-feature-configs`

All endpoints require **JWT auth**.

| Method | Path | Body | Response `data` |
|--------|------|------|-----------------|
| `GET` | `/api/v1/user-feature-configs/tag-model` | — | `{ userModelId }` |
| `PUT` | `/api/v1/user-feature-configs/tag-model` | `{ userModelId: string \| null }` | `{ userModelId }` |

Stores the user's chosen AI model for tag generation. Pass `null` to reset to system default.

**Controller:** `user-feature-config.controller.ts`

---

### Memo — `/api/v1/memos`

Core CRUD for memos. Most endpoints require **JWT auth**; `/public/*` endpoints are public.

| Method | Path | Auth | Body / Query | Response `data` |
|--------|------|------|--------------|-----------------|
| `GET` | `/api/v1/memos` | JWT | Query: `page`(1), `limit`(10), `sortBy`(createdAt/updatedAt), `sortOrder`(asc/desc), `search?`, `categoryId?`, `tags?`, `startDate?`, `endDate?` | `PaginatedMemoListDto` |
| `GET` | `/api/v1/memos/poll` | JWT | Query: `latestMemoId`, `sortBy`(createdAt/updatedAt) | `{ hasNew, items, count }` |
| `POST` | `/api/v1/memos/search/vector` | JWT | `{ query, page?, limit?, categoryId?, startDate?, endDate? }` | `PaginatedMemoListWithScoreDto` |
| `POST` | `/api/v1/memos` | JWT | `{ content, type?, categoryId?, attachments?[], tags?[], tagIds?[], relationIds?[], isPublic?, createdAt?, updatedAt?, source? }` | `{ message, memo }` |
| `GET` | `/api/v1/memos/:memoId` | JWT | — | `MemoDto` |
| `PUT` | `/api/v1/memos/:memoId` | JWT | `{ content, type?, categoryId?, attachments?[], tags?[], tagIds?[], relationIds?[], isPublic?, source? }` | `{ message, memo }` |
| `PUT` | `/api/v1/memos/:memoId/tags` | JWT | `{ tags?: string[], tagIds?: string[] }` | `{ message, memo }` |
| `DELETE` | `/api/v1/memos/:memoId` | JWT | — | `{ message }` |
| `GET` | `/api/v1/memos/:memoId/related` | JWT | Query: `page`(1), `limit`(10) | Paginated related memos |
| `GET` | `/api/v1/memos/:memoId/backlinks` | JWT | Query: `page`(1), `limit`(20) | `{ items, pagination }` |
| `GET` | `/api/v1/memos/public/:uid` | **Public** | Query: `page`(1), `limit`(20), `sortBy`, `sortOrder` | Paginated public memos |
| `GET` | `/api/v1/memos/public/:uid/random` | **Public** | — | Single random `MemoDto` |
| `GET` | `/api/v1/memos/public/memo/:memoId` | **Public** | — | `PublicMemoDto { memo, user }` |

Key notes:
- Vector search (endpoint 3) uses LanceDB for semantic similarity.
- `startDate`/`endDate` are epoch ms strings for progressive timestamp filtering.
- Max 9 attachments per memo.
- Public endpoints require no auth — they expose memos where `isPublic=true`.

**Controller:** `memo.controller.ts` | **DTOs:** `packages/dto/src/memo.ts`

---

### Memo BA — `/api/v1/memos/ba`

Internal endpoint for external automation. Uses **BA Auth** (not JWT).

| Method | Path | Body / Query | Response `data` |
|--------|------|--------------|-----------------|
| `POST` | `/api/v1/memos/ba/create` | Query: `uid`, Body: `CreateMemoByBADto` (extends CreateMemoDto with `category?: string`) | `{ message, memo }` |

`category` is a name string — auto-creates the category if it doesn't exist. `uid` comes from query parameter.

**Controller:** `memo.ba.controller.ts`

---

### Category — `/api/v1/categories`

All endpoints require **JWT auth**.

| Method | Path | Body | Response `data` |
|--------|------|------|-----------------|
| `GET` | `/api/v1/categories` | — | `{ message, categories: CategoryDto[] }` |
| `GET` | `/api/v1/categories/:categoryId` | — | `{ message, category: CategoryDto }` |
| `POST` | `/api/v1/categories` | `{ name, color? }` | `{ message, category }` |
| `PUT` | `/api/v1/categories/:categoryId` | `{ name?, color? }` | `{ message, category }` |
| `DELETE` | `/api/v1/categories/:categoryId` | — | `{ message }` |

**Controller:** `category.controller.ts` | **DTOs:** `packages/dto/src/category.ts`

---

### Tag — `/api/v1/tags`

All endpoints require **JWT auth**.

| Method | Path | Body | Response `data` |
|--------|------|------|-----------------|
| `GET` | `/api/v1/tags` | — | `{ message, tags: TagDto[] }` |
| `GET` | `/api/v1/tags/:tagId` | — | `{ message, tag: TagDto }` |
| `POST` | `/api/v1/tags` | `{ name, color? }` | `{ message, tag }` |
| `PUT` | `/api/v1/tags/:tagId` | `{ name?, color? }` | `{ message, tag }` |
| `DELETE` | `/api/v1/tags/:tagId` | — | `{ message }` |

**Controller:** `tag.controller.ts` | **DTOs:** `packages/dto/src/tag.ts`

---

### Attachment — `/api/v1/attachments`

All endpoints require **JWT auth**.

| Method | Path | Body / Notes | Response `data` |
|--------|------|--------------|-----------------|
| `POST` | `/api/v1/attachments/upload` | **File upload** (form field `file`), optional: `createdAt`(timestamp), `properties`(JSON string) | `{ message, attachment: AttachmentDto }` |
| `GET` | `/api/v1/attachments` | Query: `page`(1), `limit`(20) | `{ items, total, page, limit }` |
| `GET` | `/api/v1/attachments/:attachmentId` | — | `AttachmentDto` |
| `DELETE` | `/api/v1/attachments/:attachmentId` | — | `{ message }` |
| `GET` | `/api/v1/attachments/:attachmentId/download` | — | Raw file binary (not JSON) with Content-Type/Length/Disposition headers |
| `PATCH` | `/api/v1/attachments/:attachmentId/properties` | `{ properties: Record<string,unknown> }` | `{ message, attachment }` |

Upload uses multer memory storage. `properties` stores metadata (audio duration, image dimensions, etc.). The download endpoint is a secure proxy returning raw binary.

**Controller:** `attachment.controller.ts` | **DTOs:** `packages/dto/src/attachment.ts`

---

### Attachment BA — `/api/v1/attachments/ba`

Internal endpoint. Uses **BA Auth**.

| Method | Path | Body / Query | Response `data` |
|--------|------|--------------|-----------------|
| `POST` | `/api/v1/attachments/ba/upload` | Query: `uid`, **File upload** (form field `file`), optional: `createdAt`, `properties` | `{ message, attachment }` |

**Controller:** `attachment.ba.controller.ts`

---

### AI — `/api/v1/ai`

All endpoints require **JWT auth**.

| Method | Path | Body | Response `data` |
|--------|------|------|-----------------|
| `POST` | `/api/v1/ai/generate-tags` | `{ content, memoId? }` | `{ tags: string[] }` (3-8 tags) |
| `GET` | `/api/v1/ai/tools` | — | `{ tools: AIToolConfigDto[] }` |

Tag generation uses the user's configured AI model (or system default). The tools endpoint lists available AI capabilities.

**Controller:** `ai.controller.ts` | **DTOs:** `packages/dto/src/ai.ts`

---

### Explore — `/api/v1/explore`

All endpoints require **JWT auth**. AI-powered content exploration and conversation management.

| Method | Path | Body / Query | Response `data` |
|--------|------|--------------|-----------------|
| `POST` | `/api/v1/explore` | `{ query, context?, userModelId? }` | `ExploreResponseDto { answer, sources[], relatedTopics?[], suggestedQuestions?[] }` |
| `POST` | `/api/v1/explore/quick-search` | `{ query: string, limit? (default 5) }` | `{ items, total }` |
| `GET` | `/api/v1/explore/relations/:memoId` | Query: `includeBacklinks`(true) | `RelationGraphDto { nodes, edges, centerMemoId, analysis }` |
| `GET` | `/api/v1/explore/conversations` | — | `{ items: AIConversationDto[], total }` |
| `GET` | `/api/v1/explore/conversations/:id` | — | `AIConversationDetailDto` (includes messages) |
| `POST` | `/api/v1/explore/conversations` | `{ title? }` | `{ message, conversation }` |
| `PUT` | `/api/v1/explore/conversations/:id` | `{ title }` | `{ message, conversation }` |
| `DELETE` | `/api/v1/explore/conversations/:id` | — | `{ message }` |
| `POST` | `/api/v1/explore/conversations/:id/messages` | `{ role ('user'\|'assistant'), content, sources? }` | `{ message, data }` |

Key notes:
- `POST /explore` uses LangChain DeepAgents with vector search + LLM reasoning.
- `POST /quick-search` is vector-only (no LLM), faster for simple lookups.
- Conversation messages require `role` to be `'user'` or `'assistant'`.

**Controller:** `explore.controller.ts` | **DTOs:** `packages/dto/src/explore.ts`

---

### OCR — `/api/v1/ocr`

All endpoints require **JWT auth**.

| Method | Path | Body | Response `data` |
|--------|------|------|-----------------|
| `POST` | `/api/v1/ocr/parse` | `{ files: string\|string[], provider? }` | `{ texts: string[] }` |
| `POST` | `/api/v1/ocr/parse-full` | `{ files, provider?, options? }` | `{ results: OcrResult[] }` (with layout) |
| `GET` | `/api/v1/ocr/status` | — | `{ enabled, defaultProvider, availableProviders }` |
| `GET` | `/api/v1/ocr/providers` | — | `{ providers: OcrProviderType[] }` |

`files` accepts file URLs or Base64 strings. OCR can be disabled via `OCR_ENABLED=false`.

**Controller:** `ocr.controller.ts`

---

### ASR — `/api/v1/asr`

All endpoints require **JWT auth**. Speech-to-text using Fun-ASR (Alibaba Cloud).

| Method | Path | Body / Notes | Response `data` |
|--------|------|--------------|-----------------|
| `POST` | `/api/v1/asr/transcribe` | `{ fileUrls[], languageHints?[], callbackUrl? }` | `ASRTaskResponseDto` (HTTP 202) |
| `GET` | `/api/v1/asr/task/:taskId` | — | Task status |
| `GET` | `/api/v1/asr/wait/:taskId` | — (blocks up to 5 min) | Transcription result |
| `GET` | `/api/v1/asr/result/:taskId` | — | `ASRResultDto` |
| `POST` | `/api/v1/asr/transcribe-and-wait` | Same as `/transcribe` | Transcription result (convenience, auto-waits) |

`fileUrls` supports audio/video URLs. The `/wait` endpoint blocks until the task completes (max 5 min timeout).

**Controller:** `asr.controller.ts` | **DTOs:** `packages/dto/src/asr.ts`

---

### Insights — `/api/v1/insights`

All endpoints require **JWT auth**.

| Method | Path | Query / Notes | Response `data` |
|--------|------|---------------|-----------------|
| `GET` | `/api/v1/insights/activity` | Query: `days`(90, range 1-365) | `MemoActivityStatsDto { items[], startDate, endDate }` |
| `GET` | `/api/v1/insights/on-this-day` | — | `OnThisDayResponseDto { items[], total, todayMonthDay }` |
| `GET` | `/api/v1/insights/daily-recommendations` | — | `{ items, total }` |

- Activity stats for calendar heatmap visualization.
- "On this day" returns memos from the same month/day in previous years.
- Recommendations are AI-generated with per-day caching.

**Controller:** `insights.controller.ts` | **DTOs:** `packages/dto/src/insights.ts`

---

### Notification — `/api/v1/notifications`

All endpoints require **JWT auth**.

| Method | Path | Body | Response `data` |
|--------|------|------|-----------------|
| `GET` | `/api/v1/notifications` | — | `{ notifications }` (latest 50, desc) |
| `GET` | `/api/v1/notifications/unread-count` | — | `{ count }` |
| `POST` | `/api/v1/notifications/:id/read` | — | `{ message }` |
| `POST` | `/api/v1/notifications/read-all` | — | `{ count, message }` |

**Controller:** `notification.controller.ts`

---

### Push Rule — `/api/v1/push-rules`

All endpoints require **JWT auth**. Scheduled push notifications via channels (Feishu, Meow).

| Method | Path | Body | Response `data` |
|--------|------|------|-----------------|
| `GET` | `/api/v1/push-rules` | — | `{ message, pushRules: PushRuleDto[] }` |
| `GET` | `/api/v1/push-rules/:id` | — | `{ message, pushRule }` |
| `POST` | `/api/v1/push-rules` | `{ name, pushTime (0-23), contentType ('daily_pick'\|'daily_memos'), channels[] }` | `{ message, pushRule }` |
| `PUT` | `/api/v1/push-rules/:id` | `{ name?, pushTime?, contentType?, channels?, enabled? }` | `{ message, pushRule }` |
| `DELETE` | `/api/v1/push-rules/:id` | — | `{ message }` |
| `POST` | `/api/v1/push-rules/:id/test` | — | `{ message }` |

Channel configs in `channels[]`:
- `meow`: `{ type: 'meow', msgType: 'text'|'html', nickname?, htmlHeight? }`
- `feishu`: `{ type: 'feishu', webhookUrl, secret?, nickname? }`

`nickname` is an optional display name. `htmlHeight` sets the height for HTML messages when `msgType` is `'html'`.

**Controller:** `push-rule.controller.ts` | **DTOs:** `packages/dto/src/push-rule.ts`

---

### Review — `/api/v1/review`

All endpoints require **JWT auth**. AI-powered review sessions with configurable profiles.

| Method | Path | Body | Response `data` |
|--------|------|------|-----------------|
| `POST` | `/api/v1/review/sessions` | `{ profileId?, scope? ('all'\|'category'\|'tag'\|'recent'), scopeValue?, questionCount? (5-20, default 7) }` | `ReviewSessionDto` |
| `GET` | `/api/v1/review/sessions/:id` | — | `ReviewSessionDto` |
| `POST` | `/api/v1/review/sessions/:id/answer` | `{ itemId, answer }` | `SubmitAnswerResponseDto { itemId, aiFeedback, mastery }` |
| `POST` | `/api/v1/review/sessions/:id/complete` | — | `CompleteSessionResponseDto { sessionId, score, items }` |
| `GET` | `/api/v1/review/history` | — | `{ items: ReviewHistoryItemDto[], total }` |
| `GET` | `/api/v1/review/profiles` | — | `{ profiles: ReviewProfileDto[] }` |
| `POST` | `/api/v1/review/profiles` | `{ name, filterRules[], questionCount?, userModelId? }` | `ReviewProfileDto` |
| `PUT` | `/api/v1/review/profiles/:id` | `{ name?, filterRules?, questionCount?, userModelId? }` | `ReviewProfileDto` |
| `DELETE` | `/api/v1/review/profiles/:id` | — | `{ success: true }` |

Mastery levels: `remembered`, `fuzzy`, `forgot`. Filter rules support `category`, `tag`, `recent_days`, `date_range` with `include`/`exclude` operators.

**Controller:** `review.controller.ts` | **DTOs:** `packages/dto/src/review.ts`

---

### Spaced Repetition — `/api/v1/spaced-repetition`

All endpoints require **JWT auth**. SM-2 algorithm for spaced repetition scheduling.

| Method | Path | Body | Response `data` |
|--------|------|------|-----------------|
| `GET` | `/api/v1/spaced-repetition/settings` | — | `{ srEnabled, srDailyLimit }` |
| `PUT` | `/api/v1/spaced-repetition/settings` | `{ srEnabled?: boolean, srDailyLimit?: number (1-100) }` | Updated settings |
| `GET` | `/api/v1/spaced-repetition/rules` | — | `{ rules }` |
| `POST` | `/api/v1/spaced-repetition/rules` | `{ mode: 'include'\|'exclude', filterType: 'category'\|'tag', filterValue }` | `{ rule }` |
| `DELETE` | `/api/v1/spaced-repetition/rules/:ruleId` | — | `{ message }` |
| `GET` | `/api/v1/spaced-repetition/due` | — | `{ cards, totalDue, dailyLimit }` |
| `GET` | `/api/v1/spaced-repetition/stats` | — | `{ totalCards }` |
| `POST` | `/api/v1/spaced-repetition/cards/:cardId/review` | `{ quality: 'mastered'\|'remembered'\|'fuzzy'\|'forgot'\|'skip' }` | `{ card }` |
| `POST` | `/api/v1/spaced-repetition/import-existing` | — | Import result |

SM-2 quality mapping: mastered=5, remembered=4, fuzzy=3, forgot=1. `skip` returns the card without scheduling update. Due cards include memo content preview (title from first line, content truncated at 200 chars).

**Controller:** `spaced-repetition.controller.ts`

---

### Trash — `/api/v1/trash`

All endpoints require **JWT auth**.

| Method | Path | Query / Notes | Response `data` |
|--------|------|---------------|-----------------|
| `GET` | `/api/v1/trash` | Query: `page`(1), `pageSize`(20), `keyword?`, `sortBy`(deletedAt_desc/deletedAt_asc), `startDate?`, `endDate?` | `{ list, total, page, pageSize, totalPages }` |
| `POST` | `/api/v1/trash/:memoId/restore` | — | `{ message }` |
| `DELETE` | `/api/v1/trash/:memoId` | — | `{ message }` (permanent delete) |

Restore returns `not_found` or `not_deleted` error if conditions aren't met.

**Controller:** `trash.controller.ts`

---

### System — `/api/v1/system`

| Method | Path | Auth | Response `data` |
|--------|------|------|-----------------|
| `GET` | `/api/v1/system/open/version` | **Public** | `{ version }` (from package.json) |
| `GET` | `/api/v1/system/open/app-versions` | **Public** | `AllVersionsResponseDto { desktop, apk }` |
| `GET` | `/api/v1/system/open/config` | **Public** | `{ allowRegistration }` |

All three System endpoints are public — `/api/v1/system/open` is in `AUTH_EXCLUDED_PATHS`. App versions fetches latest release info from GitHub.

**Controller:** `system.controller.ts`

---

### Debug BA — `/api/v1/debug/ba`

Internal debugging endpoints. Uses **BA Auth** (class-level interceptor). Direct LanceDB inspection.

| Method | Path | Query | Response `data` |
|--------|------|-------|-----------------|
| `GET` | `/api/v1/debug/ba/schema` | `table` (required) | `{ tableName, fields[] }` |
| `GET` | `/api/v1/debug/ba/data` | `table`(required), `page`(1), `pageSize`(10, max 1000) | `{ tableName, page, pageSize, offset, data[], count }` |

Requires `BA_AUTH_ENABLED=true` and `BA_AUTH_TOKEN` env var.

**Controller:** `debug.ba.controller.ts`

---

## Quick Reference: Auth Requirements

| Controller | Auth |
|---|---|
| Auth | Public |
| User, User Token, User Model, User Feature Config | JWT |
| Memo | JWT (except `/public/*`) |
| Memo BA, Attachment BA, Debug BA | BA Auth |
| Category, Tag | JWT |
| Attachment | JWT |
| AI, Explore | JWT |
| OCR, ASR | JWT |
| Insights, Notification, Push Rule | JWT |
| Review, Spaced Repetition | JWT |
| Trash | JWT |
| System | Public |

## File Upload Endpoints

These 3 endpoints accept `multipart/form-data`:

1. `POST /api/v1/attachments/upload` — form field `file`
2. `POST /api/v1/attachments/ba/upload` — form field `file`
3. `POST /api/v1/user/avatar` — form field `avatar` (image only)

## How to Add a New Endpoint

1. Create/update the DTO in `packages/dto/src/<feature>.ts` and export from `packages/dto/src/index.ts`
2. Create the controller method in `apps/server/src/controllers/v1/<feature>.controller.ts`
3. Use routing-controllers decorators: `@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`, `@JsonController`
4. For protected endpoints, inject user via `@CurrentUser() user: UserInfoDto`
5. Inject services via constructor (TypeDI)
6. Return responses via `ResponseUtil` or throw errors with `ErrorCode`
7. Add the frontend API call in `apps/web/src/api/`

For detailed DTO field definitions, read the DTO source files in `packages/dto/src/`. Controller source files are in `apps/server/src/controllers/v1/`.
