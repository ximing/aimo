# PRD: Complete Drizzle Migration for Remaining Schemas

## Introduction

Complete the migration of remaining LanceDB schemas to Drizzle ORM. This includes business entity schemas (categories, tags, AI conversations/messages, push rules, daily recommendations) and cache tables (embedding caches). All scalar data will move to the relational database while embedding vectors remain in LanceDB. All services will be fully refactored to use the repository pattern with no direct LanceDB access for scalar data.

## Goals

- Migrate all remaining LanceDB schemas to Drizzle (categories, tags, AI conversations, AI messages, push rules, daily recommendations, embedding caches, multimodal embedding caches, table migrations)
- Create repository classes for all migrated schemas
- Refactor all services to use repositories exclusively for scalar data access
- Store complex nested types (AI message sources) as JSON in Drizzle
- Keep embedding cache tables in LanceDB (cache performance optimization)
- Use JOIN queries instead of foreign keys for relational queries
- Maintain all existing API contracts and DTOs

## User Stories

### US-001: Create Drizzle schemas for categories and tags
**Description:** As a developer, I need Drizzle schemas for categories and tags so users can organize their memos.

**Acceptance Criteria:**
- [ ] Create `src/sources/database/schema/categories.ts` with MySQL/PostgreSQL/SQLite variants
- [ ] Schema fields: categoryId (PK), uid, name, color, createdAt, updatedAt
- [ ] Create `src/sources/database/schema/tags.ts` with MySQL/PostgreSQL/SQLite variants
- [ ] Schema fields: tagId (PK), uid, name, color, usageCount, createdAt, updatedAt
- [ ] Add indexes for uid field in both tables (no foreign keys)
- [ ] Export schemas and types from `src/sources/database/schema/index.ts`
- [ ] Update schema helper functions (getCategoriesTable, getTagsTable)
- [ ] Typecheck passes

### US-002: Create Drizzle schemas for AI conversations and messages
**Description:** As a developer, I need Drizzle schemas for AI conversations and messages so the chat feature works with relational DB.

**Acceptance Criteria:**
- [ ] Create `src/sources/database/schema/ai-conversations.ts` with MySQL/PostgreSQL/SQLite variants
- [ ] Schema fields: conversationId (PK), uid, title, createdAt, updatedAt
- [ ] Create `src/sources/database/schema/ai-messages.ts` with MySQL/PostgreSQL/SQLite variants
- [ ] Schema fields: messageId (PK), conversationId, role, content, sources (JSON text), createdAt
- [ ] Add indexes for uid (conversations) and conversationId (messages) - no foreign keys
- [ ] Sources stored as JSON string (serialize/deserialize AIMessageSource[])
- [ ] Export schemas and types from `src/sources/database/schema/index.ts`
- [ ] Update schema helper functions (getAIConversationsTable, getAIMessagesTable)
- [ ] Typecheck passes

### US-003: Create Drizzle schemas for push rules and daily recommendations
**Description:** As a developer, I need Drizzle schemas for push rules and daily recommendations so notification features work with relational DB.

**Acceptance Criteria:**
- [ ] Create `src/sources/database/schema/push-rules.ts` with MySQL/PostgreSQL/SQLite variants
- [ ] Schema fields: id (PK), uid, name, pushTime, contentType, channels (JSON text), enabled, createdAt, updatedAt
- [ ] Create `src/sources/database/schema/daily-recommendations.ts` with MySQL/PostgreSQL/SQLite variants
- [ ] Schema fields: recommendationId (PK), uid, date, memoIds (JSON array), createdAt
- [ ] Add indexes for uid field in both tables (no foreign keys)
- [ ] Add unique index on (uid, date) for daily recommendations
- [ ] Export schemas and types from `src/sources/database/schema/index.ts`
- [ ] Update schema helper functions (getPushRulesTable, getDailyRecommendationsTable)
- [ ] Typecheck passes

### US-004: Create repository layer for categories and tags
**Description:** As a developer, I need repositories for categories and tags so services don't directly access Drizzle.

