# AI & Explore API

Use this file for AI-assisted tagging, knowledge exploration, relation graph APIs, AI conversation
storage, and memo insights.

---

## `POST /api/v1/ai/generate-tags`

Generates tag suggestions for memo content.

- Auth: JWT or personal API token
- Request body:

```json
{
  "content": "Large language models are useful for summarization.",
  "memoId": "memo_xxx"
}
```

- Request fields:
  - `content`: string, required
  - `memoId`: string, optional; useful when editing an existing memo
- Success `data`:

```json
{
  "tags": ["llm", "summary", "ai"]
}
```

- Notes:
  - Typically returns about 3-8 tags.
  - The server may use a user-selected tag-generation model or the system default.

## `GET /api/v1/ai/tools`

Returns a list of currently exposed AI tools for the frontend.

- Auth: JWT or personal API token
- Success `data`:

```json
{
  "tools": [
    {
      "id": "generate-tags",
      "name": "智能添加标签",
      "description": "AI 分析笔记内容，自动生成相关标签建议",
      "icon": "Tags"
    }
  ]
}
```

---

## Explore response shapes

### `ExploreSourceDto`

```json
{
  "memoId": "memo_xxx",
  "content": "first 200 chars of source memo",
  "relevanceScore": 0.92,
  "createdAt": 1715000000000
}
```

### `ExploreResponseDto`

```json
{
  "answer": "AI-generated answer",
  "sources": ["ExploreSourceDto"],
  "relatedTopics": ["topic A", "topic B"],
  "suggestedQuestions": ["follow-up 1", "follow-up 2"]
}
```

### `RelationGraphDto`

```json
{
  "nodes": [
    {
      "id": "memo_xxx",
      "type": "source",
      "title": "first line or generated title",
      "content": "summary text",
      "createdAt": 1715000000000
    }
  ],
  "edges": [
    {
      "source": "memo_xxx",
      "target": "memo_yyy",
      "type": "outgoing",
      "label": "optional label"
    }
  ],
  "centerMemoId": "memo_xxx",
  "analysis": "relationship graph analysis"
}
```

### `AIConversationDto`

```json
{
  "conversationId": "conv_xxx",
  "title": "My conversation",
  "createdAt": 1715000000000,
  "updatedAt": 1715001000000,
  "messageCount": 3
}
```

### `AIMessageDto`

```json
{
  "messageId": "msg_xxx",
  "conversationId": "conv_xxx",
  "role": "assistant",
  "content": "response text",
  "sources": [
    {
      "memoId": "memo_xxx",
      "content": "summary text",
      "relevanceScore": 0.92,
      "createdAt": 1715000000000
    }
  ],
  "createdAt": 1715001000000
}
```

---

## `POST /api/v1/explore`

Runs the full AI exploration pipeline over the user's memo knowledge base.

- Auth: JWT or personal API token
- Request body:

```json
{
  "query": "What did I learn about spaced repetition?",
  "context": "Previous discussion about review systems",
  "userModelId": "model_xxx"
}
```

- Request fields:
  - `query`: string, required
  - `context`: string, optional
  - `userModelId`: string or null, optional
- Success `data`: `ExploreResponseDto`
- Purpose:
  - full pipeline with vector retrieval + reasoning + answer generation

## `POST /api/v1/explore/quick-search`

Performs a fast vector-only search without full LLM reasoning.

- Auth: JWT or personal API token
- Request body:

```json
{
  "query": "spaced repetition",
  "limit": 5
}
```

- Success `data`:

```json
{
  "items": [
    {
      "memoId": "memo_xxx",
      "uid": "usr_xxx",
      "content": "memo content",
      "type": "text",
      "relevanceScore": 0.88,
      "createdAt": 1715000000000,
      "updatedAt": 1715000000000
    }
  ],
  "total": 1
}
```

- Notes:
  - The service filters out results whose relevance score is below an internal threshold.
  - Use this when the user wants retrieval only, not a generated answer.

