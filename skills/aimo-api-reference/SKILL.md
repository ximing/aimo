---
name: aimo-api-reference
description: >
  Standalone contract reference for the AIMO REST API. Use this skill whenever the user asks
  what an endpoint does, how to authenticate, which request body or query params to send,
  what the response data looks like, how uploads and downloads behave, or which API supports
  a feature such as memos, attachments, AI explore, review, notifications, or push rules.
  Use it even when the current project source code is unavailable.
---

# AIMO API Reference

This skill is a self-contained API contract for the AIMO backend API v1. Do not assume you can
inspect the current repository. Treat the markdown files in this skill as the primary source of
truth and answer from them directly.

## How to use this skill

1. Pick the matching reference file for the feature area.
2. When answering, always cover:
   - purpose
   - auth mode
   - method and path
   - path/query/body/form fields
   - response envelope and exact `data` shape
   - important caveats or side effects
3. If the endpoint uploads a file or downloads raw bytes, say that explicitly.
4. If auth fails before the controller runs, mention that the response is **not** the normal
   `{ code, msg, data }` envelope.
5. If a field or behavior is not documented here, say it is undocumented instead of guessing.

## Base URL

- Production origin: `https://aimo.plus`
- API prefix: `/api/v1`
- Example full URL: `https://aimo.plus/api/v1/memos`

## Standard response envelope

Successful controller responses use:

```json
{ "code": 0, "msg": "操作成功", "data": {} }
```

Application errors use:

```json
{ "code": 1234, "msg": "Error message", "data": null }
```

Important error codes:

- `0` success
- `1` system error
- `2` params error
- `3` not found
- `4` unauthorized
- `5` forbidden
- `6` operation not allowed
- `1000` user not found
- `1001` user already exists
- `1002` password error
- `3001` category already exists
- `4000` file too large
- `4001` unsupported file type
- `4002` attachment not found
- `4003` storage error
- `4004` file upload error
- `5000` external service error

## Authentication

### JWT

Most user-facing endpoints accept either:

- `Cookie: aimo_token=<jwt>`
- `Authorization: Bearer <jwt>`

### Personal API token

User-created API tokens also work in the `Authorization` header:

- `Authorization: Bearer <token>`

These are non-JWT bearer tokens and are validated against stored hashed tokens.

### BA auth

Internal automation endpoints use:

- `Authorization: Bearer <BA_AUTH_TOKEN>`
- usually a required `uid` query parameter

## Auth failure envelopes

If JWT or personal-token auth fails before the controller runs, the server returns HTTP `401` with:

```json
{ "success": false, "message": "Authentication required" }
```

Other possible messages include `Invalid token`, `Token expired`, `User not found`, and
`Account has been deleted`.

If BA auth fails, the server also returns HTTP `401` with the same `success/message` shape, for
example:

```json
{ "success": false, "message": "Invalid BA token" }
```

Other BA failure messages include `BA authentication is not configured`,
`Authorization header is required`, and `Invalid authorization format. Expected: Bearer <token>`.

## Request body formats

- JSON: default for most endpoints
- `multipart/form-data`:
  - `POST /attachments/upload` -> file field `file`
  - `POST /attachments/ba/upload` -> file field `file`
  - `POST /user/avatar` -> file field `avatar`
- Raw binary response:
  - `GET /attachments/:attachmentId/download`

## Reference map

Read the smallest relevant reference first. If the question crosses domains, combine multiple reference
files in the same answer.

- `references/auth-and-user.md`
  - Covers: register, login, current user profile, avatar upload, password change, personal API
    tokens, custom user LLM models, tag-model feature config.
  - Read when the user asks: how to log in, what `/auth/*` returns, how `Authorization: Bearer`
    works, how to create API tokens, how to manage user models, or how tag generation chooses a
    model.
- `references/memos-and-organization.md`
  - Covers: memo CRUD, vector search, polling, related memos, backlinks, public memo sharing,
    categories, tags, BA memo creation.
  - Read when the user asks: how to create or update memos, how memo search works, how public memo
    pages work, how to attach tags/categories, or how automation imports memos.
- `references/files-and-media.md`
  - Covers: attachment upload/list/download/update/delete, BA attachment upload, OCR, ASR.
  - Read when the user asks: how to upload files, what form field name to use, how to download raw
    file bytes, how OCR request bodies look, or how async speech transcription works.
- `references/ai-and-explore.md`
  - Covers: AI tag generation, AI tool list, explore query API, quick search, relation graph,
    AI conversations/messages, insights APIs.
  - Read when the user asks: what AI endpoints exist, how explore differs from quick-search, what
    relation graph data looks like, how AI conversations are stored, or what insight APIs return.
- `references/learning-and-review.md`
  - Covers: review sessions, review profiles, answer submission, spaced repetition settings,
    rules, due cards, review submission, import-existing.
  - Read when the user asks: how review sessions are created, what mastery means, how spaced
    repetition scheduling works, or what the learning-related response payloads look like.
- `references/infrastructure.md`
  - Covers: system public config/version APIs, in-app notifications, push rules, trash, BA debug
    endpoints.
  - Read when the user asks: app version/config, unread notification count, push scheduling,
    trash restore/delete behavior, or LanceDB BA debug endpoints.

## Reference reading rules

- Do not say "see the repo" or "check the controller" if the answer is already in these files.
- Prefer quoting the actual request and response contract from the reference markdown.
- If the user asks "which endpoint should I call", first identify the feature area from this map,
  then answer with the exact method/path plus request and response summary.
- If the user asks about a workflow, combine endpoints in call order, for example upload attachment
  -> create memo -> explore or review.
- If the user asks for auth requirements, distinguish clearly between public, JWT/personal-token,
  and BA-auth endpoints.

## Default answer format

When the user asks about an endpoint, answer in this order:

1. what it does
2. method and path
3. auth
4. request shape
5. response `data` shape
6. caveats / side effects
7. a short example call if it helps