**Acceptance Criteria:**
- [ ] Create `src/repositories/category.repository.ts` with methods:
  - `create()`, `findById()`, `findByUserId()`, `update()`, `delete()`
  - `findByIds()` (batch fetch)
- [ ] Create `src/repositories/tag.repository.ts` with methods:
  - `create()`, `findById()`, `findByUserId()`, `update()`, `delete()`
  - `findByIds()` (batch fetch)
  - `incrementUsageCount()`, `decrementUsageCount()`
- [ ] All methods return DTOs from `@aimo/dto`
- [ ] Repositories decorated with `@Service()` for TypeDI injection
- [ ] Export from `src/repositories/index.ts`
- [ ] Typecheck passes

### US-005: Create repository layer for AI conversations and messages
**Description:** As a developer, I need repositories for AI conversations and messages so the chat service uses the repository pattern.

**Acceptance Criteria:**
- [ ] Create `src/repositories/ai-conversation.repository.ts` with methods:
  - `create()`, `findById()`, `findByUserId()`, `update()`, `delete()`
  - `findWithMessages()` (JOIN query to fetch conversation + messages)
- [ ] Create `src/repositories/ai-message.repository.ts` with methods:
  - `create()`, `findById()`, `findByConversationId()`, `delete()`
  - `batchCreate()` (for bulk message insertion)
- [ ] Handle JSON serialization/deserialization for `sources` field in AIMessage
- [ ] Use JOIN queries (no foreign keys) for relational data
- [ ] All methods return DTOs from `@aimo/dto`
- [ ] Repositories decorated with `@Service()` for TypeDI injection
- [ ] Export from `src/repositories/index.ts`
- [ ] Typecheck passes

### US-006: Create repository layer for push rules and daily recommendations
**Description:** As a developer, I need repositories for push rules and daily recommendations so notification services use the repository pattern.

**Acceptance Criteria:**
- [ ] Create `src/repositories/push-rule.repository.ts` with methods:
  - `create()`, `findById()`, `findByUserId()`, `update()`, `delete()`
  - `findEnabledByTime()` (for scheduler queries)
- [ ] Create `src/repositories/daily-recommendation.repository.ts` with methods:
  - `create()`, `findByUserAndDate()`, `findByUserId()`, `delete()`
  - `upsert()` (insert or update based on uid + date unique constraint)
- [ ] Handle JSON serialization for `channels` (push rules) and `memoIds` (recommendations)
- [ ] All methods return DTOs from `@aimo/dto`
- [ ] Repositories decorated with `@Service()` for TypeDI injection
- [ ] Export from `src/repositories/index.ts`
- [ ] Typecheck passes

### US-007: Refactor CategoryService to use repository
**Description:** As a developer, I need CategoryService to use CategoryRepository so all category data comes from Drizzle.

**Acceptance Criteria:**
- [ ] Inject `CategoryRepository` into `CategoryService`
- [ ] Replace all LanceDB calls with repository methods
- [ ] `create()`, `update()`, `delete()`, `list()` use CategoryRepository
- [ ] Remove direct LanceDB imports and usage
- [ ] Maintain existing service method signatures (DTOs unchanged)
- [ ] Typecheck passes

### US-008: Refactor TagService to use repository
**Description:** As a developer, I need TagService to use TagRepository so all tag data comes from Drizzle.

**Acceptance Criteria:**
- [ ] Inject `TagRepository` into `TagService`
- [ ] Replace all LanceDB calls with repository methods
- [ ] `create()`, `update()`, `delete()`, `list()`, `incrementUsage()` use TagRepository
- [ ] Remove direct LanceDB imports and usage
- [ ] Maintain existing service method signatures (DTOs unchanged)
- [ ] Typecheck passes

### US-009: Refactor AIConversationService to use repositories
**Description:** As a developer, I need AIConversationService to use repositories so AI chat data comes from Drizzle.

