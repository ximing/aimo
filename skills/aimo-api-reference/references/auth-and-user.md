# Auth & User API

Use this file when the question is about account auth, current user profile, personal API tokens,
user-defined LLM configs, or the per-user feature config for tag generation.

## Auth overview

- `POST /api/v1/auth/*` is public.
- `/api/v1/user/*`, `/api/v1/user/tokens/*`, `/api/v1/user-models/*`, and
  `/api/v1/user-feature-configs/*` require JWT or personal API token auth.
- Successful controller responses are wrapped as `{ code, msg, data }`.
- Auth failures before the controller runs return HTTP `401` with `{ success: false, message }`.

---

## `POST /api/v1/auth/register`

Creates a new account.

- Auth: Public
- Request body:

```json
{
  "email": "alice@example.com",
  "password": "secret123",
  "nickname": "Alice",
  "phone": "13800000000"
}
```

- Request fields:
  - `email`: string, required
  - `password`: string, required
  - `nickname`: string, optional; if it equals the email after trimming, it is ignored
  - `phone`: string, optional
- Success `data`:

```json
{
  "user": {
    "uid": "usr_xxx",
    "email": "alice@example.com",
    "nickname": "Alice"
  }
}
```

- Notes:
  - Registration can be disabled. In that case the API returns `code=6`.
  - Duplicate emails return `code=1001`.

## `POST /api/v1/auth/login`

Logs a user in and issues a JWT.

- Auth: Public
- Request body:

```json
{
  "email": "alice@example.com",
  "password": "secret123"
}
```

- Success `data`:

```json
{
  "token": "<jwt>",
  "user": {
    "uid": "usr_xxx",
    "email": "alice@example.com",
    "nickname": "Alice"
  }
}
```

- Notes:
  - Also sets `aimo_token` as an httpOnly cookie.
  - JWT expiry is `90d`.
  - Unknown user returns `code=1000`.
  - Wrong password returns `code=1002`.

---

## `GET /api/v1/user/info`

Returns the current user's profile summary.

- Auth: JWT or personal API token
- Request body: none
- Success `data`:

```json
{
  "uid": "usr_xxx",
  "email": "alice@example.com",
  "nickname": "Alice",
  "avatar": "https://...signed-url..."
}
```

- Notes:
  - `avatar` is a signed access URL, not the raw storage path.
  - The signed avatar URL has a 7-day expiry.

## `PUT /api/v1/user/info`

Updates nickname and/or avatar path reference for the current user.

- Auth: JWT or personal API token
- Request body:

```json
{
  "nickname": "Alice Chen",
  "avatar": "optional-storage-path-or-url"
}
```

- Request fields:
  - `nickname`: string, optional
  - `avatar`: string, optional
- Success `data`:

```json
{
  "message": "User info updated successfully",
  "user": {
    "uid": "usr_xxx",
    "email": "alice@example.com",
    "nickname": "Alice Chen",
    "avatar": "https://...signed-url..."
  }
}
```

## `POST /api/v1/user/password`

Changes the current user's password.

- Auth: JWT or personal API token
- Request body:

```json
{
  "oldPassword": "old-secret",
  "newPassword": "new-secret-123"
}
```

- Success `data`:

```json
{
  "message": "Password changed successfully"
}
```

- Notes:
  - `newPassword` must be at least 6 characters.
  - Wrong old password returns `code=1002`.

## `POST /api/v1/user/avatar`

Uploads a new avatar image.

- Auth: JWT or personal API token
- Content type: `multipart/form-data`
- Form fields:
  - `avatar`: file, required, image only
- Success `data`:

```json
{
  "message": "Avatar uploaded successfully",
  "avatar": "https://...signed-url..."
}
```

- Notes:
  - Non-image uploads return `code=4001`.
  - Oversized files return `code=4000`.
  - The previous avatar is deleted asynchronously after a successful replacement.

---

## `POST /api/v1/user/tokens`

Creates a personal API token for programmatic access.

- Auth: JWT or personal API token
- Request body:

```json
{
  "name": "My automation token",
  "expiresAt": 0
}
```

- Request fields:
  - `name`: string, required, length `1-100`
  - `expiresAt`: number, required by contract; `0` means never expires
- Success `data`:

```json
{
  "id": "tok_xxx",
  "name": "My automation token",
  "token": "plain-text-token-only-returned-once",
  "expiresAt": 0,
  "createdAt": 1715000000000,
  "revokedAt": 0,
  "isExpired": false,
  "isActive": true
}
```

