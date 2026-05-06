# Memos & Organization API

Use this file for memo CRUD, vector search, public memo sharing, categories, tags, and BA memo import.

## Data shapes used repeatedly

### `MemoListItemDto`

```json
{
  "memoId": "memo_xxx",
  "uid": "usr_xxx",
  "content": "Full memo content",
  "type": "text",
  "categoryId": "cat_xxx",
  "attachments": [
    {
      "attachmentId": "att_xxx",
      "filename": "audio.mp3",
      "url": "https://...",
      "type": "audio/mpeg",
      "size": 12345,
      "createdAt": 1715000000000,
      "coverUrl": "https://...",
      "properties": { "duration": 12.3 }
    }
  ],
  "tags": [
    {
      "tagId": "tag_xxx",
      "name": "reading",
      "color": "#22c55e",
      "usageCount": 4,
      "createdAt": 1715000000000,
      "updatedAt": 1715000000000
    }
  ],
  "tagIds": ["tag_xxx"],
  "relations": [],
  "isPublic": false,
  "createdAt": 1715000000000,
  "updatedAt": 1715000000000,
  "deletedAt": 0,
  "source": "https://example.com/article"
}
```

### `PaginatedMemoListDto`

```json
{
  "items": ["MemoListItemDto"],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

### `PaginatedMemoListWithScoreDto`

Same as `PaginatedMemoListDto`, but each item may also contain:

```json
{ "relevanceScore": 0.91 }
```

---

## `GET /api/v1/memos`

Lists the current user's memos with filters and pagination.

- Auth: JWT or personal API token
- Query params:
  - `page`: number, default `1`
  - `limit`: number, default `10`
  - `sortBy`: `createdAt | updatedAt`, default `createdAt`
  - `sortOrder`: `asc | desc`, default `desc`
  - `search`: string, optional, text search on content
  - `categoryId`: string, optional
  - `tags`: repeated query param or array of tag names, optional
  - `startDate`: epoch milliseconds string, optional
  - `endDate`: epoch milliseconds string, optional
- Success `data`: `PaginatedMemoListDto`
- Purpose:
  - Primary memo list API for the app
  - Supports keyword, category, tags, and date filtering

## `GET /api/v1/memos/poll`

Checks whether newer memos exist after a known latest memo.

- Auth: JWT or personal API token
- Query params:
  - `latestMemoId`: string, required
  - `sortBy`: `createdAt | updatedAt`, default `createdAt`
- Success `data`:

```json
{
  "hasNew": true,
  "items": ["MemoListItemDto"],
  "count": 2
}
```

- Purpose:
  - Lightweight polling endpoint for “new memo available” UI behavior

## `POST /api/v1/memos/search/vector`

Runs semantic search using embeddings / vector similarity.

- Auth: JWT or personal API token
- Request body:

```json
{
  "query": "meeting notes about pricing",
  "page": 1,
  "limit": 20,
  "categoryId": "cat_xxx",
  "startDate": 1714000000000,
  "endDate": 1715000000000
}
```

- Request fields:
  - `query`: string, required
  - `page`: number, optional, default `1`
  - `limit`: number, optional, default `20`
  - `categoryId`: string, optional
  - `startDate`: epoch milliseconds number, optional
  - `endDate`: epoch milliseconds number, optional
- Success `data`: `PaginatedMemoListWithScoreDto`
- Notes:
  - Each item may include `relevanceScore` in the range `0-1`.
  - This is semantic search, not pure substring matching.

## `POST /api/v1/memos`

Creates a new memo.

- Auth: JWT or personal API token
- Request body:

```json
{
  "content": "Today I learned...",
  "type": "text",
  "categoryId": "cat_xxx",
  "attachments": ["att_xxx"],
  "tags": ["learning", "daily"],
  "tagIds": ["tag_xxx"],
  "relationIds": ["memo_related_xxx"],
  "isPublic": false,
  "createdAt": 1715000000000,
  "updatedAt": 1715000000000,
  "source": "https://example.com/article"
}
```

- Request fields:
  - `content`: string, required
  - `type`: `text | audio | video`, optional, default `text`
  - `categoryId`: string, optional
  - `attachments`: string array of attachment ids, optional, max 9
  - `tags`: string array of tag names, optional
  - `tagIds`: string array of tag ids, optional
  - `relationIds`: string array of target memo ids, optional
  - `isPublic`: boolean, optional
  - `createdAt`: epoch milliseconds number, optional, mainly for imports
  - `updatedAt`: epoch milliseconds number, optional, mainly for imports
  - `source`: string, optional
- Success `data`:

```json
{
  "message": "Memo created successfully",
  "memo": "MemoWithAttachmentsDto"
}
```

- Purpose:
  - Creates a memo, stores scalar data, and triggers embedding generation

## `GET /api/v1/memos/:memoId`

Returns one memo owned by the current user.

- Auth: JWT or personal API token
- Path params:
  - `memoId`: string
- Success `data`: `MemoWithAttachmentsDto`

## `PUT /api/v1/memos/:memoId`

Updates an existing memo and replaces mutable fields.

- Auth: JWT or personal API token
- Path params:
  - `memoId`: string
- Request body:

```json
{
  "content": "Updated content",
  "type": "audio",
  "categoryId": null,
  "attachments": ["att_xxx"],
  "tags": ["updated"],
  "tagIds": ["tag_xxx"],
  "relationIds": ["memo_other_xxx"],
  "isPublic": true,
  "source": "https://example.com/new"
}
```

- Notes:
  - `content` is required.
  - `type` may be `null` to indicate no change.
  - `categoryId` may be `null` to remove the category.
- Success `data`:

```json
{
  "message": "Memo updated successfully",
  "memo": "MemoWithAttachmentsDto"
}
```

## `PUT /api/v1/memos/:memoId/tags`

Replaces the memo's tags without editing other memo fields.

- Auth: JWT or personal API token
- Request body:

```json
{
  "tags": ["thinking", "review"],
  "tagIds": ["tag_xxx", "tag_yyy"]
}
```

- Notes:
  - `tags` and `tagIds` are both optional, but each must be an array if provided.
  - Empty or blank entries are filtered out server-side.
- Success `data`:

```json
{
  "message": "Tags updated successfully",
  "memo": "MemoWithAttachmentsDto"
}
```

## `DELETE /api/v1/memos/:memoId`

Soft deletes a memo.

- Auth: JWT or personal API token
- Success `data`:

```json
{ "message": "Memo deleted successfully" }
```

- Purpose:
  - Moves the memo into trash rather than permanently deleting it

## `GET /api/v1/memos/:memoId/related`

Finds semantically related memos for one memo.

- Auth: JWT or personal API token
- Query params:
  - `page`: number, default `1`
  - `limit`: number, default `10`
- Success `data`: `PaginatedMemoListWithScoreDto`
- Notes:
  - The memo must exist and belong to the current user.
  - Results include relevance scores.

## `GET /api/v1/memos/:memoId/backlinks`

Returns memos that link to the given memo.

- Auth: JWT or personal API token
- Query params:
  - `page`: number, default `1`
  - `limit`: number, default `20`
- Success `data`:

```json
{
  "items": ["MemoListItemDto"],
  "pagination": {
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

## `GET /api/v1/memos/public/:uid`

Lists public memos for a user without authentication.

- Auth: Public
- Query params:
  - `page`: number, default `1`
  - `limit`: number, default `20`
  - `sortBy`: `createdAt | updatedAt`, default `createdAt`
  - `sortOrder`: `asc | desc`, default `desc`
- Success `data`: `PaginatedMemoListDto`
- Purpose:
  - Share-page list API for public memos only

## `GET /api/v1/memos/public/:uid/random`

Returns one random public memo for a user.

- Auth: Public
- Success `data`: `MemoListItemDto`
- Notes:
  - Returns `code=3` if the user has no public memos.

## `GET /api/v1/memos/public/memo/:memoId`

Returns a single public memo plus public author info.

- Auth: Public
- Success `data`:

```json
{
  "memo": "MemoWithAttachmentsDto",
  "user": {
    "uid": "usr_xxx",
    "nickname": "Alice",
    "avatar": "https://...signed-url..."
  }
}
```

---

## `POST /api/v1/memos/ba/create`

Creates a memo for a target user via BA auth, intended for internal automation.

- Auth: BA auth (`Authorization: Bearer <BA_AUTH_TOKEN>`)
- Query params:
  - `uid`: target user id, required
- Request body:

```json
{
  "content": "Imported memo content",
  "type": "text",
  "category": "Imported",
  "attachments": ["att_xxx"],
  "tags": ["automation"],
  "tagIds": ["tag_xxx"],
  "relationIds": ["memo_xxx"],
  "isPublic": false,
  "createdAt": 1715000000000,
  "updatedAt": 1715000000000,
  "source": "https://example.com"
}
```

- Request fields:
  - Same as normal memo creation
  - plus `category`: optional category name string
- Success `data`:

```json
{
  "message": "Memo created successfully via BA authentication",
  "memo": "MemoWithAttachmentsDto"
}
```

- Notes:
  - If `category` is provided and no category with that name exists, the server auto-creates it.
  - `uid` must refer to an existing user.

---

## `GET /api/v1/categories`

Lists the current user's categories.

- Auth: JWT or personal API token
- Success `data`:

```json
{
  "message": "Categories fetched successfully",
  "categories": [
    {
      "categoryId": "cat_xxx",
      "uid": "usr_xxx",
      "name": "Work",
      "color": "#22c55e",
      "createdAt": 1715000000000,
      "updatedAt": 1715000000000
    }
  ]
}
```

## `GET /api/v1/categories/:categoryId`

Returns one category.

- Auth: JWT or personal API token
- Success `data`:

```json
{
  "message": "Category fetched successfully",
  "category": {
    "categoryId": "cat_xxx",
    "uid": "usr_xxx",
    "name": "Work",
    "color": "#22c55e",
    "createdAt": 1715000000000,
    "updatedAt": 1715000000000
  }
}
```

## `POST /api/v1/categories`

Creates a category.

- Auth: JWT or personal API token
- Request body:

```json
{
  "name": "Work",
  "color": "#22c55e"
}
```

- Success `data`:

```json
{
  "message": "Category created successfully",
  "category": {
    "categoryId": "cat_xxx",
    "uid": "usr_xxx",
    "name": "Work",
    "color": "#22c55e",
    "createdAt": 1715000000000,
    "updatedAt": 1715000000000
  }
}
```

- Notes:
  - Duplicate names return `code=3001`.

## `PUT /api/v1/categories/:categoryId`

Updates a category.

- Auth: JWT or personal API token
- Request body:

```json
{
  "name": "Work Notes",
  "color": null
}
```

- Success `data`:

```json
{
  "message": "Category updated successfully",
  "category": {
    "categoryId": "cat_xxx",
    "uid": "usr_xxx",
    "name": "Work Notes",
    "createdAt": 1715000000000,
    "updatedAt": 1715001000000
  }
}
```

## `DELETE /api/v1/categories/:categoryId`

Deletes a category.

- Auth: JWT or personal API token
- Success `data`:

```json
{ "message": "Category deleted successfully" }
```

---

## `GET /api/v1/tags`

Lists the current user's tags.

- Auth: JWT or personal API token
- Success `data`:

```json
{
  "message": "Tags fetched successfully",
  "tags": [
    {
      "tagId": "tag_xxx",
      "name": "learning",
      "color": "#22c55e",
      "usageCount": 4,
      "createdAt": 1715000000000,
      "updatedAt": 1715000000000
    }
  ]
}
```

## `GET /api/v1/tags/:tagId`

Returns one tag.

- Auth: JWT or personal API token
- Success `data`:

```json
{
  "message": "Tag fetched successfully",
  "tag": {
    "tagId": "tag_xxx",
    "name": "learning",
    "color": "#22c55e",
    "usageCount": 4,
    "createdAt": 1715000000000,
    "updatedAt": 1715000000000
  }
}
```

## `POST /api/v1/tags`

Creates a tag.

- Auth: JWT or personal API token
- Request body:

```json
{
  "name": "learning",
  "color": "#22c55e"
}
```

- Success `data`:

```json
{
  "message": "Tag created successfully",
  "tag": {
    "tagId": "tag_xxx",
    "name": "learning",
    "color": "#22c55e"
  }
}
```

## `PUT /api/v1/tags/:tagId`

Updates a tag.

- Auth: JWT or personal API token
- Request body:

```json
{
  "name": "reading",
  "color": "#0ea5e9"
}
```

- Success `data`:

```json
{
  "message": "Tag updated successfully",
  "tag": {
    "tagId": "tag_xxx",
    "name": "reading",
    "color": "#0ea5e9"
  }
}
```

## `DELETE /api/v1/tags/:tagId`

Deletes a tag.

- Auth: JWT or personal API token
- Success `data`:

```json
{ "message": "Tag deleted successfully" }
```