**Acceptance Criteria:**
- [ ] Inject `AIConversationRepository` and `AIMessageRepository` into `AIConversationService`
- [ ] Replace all LanceDB calls with repository methods
- [ ] `createConversation()`, `getConversation()`, `listConversations()` use AIConversationRepository
- [ ] `addMessage()`, `getMessages()` use AIMessageRepository
- [ ] Use `findWithMessages()` for efficient conversation + messages retrieval (JOIN query)
- [ ] Handle JSON serialization/deserialization for message sources
- [ ] Remove direct LanceDB imports and usage
- [ ] Maintain existing service method signatures (DTOs unchanged)
- [ ] Typecheck passes

### US-010: Refactor PushRuleService to use repository
**Description:** As a developer, I need PushRuleService to use PushRuleRepository so push notification rules come from Drizzle.

**Acceptance Criteria:**
- [ ] Inject `PushRuleRepository` into `PushRuleService`
- [ ] Replace all LanceDB calls with repository methods
- [ ] `create()`, `update()`, `delete()`, `list()`, `findByTime()` use PushRuleRepository
- [ ] Handle JSON serialization for channels configuration
- [ ] Remove direct LanceDB imports and usage
- [ ] Maintain existing service method signatures (DTOs unchanged)
- [ ] Typecheck passes

### US-011: Refactor RecommendationService to use repository
**Description:** As a developer, I need RecommendationService to use DailyRecommendationRepository so cached recommendations come from Drizzle.

**Acceptance Criteria:**
- [ ] Inject `DailyRecommendationRepository` into `RecommendationService`
- [ ] Replace all LanceDB calls with repository methods
- [ ] `getDailyRecommendations()` checks Drizzle cache first, generates if missing
- [ ] `cacheDailyRecommendations()` uses `upsert()` to store recommendations
- [ ] Handle JSON serialization for memoIds array
- [ ] Remove direct LanceDB imports and usage
- [ ] Maintain existing service method signatures (DTOs unchanged)
- [ ] Typecheck passes

### US-012: Update EmbeddingService and MultimodalEmbeddingService
**Description:** As a developer, I need embedding cache services to continue using LanceDB so cache performance remains optimal.

**Acceptance Criteria:**
- [ ] Keep `EmbeddingService` using LanceDB for `embeddingCache` table (no changes needed)
- [ ] Keep `MultimodalEmbeddingService` using LanceDB for `multimodalEmbeddingCache` table (no changes needed)
- [ ] Verify both services work correctly with hybrid architecture (LanceDB for embeddings, Drizzle for metadata)
- [ ] Add comments documenting why cache tables remain in LanceDB (performance optimization)
- [ ] Typecheck passes

### US-013: Update MemoService for tag and category relations
**Description:** As a developer, I need MemoService to fetch tags and categories from Drizzle repositories so memo enrichment works correctly.

**Acceptance Criteria:**
- [ ] Inject `TagRepository` and `CategoryRepository` into `MemoService`
- [ ] When fetching memos, use `TagRepository.findByIds()` to enrich tagIds with tag details
- [ ] When fetching memos, use `CategoryRepository.findById()` to enrich categoryId with category details
- [ ] Use batch fetch operations to avoid N+1 queries (fetch all tags/categories at once)
- [ ] Maintain existing memo DTO format (tags and category fields populated)
- [ ] Typecheck passes

### US-014: Update ExploreService for category and tag queries
**Description:** As a developer, I need ExploreService to query categories and tags from Drizzle so explore features work correctly.

**Acceptance Criteria:**
- [ ] Inject `CategoryRepository` and `TagRepository` into `ExploreService`
- [ ] Replace LanceDB category/tag queries with repository methods
- [ ] `getCategories()`, `getTags()` use respective repositories
- [ ] Maintain existing service method signatures (DTOs unchanged)
- [ ] Typecheck passes

### US-015: Update SchedulerService for push rule queries
**Description:** As a developer, I need SchedulerService to fetch push rules from Drizzle so scheduled notifications work correctly.