- Notes:
  - The raw `token` is only returned at creation time.
  - Later list/detail calls do not regenerate the raw token.

## `GET /api/v1/user/tokens`

Lists the current user's personal API tokens.

- Auth: JWT or personal API token
- Request body: none
- Success `data`:

```json
{
  "tokens": [
    {
      "id": "tok_xxx",
      "name": "My automation token",
      "expiresAt": 0,
      "createdAt": 1715000000000,
      "revokedAt": 0,
      "isExpired": false,
      "isActive": true
    }
  ]
}
```

## `DELETE /api/v1/user/tokens/:id`

Revokes a personal API token.

- Auth: JWT or personal API token
- Path params:
  - `id`: token id
- Success `data`:

```json
{ "success": true }
```

---

## `POST /api/v1/user-models/test`

Checks whether a user-provided LLM config can successfully call a chat-completions endpoint.

- Auth: JWT or personal API token
- Request body:

```json
{
  "provider": "openai",
  "apiBaseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-xxx",
  "modelName": "gpt-4o-mini"
}
```

- Request fields:
  - `provider`: `openai | deepseek | openrouter | other`
  - `apiBaseUrl`: string, optional except for `provider="other"`
  - `apiKey`: string, required
  - `modelName`: string, required
- Success `data`:

```json
{
  "success": true,
  "message": "Model connection test successful",
  "response": "OK"
}
```

- Notes:
  - The server validates the base URL against SSRF rules.
  - Failures return `code=5000` with the upstream error text when available.

## `POST /api/v1/user-models`

Saves a custom LLM config for the current user.

- Auth: JWT or personal API token
- Request body:

```json
{
  "name": "My OpenAI",
  "provider": "openai",
  "apiBaseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-xxx",
  "modelName": "gpt-4o-mini",
  "isDefault": true
}
```

- Success `data`: `UserModelDto`

```json
{
  "id": "model_xxx",
  "userId": "usr_xxx",
  "name": "My OpenAI",
  "provider": "openai",
  "apiBaseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-xxx",
  "modelName": "gpt-4o-mini",
  "isDefault": true,
  "createdAt": "2026-05-06T10:00:00.000Z",
  "updatedAt": "2026-05-06T10:00:00.000Z"
}
```

- Notes:
  - `apiKey` is returned by this API. It is not masked server-side.

## `GET /api/v1/user-models`

Lists the current user's saved LLM configs.

- Auth: JWT or personal API token
- Success `data`:

```json
{
  "models": [
    {
      "id": "model_xxx",
      "userId": "usr_xxx",
      "name": "My OpenAI",
      "provider": "openai",
      "apiBaseUrl": "https://api.openai.com/v1",
      "apiKey": "sk-xxx",
      "modelName": "gpt-4o-mini",
      "isDefault": true,
      "createdAt": "2026-05-06T10:00:00.000Z",
      "updatedAt": "2026-05-06T10:00:00.000Z"
    }
  ]
}
```

## `GET /api/v1/user-models/:id`

Returns one saved LLM config.

- Auth: JWT or personal API token
- Path params:
  - `id`: model id
- Success `data`: same `UserModelDto` shape as above

## `PUT /api/v1/user-models/:id`

Updates part of an existing LLM config.

- Auth: JWT or personal API token
- Path params:
  - `id`: model id
- Request body: any subset of the create fields

```json
{
  "name": "Updated name",
  "modelName": "gpt-4.1-mini",
  "isDefault": false
}
```

- Success `data`: updated `UserModelDto`

## `DELETE /api/v1/user-models/:id`

Deletes a saved LLM config.

- Auth: JWT or personal API token
- Success `data`:

```json
{ "deleted": true }
```

## `PATCH /api/v1/user-models/:id/set-default`

Marks a saved LLM config as the user's default model.

- Auth: JWT or personal API token
- Request body: none
- Success `data`: updated `UserModelDto`

---

## `GET /api/v1/user-feature-configs/tag-model`

Returns which saved user model is selected for AI tag generation.

- Auth: JWT or personal API token
- Success `data`:

```json
{ "userModelId": "model_xxx" }
```

- `userModelId` may be `null` when the system default model is used.

## `PUT /api/v1/user-feature-configs/tag-model`

Updates which saved user model should be used for AI tag generation.

- Auth: JWT or personal API token
- Request body:

```json
{ "userModelId": "model_xxx" }
```

or reset to default:

```json
{ "userModelId": null }
```

- Success `data`:

```json
{ "userModelId": "model_xxx" }
```
