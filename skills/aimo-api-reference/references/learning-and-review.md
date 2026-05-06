# Learning & Review API

Use this file for AI review sessions and spaced repetition APIs.

---

## Review data shapes

### `ProfileFilterRule`

```json
{
  "type": "category",
  "operator": "include",
  "value": "cat_xxx",
  "label": "Work"
}
```

- `type`: `category | tag | recent_days | date_range`
- `operator`: `include | exclude`
- `value` meaning:
  - `category`: category id
  - `tag`: tag name
  - `recent_days`: number as string
  - `date_range`: `startISO,endISO`

### `ReviewItemDto`

```json
{
  "itemId": "item_xxx",
  "sessionId": "session_xxx",
  "memoId": "memo_xxx",
  "memoContent": "original memo content",
  "question": "What is spaced repetition?",
  "userAnswer": "...",
  "aiFeedback": "...",
  "mastery": "remembered",
  "order": 0
}
```

### `ReviewSessionDto`

```json
{
  "sessionId": "session_xxx",
  "uid": "usr_xxx",
  "scope": "all",
  "scopeValue": "optional",
  "status": "active",
  "score": 85,
  "items": ["ReviewItemDto"],
  "createdAt": "2026-05-06T10:00:00.000Z",
  "completedAt": "2026-05-06T10:10:00.000Z"
}
```

### `ReviewProfileDto`

```json
{
  "profileId": "profile_xxx",
  "userId": "usr_xxx",
  "name": "Work review",
  "filterRules": ["ProfileFilterRule"],
  "questionCount": 7,
  "userModelId": "model_xxx",
  "createdAt": "2026-05-06T10:00:00.000Z",
  "updatedAt": "2026-05-06T10:00:00.000Z"
}
```

---

## `POST /api/v1/review/sessions`

Creates a new AI review session.

- Auth: JWT or personal API token
- Request body:

```json
{
  "profileId": "profile_xxx",
  "scope": "tag",
  "scopeValue": "learning",
  "questionCount": 7
}
```

- Request fields:
  - `profileId`: string, optional; when present, the profile's filter rules are used
  - `scope`: `all | category | tag | recent`, optional
  - `scopeValue`: string, optional; category id, tag name, or recent-day count depending on scope
  - `questionCount`: number, optional, typical range `5-20`, default `7`
- Success `data`: `ReviewSessionDto`
- Purpose:
  - starts a generated quiz/review session based on memo content

## `GET /api/v1/review/sessions/:id`

Returns one review session.

- Auth: JWT or personal API token
- Success `data`: `ReviewSessionDto`

## `POST /api/v1/review/sessions/:id/answer`

Submits an answer for one review item.

- Auth: JWT or personal API token
- Request body:

```json
{
  "itemId": "item_xxx",
  "answer": "My answer"
}
```

- Success `data`:

```json
{
  "itemId": "item_xxx",
  "aiFeedback": "Good summary, but mention the scheduling interval.",
  "mastery": "fuzzy"
}
```

- `mastery` is one of `remembered | fuzzy | forgot`.

## `POST /api/v1/review/sessions/:id/complete`

Completes a review session and returns final scoring.

- Auth: JWT or personal API token
- Success `data`:

```json
{
  "sessionId": "session_xxx",
  "score": 86,
  "items": ["ReviewItemDto"]
}
```

## `GET /api/v1/review/history`

Returns the current user's past review sessions.

- Auth: JWT or personal API token
- Success `data`:

```json
{
  "items": [
    {
      "sessionId": "session_xxx",
      "scope": "all",
      "scopeValue": "",
      "score": 86,
      "itemCount": 7,
      "createdAt": "2026-05-06T10:00:00.000Z",
      "completedAt": "2026-05-06T10:10:00.000Z"
    }
  ],
  "total": 1
}
```

## `GET /api/v1/review/profiles`

Lists saved review profiles.

- Auth: JWT or personal API token
- Success `data`:

```json
{
  "profiles": ["ReviewProfileDto"]
}
```

## `POST /api/v1/review/profiles`

Creates a reusable review profile.

- Auth: JWT or personal API token
- Request body:

```json
{
  "name": "Work review",
  "filterRules": [
    {
      "type": "category",
      "operator": "include",
      "value": "cat_xxx",
      "label": "Work"
    }
  ],
  "questionCount": 7,
  "userModelId": "model_xxx"
}
```

- Success `data`: `ReviewProfileDto`

## `PUT /api/v1/review/profiles/:id`

Updates a review profile.

- Auth: JWT or personal API token
- Request body: any subset of profile fields

```json
{
  "name": "Updated profile",
  "questionCount": 10
}
```

- Success `data`: `ReviewProfileDto`

## `DELETE /api/v1/review/profiles/:id`

Deletes a review profile.

- Auth: JWT or personal API token
- Success `data`:

```json
{ "success": true }
```