**Acceptance Criteria:**
- [ ] Inject `PushRuleRepository` into `SchedulerService`
- [ ] Replace LanceDB push rule queries with `PushRuleRepository.findEnabledByTime()`
- [ ] Scheduler correctly triggers notifications based on Drizzle data
- [ ] Maintain existing scheduler behavior (no functional changes)
- [ ] Typecheck passes

### US-016: Generate and run Drizzle migrations
**Description:** As a developer, I need database migrations for all new schemas so the database structure is created automatically.

**Acceptance Criteria:**
- [ ] Run `pnpm db:generate` to create migration files for new schemas
- [ ] Verify migration files created in `src/sources/database/migrations/`
- [ ] Migrations include: categories, tags, ai_conversations, ai_messages, push_rules, daily_recommendations
- [ ] Test migrations on all three database types (MySQL, PostgreSQL, SQLite)
- [ ] Migrations run successfully via `DrizzleAdapter.runMigrations()` on startup
- [ ] Typecheck passes

### US-017: Update data migration script for new schemas
**Description:** As a developer, I need the LanceDB-to-Drizzle migration script updated so historical data for new schemas is migrated.

**Acceptance Criteria:**
- [ ] Update `src/migrations/lancedb-to-drizzle.migration.ts` to migrate:
  - categories table
  - tags table
  - ai_conversations table
  - ai_messages table (serialize sources as JSON)
  - push_rules table (serialize channels as JSON)
  - daily_recommendations table (serialize memoIds as JSON)
- [ ] Migration handles JSON serialization for complex fields
- [ ] Migration is transactional (rollback on failure)
- [ ] Backup includes all new tables
- [ ] Log migration progress for each table
- [ ] Typecheck passes

### US-018: Update environment documentation
**Description:** As a deployment engineer, I need updated documentation reflecting the completed migration so I know the system is fully hybrid.

**Acceptance Criteria:**
- [ ] Update `CLAUDE.md` to list all migrated schemas
- [ ] Document that only embedding caches remain in LanceDB
- [ ] Update architecture diagram/description in `CLAUDE.md`
- [ ] Add note about JOIN queries and no foreign keys in Drizzle
- [ ] Document JSON field serialization for complex types
- [ ] Typecheck passes

## Functional Requirements

**Schema Migration:**
- FR-1: All business entity schemas migrated to Drizzle (categories, tags, AI conversations, AI messages, push rules, daily recommendations)
- FR-2: Embedding cache tables remain in LanceDB (embeddingCache, multimodalEmbeddingCache)
- FR-3: Table migrations metadata tracked in Drizzle `_migrations` table
- FR-4: All schemas support MySQL, PostgreSQL, and SQLite with appropriate column types

**Schema Design:**
- FR-5: No foreign key constraints (use JOIN queries for relational data)
- FR-6: Indexes created for frequently queried fields (uid, conversationId, date)
- FR-7: Unique constraint on (uid, date) for daily recommendations
- FR-8: Complex nested types stored as JSON text (sources, channels, memoIds)
- FR-9: JSON fields automatically serialized/deserialized in repositories