## `GET /api/v1/explore/relations/:memoId`

Returns a graph representation of a memo's relations.

- Auth: JWT or personal API token
- Path params:
  - `memoId`: string
- Query params:
  - `includeBacklinks`: boolean, default `true`
- Success `data`:

```json
{
  "graph": "RelationGraphDto",
  "suggestedExplorations": [
    "Compare this memo with related topic A",
    "Review temporal evolution of this idea"
  ]
}
```

- Notes:
  - `graph.nodes[].type` is one of `source | related | backlink`.
  - `graph.edges[].type` is one of `outgoing | incoming | thematic | temporal | tag`.

---

## `GET /api/v1/explore/conversations`

Lists saved AI conversations for the current user.

- Auth: JWT or personal API token
- Success `data`:

```json
{
  "items": ["AIConversationDto"],
  "total": 2
}
```

## `GET /api/v1/explore/conversations/:id`

Returns one conversation including all messages.

- Auth: JWT or personal API token
- Path params:
  - `id`: conversation id
- Success `data`:

```json
{
  "conversationId": "conv_xxx",
  "title": "My conversation",
  "createdAt": 1715000000000,
  "updatedAt": 1715001000000,
  "messageCount": 3,
  "messages": ["AIMessageDto"]
}
```

## `POST /api/v1/explore/conversations`

Creates an empty AI conversation record.

- Auth: JWT or personal API token
- Request body:

```json
{
  "title": "Research notes"
}
```

- Success `data`:

```json
{
  "message": "Conversation created successfully",
  "conversation": "AIConversationDto"
}
```

## `PUT /api/v1/explore/conversations/:id`

Renames a conversation.

- Auth: JWT or personal API token
- Request body:

```json
{
  "title": "Renamed conversation"
}
```

- Success `data`:

```json
{
  "message": "Conversation updated successfully",
  "conversation": "AIConversationDto"
}
```

## `DELETE /api/v1/explore/conversations/:id`

Deletes a conversation and its messages.

- Auth: JWT or personal API token
- Success `data`:

```json
{ "message": "Conversation deleted successfully" }
```

## `POST /api/v1/explore/conversations/:id/messages`

Appends a message to a conversation.

- Auth: JWT or personal API token
- Request body:

```json
{
  "role": "user",
  "content": "Tell me more about this topic",
  "sources": [
    {
      "memoId": "memo_xxx",
      "content": "summary text",
      "relevanceScore": 0.92,
      "createdAt": 1715000000000
    }
  ]
}
```

- Request fields:
  - `role`: `user | assistant`, required
  - `content`: string, required
  - `sources`: array of source references, optional
- Success `data`:

```json
{
  "message": "Message added successfully",
  "data": "AIMessageDto"
}
```

---

## `GET /api/v1/insights/activity`

Returns memo activity counts for a rolling date range.

- Auth: JWT or personal API token
- Query params:
  - `days`: number, optional, default `90`, clamped to `1-365`
- Success `data`:

```json
{
  "items": [
    { "date": "2026-05-01", "count": 3 },
    { "date": "2026-05-02", "count": 0 }
  ],
  "startDate": "2026-02-06",
  "endDate": "2026-05-06"
}
```

- Purpose:
  - heatmap or activity calendar visualization

## `GET /api/v1/insights/on-this-day`

Returns memos created on the same month/day in previous years.

- Auth: JWT or personal API token
- Success `data`:

```json
{
  "items": [
    {
      "memoId": "memo_xxx",
      "content": "old memo content",
      "createdAt": 1651824000000,
      "year": 2022
    }
  ],
  "total": 1,
  "todayMonthDay": "05-06"
}
```

## `GET /api/v1/insights/daily-recommendations`

Returns the day's AI-curated memo recommendations.

- Auth: JWT or personal API token
- Success `data`:

```json
{
  "items": ["MemoListItemDto"],
  "total": 3
}
```

- Notes:
  - The server generates and caches recommendations per day.