---

## Spaced repetition data notes

- Scheduling uses an SM-2 style algorithm.
- Review quality labels map as follows:
  - `mastered -> 5`
  - `remembered -> 4`
  - `fuzzy -> 3`
  - `forgot -> 1`
  - `skip` does not update the schedule

### Due card response item

```json
{
  "cardId": "card_xxx",
  "memoId": "memo_xxx",
  "memo": {
    "id": "memo_xxx",
    "title": "First line of memo",
    "content": "Preview up to 200 chars"
  },
  "easeFactor": 2.5,
  "interval": 6,
  "repetitions": 3,
  "lapseCount": 0,
  "nextReviewAt": "2026-05-07T09:00:00.000Z"
}
```

### Rule shape

Rules are persisted with a database-driven shape like:

```json
{
  "ruleId": "rule_xxx",
  "userId": "usr_xxx",
  "mode": "include",
  "filterType": "tag",
  "filterValue": "learning",
  "createdAt": "2026-05-06T10:00:00.000Z"
}
```

---

## `GET /api/v1/spaced-repetition/settings`

Returns the current user's spaced repetition settings.

- Auth: JWT or personal API token
- Success `data`:

```json
{
  "srEnabled": true,
  "srDailyLimit": 5
}
```

## `PUT /api/v1/spaced-repetition/settings`

Updates spaced repetition settings.

- Auth: JWT or personal API token
- Request body:

```json
{
  "srEnabled": true,
  "srDailyLimit": 10
}
```

- Notes:
  - `srDailyLimit` must be an integer in `1-100`.
- Success `data`:

```json
{
  "srEnabled": true,
  "srDailyLimit": 10
}
```

## `GET /api/v1/spaced-repetition/rules`

Lists the current user's spaced repetition filter rules.

- Auth: JWT or personal API token
- Success `data`:

```json
{
  "rules": [
    {
      "ruleId": "rule_xxx",
      "userId": "usr_xxx",
      "mode": "include",
      "filterType": "tag",
      "filterValue": "learning",
      "createdAt": "2026-05-06T10:00:00.000Z"
    }
  ]
}
```

## `POST /api/v1/spaced-repetition/rules`

Creates a spaced repetition filter rule.

- Auth: JWT or personal API token
- Request body:

```json
{
  "mode": "include",
  "filterType": "tag",
  "filterValue": "learning"
}
```

- Request fields:
  - `mode`: `include | exclude`
  - `filterType`: `category | tag`
  - `filterValue`: string
- Success `data`:

```json
{
  "rule": {
    "ruleId": "rule_xxx",
    "userId": "usr_xxx",
    "mode": "include",
    "filterType": "tag",
    "filterValue": "learning",
    "createdAt": "2026-05-06T10:00:00.000Z"
  }
}
```

## `DELETE /api/v1/spaced-repetition/rules/:ruleId`

Deletes one filter rule.

- Auth: JWT or personal API token
- Success `data`:

```json
{ "message": "Rule deleted successfully" }
```

## `GET /api/v1/spaced-repetition/due`

Returns currently due cards, limited by the user's daily limit.

- Auth: JWT or personal API token
- Success `data`:

```json
{
  "cards": ["Due card item"],
  "totalDue": 12,
  "dailyLimit": 5
}
```

- Notes:
  - `cards.length` can be smaller than `totalDue` because the response is truncated by `dailyLimit`.
  - Cards are ordered by `nextReviewAt` ascending.

## `GET /api/v1/spaced-repetition/stats`

Returns overall spaced repetition card count.

- Auth: JWT or personal API token
- Success `data`:

```json
{ "totalCards": 120 }
```

## `POST /api/v1/spaced-repetition/cards/:cardId/review`

Submits one spaced repetition review result.

- Auth: JWT or personal API token
- Request body:

```json
{ "quality": "remembered" }
```

- `quality` must be one of:
  - `mastered`
  - `remembered`
  - `fuzzy`
  - `forgot`
  - `skip`
- Success `data`:

```json
{
  "card": {
    "cardId": "card_xxx",
    "userId": "usr_xxx",
    "memoId": "memo_xxx",
    "easeFactor": 2.6,
    "interval": 10,
    "repetitions": 4,
    "lapseCount": 0,
    "nextReviewAt": "2026-05-16T09:00:00.000Z",
    "lastReviewAt": "2026-05-06T09:00:00.000Z",
    "createdAt": "2026-05-01T09:00:00.000Z"
  }
}
```

- Notes:
  - `skip` returns the current card without changing the schedule.

## `POST /api/v1/spaced-repetition/import-existing`

Imports all eligible existing memos into the spaced repetition pool.

- Auth: JWT or personal API token
- Request body: none
- Success `data`:

```json
{
  "imported": 42,
  "skipped": 8
}
```

- Purpose:
  - backfills spaced repetition cards for older memos