**Repository Pattern:**
- FR-10: Repository classes for all migrated schemas (category, tag, AI conversation, AI message, push rule, daily recommendation)
- FR-11: Repositories encapsulate all Drizzle queries (services don't use Drizzle directly)
- FR-12: Repositories return DTOs from `@aimo/dto`
- FR-13: Repositories support batch operations (findByIds) to avoid N+1 queries
- FR-14: Repositories decorated with `@Service()` for TypeDI injection

**Service Refactoring:**
- FR-15: All services use repositories exclusively for scalar data access
- FR-16: No direct LanceDB imports in services (except EmbeddingService and MultimodalEmbeddingService)
- FR-17: Services maintain existing method signatures (no breaking changes to DTOs)
- FR-18: Services use JOIN queries via repositories for relational data
- FR-19: Batch fetch operations used to avoid N+1 queries (e.g., fetch all tags at once)

**Data Migration:**
- FR-20: LanceDB-to-Drizzle migration script migrates all new schemas
- FR-21: JSON serialization handled during migration (sources, channels, memoIds)
- FR-22: Migration is transactional (rollback on failure)
- FR-23: Migration progress logged for each table
- FR-24: Backup includes all migrated tables

**Performance Considerations:**
- FR-25: Embedding cache tables remain in LanceDB (cache hit performance critical)
- FR-26: Batch fetch operations minimize database round trips
- FR-27: JOIN queries used efficiently (fetch related data in single query)
- FR-28: Indexes optimize common query patterns (uid lookups, date range queries)

## Non-Goals (Out of Scope)

- No migration of embedding cache tables to Drizzle (stay in LanceDB for performance)
- No foreign key constraints (use JOIN queries instead)
- No real-time cache synchronization between Drizzle and LanceDB
- No query optimization beyond basic indexing (defer to future performance tuning)
- No schema versioning system beyond existing migration tracking
- No rollback mechanism for data migration (backup file provided for manual recovery)
- No automated testing (user explicitly requested no tests)
- No changes to frontend code (API contracts preserved)
- No changes to authentication or authorization logic

## Design Considerations

**Updated Directory Structure:**
```
apps/server/src/
├── sources/
│   ├── database/
│   │   ├── schema/
│   │   │   ├── users.ts
│   │   │   ├── memos.ts
│   │   │   ├── memo-relations.ts
│   │   │   ├── attachments.ts
│   │   │   ├── categories.ts          # NEW
│   │   │   ├── tags.ts                # NEW
│   │   │   ├── ai-conversations.ts    # NEW
│   │   │   ├── ai-messages.ts         # NEW
│   │   │   ├── push-rules.ts          # NEW
│   │   │   ├── daily-recommendations.ts # NEW
│   │   │   ├── _migrations.ts
│   │   │   └── index.ts
│   │   └── migrations/                # Generated Drizzle migrations
│   └── lancedb.ts                     # Embedding caches ONLY
├── repositories/
│   ├── memo.repository.ts
│   ├── user.repository.ts
│   ├── memo-relation.repository.ts
│   ├── attachment.repository.ts
│   ├── category.repository.ts         # NEW
│   ├── tag.repository.ts              # NEW
│   ├── ai-conversation.repository.ts  # NEW
│   ├── ai-message.repository.ts       # NEW
│   ├── push-rule.repository.ts        # NEW
│   ├── daily-recommendation.repository.ts # NEW
│   └── index.ts
├── services/
│   ├── memo.service.ts                # UPDATED (use tag/category repos)
│   ├── category.service.ts            # REFACTORED
│   ├── tag.service.ts                 # REFACTORED
│   ├── ai-conversation.service.ts     # REFACTORED
│   ├── push-rule.service.ts           # REFACTORED
│   ├── recommendation.service.ts      # REFACTORED
│   ├── explore.service.ts             # UPDATED
│   ├── scheduler.service.ts           # UPDATED
│   ├── embedding.service.ts           # NO CHANGE (uses LanceDB)
│   └── multimodal-embedding.service.ts # NO CHANGE (uses LanceDB)
└── migrations/
    └── lancedb-to-drizzle.migration.ts # UPDATED
```

**JSON Field Serialization Pattern:**
```typescript
// Repository handles serialization
class AIMessageRepository {
  async create(data: { sources: AIMessageSource[] }) {
    await db.insert(aiMessages).values({
      ...data,
      sources: JSON.stringify(data.sources), // Serialize to JSON
    });
  }

  async findById(id: string) {
    const row = await db.select().from(aiMessages).where(eq(aiMessages.messageId, id));
    return {
      ...row,
      sources: JSON.parse(row.sources), // Deserialize from JSON
    };
  }
}
```

**JOIN Query Pattern (No Foreign Keys):**
```typescript
// Fetch conversation with messages using JOIN
async findWithMessages(conversationId: string) {
  const result = await db
    .select()
    .from(aiConversations)
    .leftJoin(
      aiMessages,
      eq(aiConversations.conversationId, aiMessages.conversationId)
    )
    .where(eq(aiConversations.conversationId, conversationId));

  // Group messages by conversation
  const conversation = result[0];
  const messages = result.map(r => r.ai_messages).filter(Boolean);

  return { ...conversation, messages };
}
```

**Batch Fetch Pattern (Avoid N+1):**
```typescript
// In MemoService
async enrichMemosWithTags(memos: Memo[]) {
  // Collect all unique tag IDs
  const allTagIds = [...new Set(memos.flatMap(m => m.tagIds || []))];

  // Batch fetch all tags at once
  const tags = await tagRepository.findByIds(allTagIds);
  const tagMap = new Map(tags.map(t => [t.tagId, t]));

  // Enrich memos
  return memos.map(memo => ({
    ...memo,
    tags: (memo.tagIds || []).map(id => tagMap.get(id)).filter(Boolean),
  }));
}
```

## Technical Considerations

**Schema Design Choices:**
- **No Foreign Keys:** Drizzle doesn't enforce foreign keys; use JOIN queries for relational integrity
- **JSON Fields:** Store complex nested types (arrays, objects) as JSON text with serialization in repositories
- **Indexes:** Add indexes for uid, conversationId, date fields to optimize common queries
- **Unique Constraints:** Use unique index on (uid, date) for daily recommendations to prevent duplicates

**Migration Strategy:**
- Generate migrations via `drizzle-kit generate` after schema changes
- Test migrations on all three database types before deployment
- Migration script handles JSON serialization during LanceDB-to-Drizzle data transfer
- Backup created before migration (includes all tables)

**Performance Optimization:**
- Keep embedding caches in LanceDB (cache hit latency critical)
- Use batch fetch operations (findByIds) to minimize round trips
- Use JOIN queries to fetch related data in single query
- Add indexes for frequently queried fields

**Service Refactoring Principles:**
- Services inject repositories via TypeDI
- Services never import Drizzle directly (except via repositories)
- Maintain existing method signatures (no breaking changes)
- Use batch operations to avoid N+1 queries
- Handle JSON serialization transparently in repositories

**Error Handling:**
- JSON parse errors in repositories should throw descriptive errors
- Migration errors should abort startup with clear messages
- Repository errors should propagate to service layer with context

## Success Metrics

- All remaining LanceDB schemas migrated to Drizzle (9 schemas)
- All services refactored to use repositories (no direct LanceDB access except embedding services)
- All existing API endpoints return identical responses (contracts preserved)
- Migration script successfully transfers historical data for all new schemas
- Application starts successfully with all three database types (MySQL, PostgreSQL, SQLite)
- No increase in query latency for category/tag/AI conversation operations
- Embedding cache performance unchanged (still using LanceDB)

## Open Questions

None - all critical decisions made based on clarifying questions.

## Implementation Notes

**Recommended Implementation Order:**
1. US-001, US-002, US-003 (Schema definitions)
2. US-004, US-005, US-006 (Repository layer)
3. US-016 (Generate migrations)
4. US-007, US-008, US-009, US-010, US-011 (Service refactoring - core entities)
5. US-012 (Verify embedding services unchanged)
6. US-013, US-014, US-015 (Service updates - dependent services)
7. US-017 (Data migration script)
8. US-018 (Documentation)

**Dependencies to Install:**
No new dependencies needed - all Drizzle packages already installed.

**Key Implementation Details:**
- JSON serialization: Use `JSON.stringify()` and `JSON.parse()` in repositories
- JOIN queries: Use Drizzle's `.leftJoin()` or `.innerJoin()` methods
- Batch fetch: Use `inArray()` condition with array of IDs
- Unique constraints: Use `.unique()` in schema definition for (uid, date)
- Indexes: Use `.index()` in schema definition for frequently queried fields

**Migration Considerations:**
- Test JSON serialization with actual LanceDB data before migration
- Verify unique constraint on (uid, date) doesn't conflict with existing data
- Log progress for each table during migration (e.g., "Migrated 100/500 categories...")
- Handle missing/null fields gracefully during migration
