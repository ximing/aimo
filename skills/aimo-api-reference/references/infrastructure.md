# Infrastructure API

Use this file for system endpoints, in-app notifications, push rules, trash, and BA debug APIs.

---

## `GET /api/v1/system/open/version`

Returns the backend package version.

- Auth: Public
- Request body: none
- Success `data`:

```json
{ "version": "1.2.3" }
```

## `GET /api/v1/system/open/app-versions`

Returns the latest desktop and Android app versions discovered from GitHub releases.

- Auth: Public
- Success `data`:

```json
{
  "desktop": {
    "version": "1.2.3"
  },
  "apk": {
    "version": "1.2.3"
  }
}
```

- If one lookup fails, the corresponding object may instead contain an `error` field.

## `GET /api/v1/system/open/config`

Returns public config flags needed by clients before login.

- Auth: Public
- Success `data`:

```json
{ "allowRegistration": true }
```

---

## Notification item shape

Notifications come from the `in_app_notifications` table.

```json
{
  "notificationId": "notif_xxx",
  "userId": "usr_xxx",
  "type": "spaced_repetition_due",
  "title": "Review reminder",
  "body": "You have cards due today",
  "memoId": "memo_xxx",
  "isRead": false,
  "createdAt": "2026-05-06T10:00:00.000Z"
}
```

## `GET /api/v1/notifications`

Returns the most recent 50 in-app notifications for the current user.

- Auth: JWT or personal API token
- Success `data`:

```json
{
  "notifications": [
    {
      "notificationId": "notif_xxx",
      "userId": "usr_xxx",
      "type": "spaced_repetition_due",
      "title": "Review reminder",
      "body": "You have cards due today",
      "memoId": "memo_xxx",
      "isRead": false,
      "createdAt": "2026-05-06T10:00:00.000Z"
    }
  ]
}
```

## `GET /api/v1/notifications/unread-count`

Returns the unread notification count.

- Auth: JWT or personal API token
- Success `data`:

```json
{ "count": 3 }
```

## `POST /api/v1/notifications/:id/read`

Marks one notification as read.

- Auth: JWT or personal API token
- Success `data`:

```json
{ "message": "Notification marked as read" }
```

## `POST /api/v1/notifications/read-all`

Marks all current notifications as read.

- Auth: JWT or personal API token
- Success `data`:

```json
{
  "count": 8,
  "message": "8 notifications marked as read"
}
```

- Notes:
  - `count` reflects how many notifications are read after the operation according to the current implementation.

---

## Push rule shapes

### `PushChannelConfigDto`

```json
{
  "type": "feishu",
  "nickname": "Work bot",
  "webhookUrl": "https://open.feishu.cn/...",
  "secret": "optional-secret"
}
```

or for Meow HTML pushes:

```json
{
  "type": "meow",
  "nickname": "My device",
  "msgType": "html",
  "htmlHeight": 600
}
```

### `PushRuleDto`

```json
{
  "id": "push_xxx",
  "uid": "usr_xxx",
  "name": "Daily reminder",
  "pushTime": 9,
  "contentType": "daily_pick",
  "channels": ["PushChannelConfigDto"],
  "enabled": true,
  "createdAt": 1715000000000,
  "updatedAt": 1715000000000
}
```

## `GET /api/v1/push-rules`

Lists the current user's push rules.

- Auth: JWT or personal API token
- Success `data`:

```json
{
  "message": "Push rules fetched successfully",
  "pushRules": ["PushRuleDto"]
}
```

## `GET /api/v1/push-rules/:id`

Returns one push rule.

- Auth: JWT or personal API token
- Success `data`:

```json
{
  "message": "Push rule fetched successfully",
  "pushRule": "PushRuleDto"
}
```

## `POST /api/v1/push-rules`

Creates a scheduled push rule.

- Auth: JWT or personal API token
- Request body:

```json
{
  "name": "Morning review",
  "pushTime": 9,
  "contentType": "daily_pick",
  "channels": [
    {
      "type": "feishu",
      "webhookUrl": "https://open.feishu.cn/...",
      "secret": "optional"
    }
  ]
}
```

- Request fields:
  - `name`: string, required
  - `pushTime`: number `0-23`, required
  - `contentType`: `daily_pick | daily_memos`, required
  - `channels`: array, at least one item, required
- Success `data`:

```json
{
  "message": "Push rule created successfully",
  "pushRule": "PushRuleDto"
}
```

## `PUT /api/v1/push-rules/:id`

Updates a push rule.

- Auth: JWT or personal API token
- Request body: any subset of create fields plus `enabled`

```json
{
  "pushTime": 21,
  "enabled": false
}
```

- Success `data`:

```json
{
  "message": "Push rule updated successfully",
  "pushRule": "PushRuleDto"
}
```

## `DELETE /api/v1/push-rules/:id`

Deletes a push rule.

- Auth: JWT or personal API token
- Success `data`:

```json
{ "message": "Push rule deleted successfully" }
```

## `POST /api/v1/push-rules/:id/test`

Sends a test push for one rule.

- Auth: JWT or personal API token
- Success `data`:

```json
{ "message": "Test push sent successfully" }
```

---

## `GET /api/v1/trash`

Lists soft-deleted memos in the current user's trash.

- Auth: JWT or personal API token
- Query params:
  - `page`: number, default `1`
  - `pageSize`: number, default `20`
  - `keyword`: string, optional; matches memo content
  - `sortBy`: `deletedAt_desc | deletedAt_asc`, default `deletedAt_desc`
  - `startDate`: epoch milliseconds string, optional; filters by deletion time
  - `endDate`: epoch milliseconds string, optional; filters by deletion time
- Success `data`:

```json
{
  "list": [
    {
      "memoId": "memo_xxx",
      "uid": "usr_xxx",
      "content": "deleted memo",
      "type": "text",
      "attachments": [],
      "tags": [],
      "tagIds": [],
      "isPublic": false,
      "createdAt": 1714000000000,
      "updatedAt": 1714500000000,
      "deletedAt": 1715000000000
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

## `POST /api/v1/trash/:memoId/restore`

Restores a memo from trash.

- Auth: JWT or personal API token
- Success `data`:

```json
{ "message": "Memo restored successfully" }
```

- Notes:
  - If the memo is not deleted, returns `code=2` with `Memo is not in trash`.

## `DELETE /api/v1/trash/:memoId`

Permanently deletes a memo that is already in trash.

- Auth: JWT or personal API token
- Success `data`:

```json
{ "message": "Memo permanently deleted" }
```

- Notes:
  - If the memo is not in trash, returns `code=2`.

---

## `GET /api/v1/debug/ba/schema`

Inspects a LanceDB table schema.

- Auth: BA auth
- Query params:
  - `table`: string, required
- Success `data`:

```json
{
  "tableName": "memos",
  "fields": [
    {
      "name": "memoId",
      "type": "Utf8",
      "nullable": false
    }
  ]
}
```

## `GET /api/v1/debug/ba/data`

Returns paginated rows from a LanceDB table.

- Auth: BA auth
- Query params:
  - `table`: string, required
  - `page`: number, default `1`
  - `pageSize`: number, default `10`, max `1000`
- Success `data`:

```json
{
  "tableName": "memos",
  "page": 1,
  "pageSize": 10,
  "offset": 0,
  "data": [
    {
      "memoId": "memo_xxx",
      "content": "row data"
    }
  ],
  "count": 1
}
```

- Notes:
  - `count` is the number of rows in the current page, not a total-table count.
