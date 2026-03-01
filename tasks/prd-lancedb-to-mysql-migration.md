# PRD: LanceDB to MySQL Migration with Drizzle ORM

## Introduction

Migrate all scalar (non-vector) data from LanceDB to MySQL using Drizzle ORM, while keeping vector embeddings and full-text search capabilities in LanceDB. This architectural change separates concerns: MySQL handles relational data with ACID guarantees, while LanceDB specializes in vector similarity search and full-text indexing. The migration maintains all existing controller APIs and client-facing DTOs while allowing breaking changes to internal service implementations.

## Goals

- Migrate all scalar fields from LanceDB tables to MySQL with proper relational schema
- Implement Drizzle ORM with full schema definitions, query builder, and migrations
- Keep vector embeddings (`embedding`, `multimodalEmbedding`) and embedding caches in LanceDB
- Maintain all existing controller endpoints and DTO contracts (no breaking changes for clients)
- Implement connection pooling and transaction management for MySQL
- Create a one-time data migration script to transfer existing LanceDB data to MySQL
- Optimize vector search flow: LanceDB returns IDs → batch query MySQL for full records
- Keep full-text search in LanceDB alongside vector search

## User Stories

### US-001: Install and configure Drizzle ORM dependencies

**Description:** As a developer, I need Drizzle ORM and MySQL client installed so I can define schemas and run migrations.

**Acceptance Criteria:**

- [ ] Install `drizzle-orm` and `drizzle-kit` packages
- [ ] Install `mysql2` as MySQL client
- [ ] Add Drizzle config file at `apps/server/drizzle.config.ts`
- [ ] Add MySQL connection configuration to `apps/server/src/config/config.ts`
- [ ] Update `.env.example` with MySQL connection variables (host, port, user, password, database)
- [ ] Typecheck passes

### US-002: Define Drizzle schema for all scalar tables

**Description:** As a developer, I need Drizzle schema definitions for all tables so MySQL can store relational data.

**Acceptance Criteria:**

- [ ] Create `apps/server/src/db/schema/` directory
- [ ] Define schema for `users` table (all fields except embeddings)
- [ ] Define schema for `memos` table (excluding `embedding` field)
- [ ] Define schema for `categories` table
- [ ] Define schema for `tags` table
- [ ] Define schema for `memo_relations` table
- [ ] Define schema for `attachments` table (excluding `multimodalEmbedding` field)
- [ ] Define schema for `ai_conversations` table
- [ ] Define schema for `ai_messages` table (excluding `sources` vector references)
- [ ] Define schema for `daily_recommendations` table (store as JSON array)
- [ ] Define schema for `push_rules` table
- [ ] Define schema for `table_migrations` table (for migration tracking)
- [ ] Add proper indexes (primary keys, foreign keys, unique constraints)
- [ ] Add timestamps with default values (createdAt, updatedAt)
- [ ] Export all schemas from `apps/server/src/db/schema/index.ts`
- [ ] Typecheck passes

### US-003: Create database connection service with pooling

**Description:** As a developer, I need a database connection service so services can query MySQL with connection pooling.

**Acceptance Criteria:**

- [ ] Create `apps/server/src/db/connection.ts` with Drizzle connection setup
- [ ] Configure MySQL connection pool (min: 2, max: 10 connections)
- [ ] Export `db` instance (Drizzle client) as singleton
- [ ] Add graceful shutdown handler to close pool on app termination
- [ ] Add connection health check method
- [ ] Log connection pool status on initialization
- [ ] Typecheck passes

### US-004: Generate and run initial Drizzle migrations

**Description:** As a developer, I need initial database migrations so MySQL schema matches Drizzle definitions.

**Acceptance Criteria:**

- [ ] Run `drizzle-kit generate` to create initial migration files in `apps/server/drizzle/`
- [ ] Review generated SQL for correctness (tables, indexes, constraints)
- [ ] Create migration runner script at `apps/server/src/db/migrate.ts`
- [ ] Run migrations automatically on server startup (after MySQL connection)
- [ ] Add `pnpm migrate` script to package.json for manual migration runs
- [ ] Verify all tables created in MySQL database
- [ ] Typecheck passes

### US-005: Refactor UserService to use Drizzle

**Description:** As a developer, I need UserService to query MySQL so user data is stored in relational database.

**Acceptance Criteria:**

- [ ] Replace LanceDB queries with Drizzle queries in `user.service.ts`
- [ ] Implement `createUser()` with MySQL insert
- [ ] Implement `getUserByUid()` with Drizzle query
- [ ] Implement `getUserByEmail()` with Drizzle query
- [ ] Implement `getUserByPhone()` with Drizzle query
- [ ] Implement `updateUser()` with Drizzle update
- [ ] Remove LanceDB table references from UserService
- [ ] Ensure all existing user controller endpoints work unchanged
- [ ] Typecheck passes

### US-006: Refactor CategoryService to use Drizzle

**Description:** As a developer, I need CategoryService to query MySQL so category data benefits from relational constraints.

**Acceptance Criteria:**

- [ ] Replace LanceDB queries with Drizzle queries in `category.service.ts`
- [ ] Implement `createCategory()` with MySQL insert
- [ ] Implement `getCategoriesByUid()` with Drizzle query
- [ ] Implement `getCategoryById()` with Drizzle query
- [ ] Implement `updateCategory()` with Drizzle update
- [ ] Implement `deleteCategory()` with Drizzle delete
- [ ] Add foreign key constraint: `categories.uid` → `users.uid`
- [ ] Remove LanceDB table references from CategoryService
- [ ] Ensure all existing category controller endpoints work unchanged
- [ ] Typecheck passes

### US-007: Refactor TagService to use Drizzle

**Description:** As a developer, I need TagService to query MySQL so tag usage counts are accurately maintained.

**Acceptance Criteria:**

- [ ] Replace LanceDB queries with Drizzle queries in `tag.service.ts`
- [ ] Implement `createTag()` with MySQL insert
- [ ] Implement `getTagsByUid()` with Drizzle query
- [ ] Implement `getTagById()` with Drizzle query
- [ ] Implement `updateTag()` with Drizzle update (including usageCount)
- [ ] Implement `deleteTag()` with Drizzle delete
- [ ] Implement `incrementUsageCount()` with atomic update
- [ ] Add foreign key constraint: `tags.uid` → `users.uid`
- [ ] Remove LanceDB table references from TagService
- [ ] Ensure all existing tag controller endpoints work unchanged
- [ ] Typecheck passes

### US-008: Refactor MemoRelationService to use Drizzle

**Description:** As a developer, I need MemoRelationService to query MySQL so memo relations leverage relational database features.

**Acceptance Criteria:**

- [ ] Replace LanceDB queries with Drizzle queries in `memo-relation.service.ts`
- [ ] Implement `createRelation()` with MySQL insert
- [ ] Implement `getRelatedMemos()` with Drizzle join query
- [ ] Implement `getBacklinks()` with Drizzle reverse join query
- [ ] Implement `deleteRelation()` with Drizzle delete
- [ ] Add foreign key constraints: `memo_relations.sourceMemoId` → `memos.memoId`, `targetMemoId` → `memos.memoId`
- [ ] Add composite unique index on (sourceMemoId, targetMemoId)
- [ ] Remove LanceDB table references from MemoRelationService
- [ ] Ensure all existing memo relation controller endpoints work unchanged
- [ ] Typecheck passes

### US-009: Refactor AttachmentService to use Drizzle

**Description:** As a developer, I need AttachmentService to query MySQL so attachment metadata is stored relationally.

**Acceptance Criteria:**

- [ ] Replace LanceDB scalar queries with Drizzle queries in `attachment.service.ts`
- [ ] Implement `createAttachment()` with MySQL insert (excluding `multimodalEmbedding`)
- [ ] Implement `getAttachmentById()` with Drizzle query
- [ ] Implement `getAttachmentsByUid()` with Drizzle query
- [ ] Implement `deleteAttachment()` with Drizzle delete
- [ ] Keep `multimodalEmbedding` storage in LanceDB (separate table: `attachment_vectors`)
- [ ] Add foreign key constraint: `attachments.uid` → `users.uid`
- [ ] Remove scalar field queries from LanceDB in AttachmentService
- [ ] Ensure all existing attachment controller endpoints work unchanged
- [ ] Typecheck passes

### US-010: Create hybrid MemoService with MySQL + LanceDB

**Description:** As a developer, I need MemoService to store scalar data in MySQL and vectors in LanceDB so data is properly separated.

**Acceptance Criteria:**

- [ ] Replace scalar field queries with Drizzle in `memo.service.ts`
- [ ] Implement `createMemo()`: insert scalar fields to MySQL, embedding to LanceDB `memo_vectors` table
- [ ] Implement `getMemoById()`: query MySQL for scalar data
- [ ] Implement `getMemosByUid()`: query MySQL with pagination
- [ ] Implement `updateMemo()`: update MySQL scalar fields, regenerate embedding in LanceDB if content changed
- [ ] Implement `deleteMemo()`: delete from both MySQL and LanceDB `memo_vectors`
- [ ] Add foreign key constraints: `memos.uid` → `users.uid`, `memos.categoryId` → `categories.categoryId`
- [ ] Handle `attachments` and `tagIds` as JSON arrays in MySQL
- [ ] Use transactions for operations spanning multiple tables
- [ ] Remove scalar field queries from LanceDB in MemoService
- [ ] Ensure all existing memo controller endpoints work unchanged
- [ ] Typecheck passes

### US-011: Refactor SearchService for hybrid vector search

**Description:** As a developer, I need SearchService to perform vector search in LanceDB then enrich with MySQL data.

**Acceptance Criteria:**

- [ ] Update `semanticSearch()` in `search.service.ts` to query LanceDB `memo_vectors` for top K memo IDs
- [ ] Implement batch query to MySQL: fetch full memo records by IDs in single query
- [ ] Preserve similarity scores from LanceDB in results
- [ ] Implement full-text search using LanceDB (keep existing implementation)
- [ ] Ensure search results include all scalar fields from MySQL
- [ ] Maintain search result ordering by similarity score
- [ ] Remove direct scalar field access from LanceDB search results
- [ ] Ensure all existing search/explore controller endpoints work unchanged
- [ ] Typecheck passes

### US-012: Refactor AIConversationService to use Drizzle

**Description:** As a developer, I need AIConversationService to query MySQL so conversation history is stored relationally.

**Acceptance Criteria:**

- [ ] Replace LanceDB queries with Drizzle queries in `ai-conversation.service.ts`
- [ ] Implement `createConversation()` with MySQL insert
- [ ] Implement `getConversationsByUid()` with Drizzle query
- [ ] Implement `getConversationById()` with Drizzle query
- [ ] Implement `updateConversation()` with Drizzle update
- [ ] Implement `deleteConversation()` with cascade delete to ai_messages
- [ ] Add foreign key constraint: `ai_conversations.uid` → `users.uid`
- [ ] Remove LanceDB table references from AIConversationService
- [ ] Ensure all existing AI conversation controller endpoints work unchanged
- [ ] Typecheck passes

### US-013: Refactor AIMessageService to use Drizzle

**Description:** As a developer, I need AIMessageService to query MySQL so messages are stored with proper foreign keys.

**Acceptance Criteria:**

- [ ] Create `ai-message.service.ts` if not exists, or refactor existing message handling
- [ ] Replace LanceDB queries with Drizzle queries
- [ ] Implement `createMessage()` with MySQL insert (store `sources` as JSON)
- [ ] Implement `getMessagesByConversationId()` with Drizzle query
- [ ] Implement `deleteMessage()` with Drizzle delete
- [ ] Add foreign key constraint: `ai_messages.conversationId` → `ai_conversations.conversationId`
- [ ] Store `sources` array as JSON column in MySQL
- [ ] Remove LanceDB table references from message handling
- [ ] Ensure all existing AI message controller endpoints work unchanged
- [ ] Typecheck passes

### US-014: Refactor RecommendationService to use Drizzle

**Description:** As a developer, I need RecommendationService to query MySQL so daily recommendations are cached relationally.

**Acceptance Criteria:**

- [ ] Replace LanceDB queries with Drizzle queries in `recommendation.service.ts`
- [ ] Implement `createRecommendation()` with MySQL insert (store `memoIds` as JSON array)
- [ ] Implement `getRecommendationByDate()` with Drizzle query
- [ ] Implement `deleteRecommendation()` with Drizzle delete
- [ ] Store `memoIds` as JSON column in MySQL
- [ ] Add foreign key constraint: `daily_recommendations.uid` → `users.uid`
- [ ] Add unique constraint on (uid, date)
- [ ] Remove LanceDB table references from RecommendationService
- [ ] Ensure all existing recommendation controller endpoints work unchanged
- [ ] Typecheck passes

### US-015: Refactor PushRuleService to use Drizzle

**Description:** As a developer, I need PushRuleService to query MySQL so push rules are managed in relational database.

**Acceptance Criteria:**

- [ ] Replace LanceDB queries with Drizzle queries in `push-rule.service.ts`
- [ ] Implement `createPushRule()` with MySQL insert
- [ ] Implement `getPushRulesByUid()` with Drizzle query
- [ ] Implement `getPushRuleById()` with Drizzle query
- [ ] Implement `updatePushRule()` with Drizzle update
- [ ] Implement `deletePushRule()` with Drizzle delete
- [ ] Store `channels` as JSON column in MySQL
- [ ] Add foreign key constraint: `push_rules.uid` → `users.uid`
- [ ] Remove LanceDB table references from PushRuleService
- [ ] Ensure all existing push rule controller endpoints work unchanged
- [ ] Typecheck passes

### US-016: Create LanceDB vector-only tables

**Description:** As a developer, I need separate vector-only tables in LanceDB so embeddings are stored efficiently.

**Acceptance Criteria:**

- [ ] Create `memo_vectors` table schema in LanceDB with fields: `memoId` (string), `embedding` (vector)
- [ ] Create `attachment_vectors` table schema in LanceDB with fields: `attachmentId` (string), `multimodalEmbedding` (vector)
- [ ] Keep `embedding_cache` table in LanceDB (unchanged)
- [ ] Keep `multimodal_embedding_cache` table in LanceDB (unchanged)
- [ ] Create indexes on vector fields for similarity search
- [ ] Update `apps/server/src/models/db/schema.ts` to reflect new vector-only schemas
- [ ] Typecheck passes

### US-017: Update DTOs for client-facing data structures

**Description:** As a developer, I need all client-facing data defined in `@aimo/dto` so contracts are explicit and versioned.

**Acceptance Criteria:**

- [ ] Review existing DTOs in `packages/dto/src/` for completeness
- [ ] Add missing DTOs for any controller responses not yet defined
- [ ] Ensure `MemoDto` includes all scalar fields returned by controllers
- [ ] Ensure `AttachmentDto` includes all scalar fields (no embeddings)
- [ ] Ensure `CategoryDto`, `TagDto`, `UserDto` match controller responses
- [ ] Ensure `AIConversationDto` and `AIMessageDto` are complete
- [ ] Add JSDoc comments to all DTO fields
- [ ] Rebuild DTO package: `pnpm --filter @aimo/dto build`
- [ ] Typecheck passes in both server and web packages

### US-018: Implement transaction support for multi-table operations

**Description:** As a developer, I need transaction support so operations spanning multiple tables are atomic.

**Acceptance Criteria:**

- [ ] Create transaction helper in `apps/server/src/db/transaction.ts`
- [ ] Wrap `createMemo()` + embedding insert in transaction
- [ ] Wrap `deleteMemo()` + vector deletion in transaction
- [ ] Wrap `createAttachment()` + multimodal embedding insert in transaction
- [ ] Wrap `deleteConversation()` + cascade message deletion in transaction
- [ ] Add rollback handling for failed transactions
- [ ] Log transaction errors with context
- [ ] Typecheck passes

### US-019: Create data migration script from LanceDB to MySQL

**Description:** As a developer, I need a one-time migration script so existing LanceDB data is transferred to MySQL.

**Acceptance Criteria:**

- [ ] Create `apps/server/src/scripts/migrate-lancedb-to-mysql.ts`
- [ ] Migrate `users` table: read from LanceDB, insert into MySQL
- [ ] Migrate `categories` table with foreign key handling
- [ ] Migrate `tags` table with foreign key handling
- [ ] Migrate `memos` table: scalar fields to MySQL, embeddings to `memo_vectors` in LanceDB
- [ ] Migrate `memo_relations` table with foreign key handling
- [ ] Migrate `attachments` table: scalar fields to MySQL, embeddings to `attachment_vectors` in LanceDB
- [ ] Migrate `ai_conversations` and `ai_messages` tables
- [ ] Migrate `daily_recommendations` and `push_rules` tables
- [ ] Add progress logging (e.g., "Migrated 1000/5000 memos")
- [ ] Add error handling and retry logic for failed records
- [ ] Add dry-run mode to preview migration without writing
- [ ] Add `pnpm migrate:data` script to package.json
- [ ] Document migration steps in `apps/server/MIGRATION.md`
- [ ] Typecheck passes

### US-020: Update LanceDbService for vector-only operations

**Description:** As a developer, I need LanceDbService to only handle vector operations so responsibilities are clear.

**Acceptance Criteria:**

- [ ] Remove scalar table initialization from `lancedb.ts`
- [ ] Add `memo_vectors` table initialization
- [ ] Add `attachment_vectors` table initialization
- [ ] Keep `embedding_cache` and `multimodal_embedding_cache` initialization
- [ ] Update `getTable()` method to only return vector tables
- [ ] Remove methods for scalar data queries
- [ ] Add methods for vector CRUD: `insertVector()`, `deleteVector()`, `searchVectors()`
- [ ] Typecheck passes

### US-021: Update environment configuration and documentation

**Description:** As a developer, I need updated configuration so MySQL connection is properly documented.

**Acceptance Criteria:**

- [ ] Add MySQL config section to `apps/server/src/config/config.ts`
- [ ] Update `.env.example` with MySQL variables: `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
- [ ] Update `apps/server/README.md` with MySQL setup instructions
- [ ] Add migration guide in `apps/server/MIGRATION.md`
- [ ] Document Drizzle commands: `pnpm drizzle-kit generate`, `pnpm drizzle-kit migrate`, `pnpm drizzle-kit studio`
- [ ] Update Docker Compose file to include MySQL service
- [ ] Update main `README.md` in project root to mention MySQL requirement
- [ ] Typecheck passes

### US-022: Update graceful shutdown to close MySQL connections

**Description:** As a developer, I need graceful shutdown to close MySQL connections so no connections leak on restart.

**Acceptance Criteria:**

- [ ] Add MySQL connection pool shutdown to `apps/server/src/index.ts` shutdown handler
- [ ] Ensure MySQL closes before LanceDB in shutdown sequence
- [ ] Log "MySQL connection pool closed" on successful shutdown
- [ ] Test graceful shutdown with `Ctrl+C` during development
- [ ] Typecheck passes

### US-023: Performance optimization and indexing

**Description:** As a developer, I need proper indexes so queries perform well at scale.

**Acceptance Criteria:**

- [ ] Add index on `memos.uid` for user-specific queries
- [ ] Add index on `memos.categoryId` for category filtering
- [ ] Add index on `memos.createdAt` for time-based sorting
- [ ] Add composite index on `memo_relations(sourceMemoId, targetMemoId)`
- [ ] Add index on `attachments.uid` for user-specific queries
- [ ] Add index on `ai_messages.conversationId` for conversation queries
- [ ] Add index on `daily_recommendations(uid, date)` for cache lookups
- [ ] Run `EXPLAIN` on critical queries to verify index usage
- [ ] Document index strategy in `apps/server/MIGRATION.md`
- [ ] Typecheck passes

## Functional Requirements

- FR-1: All scalar fields from LanceDB tables must be migrated to MySQL with proper data types
- FR-2: Vector fields (`embedding`, `multimodalEmbedding`) must remain in LanceDB in separate vector-only tables
- FR-3: Embedding cache tables (`embedding_cache`, `multimodal_embedding_cache`) must remain entirely in LanceDB
- FR-4: Drizzle ORM must be used for all MySQL operations (schema, queries, migrations)
- FR-5: MySQL connection pool must be configured with min 2, max 10 connections
- FR-6: All controller endpoints must maintain exact same request/response contracts
- FR-7: All client-facing data structures must be defined in `@aimo/dto` package
- FR-8: Vector search flow must be: LanceDB returns IDs → MySQL batch query for full records
- FR-9: Full-text search must remain in LanceDB alongside vector search
- FR-10: Multi-table operations must use transactions (memo creation, deletion, etc.)
- FR-11: Foreign key constraints must be enforced in MySQL schema
- FR-12: One-time data migration script must transfer all existing LanceDB data to MySQL
- FR-13: Graceful shutdown must close MySQL connection pool before LanceDB
- FR-14: All services must be refactored to use Drizzle (breaking internal changes allowed)
- FR-15: LanceDbService must only handle vector operations after migration

## Non-Goals (Out of Scope)

- No changes to frontend code or client-side API calls
- No changes to authentication or authorization logic
- No changes to file storage adapters (S3, OSS, local)
- No changes to embedding generation logic (OpenAI API)
- No changes to AI conversation logic (LangChain, OpenAI)
- No changes to push notification scheduling
- No changes to Docker deployment strategy (MySQL will be added to docker-compose)
- No migration to PostgreSQL or other relational databases
- No query performance benchmarking (beyond index verification)
- No GraphQL or alternative API layer
- No real-time sync between MySQL and LanceDB (eventual consistency is acceptable)

## Technical Considerations

### Database Schema Design

- Use `VARCHAR(255)` for IDs (nanoid format)
- Use `TEXT` for content fields
- Use `JSON` for arrays (`attachments`, `tagIds`, `memoIds`, `sources`)
- Use `TIMESTAMP` for `createdAt` and `updatedAt` with default `CURRENT_TIMESTAMP`
- Use `INT` for numeric fields (`status`, `size`, `usageCount`, `pushTime`, `enabled`)
- Add `ON DELETE CASCADE` for foreign keys where appropriate

### Connection Pooling

- MySQL pool: min 2, max 10 connections
- Idle timeout: 10 minutes
- Connection timeout: 5 seconds
- Health check query: `SELECT 1`

### Transaction Strategy

- Use Drizzle transactions for operations spanning multiple tables
- Rollback on any error in transaction
- Log transaction errors with full context
- Keep transactions short (avoid long-running operations inside transactions)

### Migration Script Strategy

- Batch size: 100 records per batch
- Progress logging every 100 records
- Error handling: log failed records, continue with next batch
- Dry-run mode: preview migration without writing
- Idempotency: check if record exists before inserting

### Vector Search Optimization

- LanceDB returns top K memo IDs with similarity scores
- Single batch query to MySQL: `SELECT * FROM memos WHERE memoId IN (...)`
- Preserve similarity scores from LanceDB in application layer
- Re-sort results by similarity after MySQL join if needed

### Drizzle Configuration

- Migration folder: `apps/server/drizzle/`
- Schema folder: `apps/server/src/db/schema/`
- Driver: `mysql2`
- Migration mode: automatic on startup (production), manual in development

### LanceDB Vector Tables

- `memo_vectors`: `memoId` (string), `embedding` (FixedSizeList<Float32>)
- `attachment_vectors`: `attachmentId` (string), `multimodalEmbedding` (FixedSizeList<Float32>)
- Index type: IVF (Inverted File Index) for fast similarity search
- Distance metric: cosine similarity (default)

## Success Metrics

- All 24 user stories completed with acceptance criteria met
- Zero breaking changes to controller API contracts
- All existing integration tests pass
- Data migration script successfully transfers 100% of records
- MySQL queries perform within 100ms for typical operations (verified with `EXPLAIN`)
- Vector search latency remains under 200ms (LanceDB + MySQL join)
- Zero connection leaks (verified with connection pool monitoring)
- Graceful shutdown completes within 5 seconds
- Typecheck passes across all packages (`pnpm typecheck`)

## Open Questions

- Should we add database connection retry logic for transient failures?
- Should we implement read replicas for MySQL (future scalability)?
- Should we add query result caching layer (e.g., Redis) for frequently accessed data?
- Should we implement soft deletes for memos and attachments (add `deletedAt` field)?
- Should we add database query logging in development mode for debugging?
- Should we create separate Drizzle schemas for different table groups (users, memos, ai, etc.)?
- Should we add database seeding scripts for development and testing?

## Implementation Order

1. **Phase 1: Setup** (US-001 to US-004)
   - Install dependencies, configure Drizzle, define schemas, run initial migrations

2. **Phase 2: Simple Services** (US-005 to US-008)
   - Migrate UserService, CategoryService, TagService, MemoRelationService (no vector dependencies)

3. **Phase 3: Complex Services** (US-009 to US-011)
   - Migrate AttachmentService, MemoService, SearchService (hybrid MySQL + LanceDB)

4. **Phase 4: AI and Scheduling Services** (US-012 to US-015)
   - Migrate AIConversationService, AIMessageService, RecommendationService, PushRuleService

5. **Phase 5: Infrastructure** (US-016 to US-018)
   - Create vector-only tables, update DTOs, implement transactions

6. **Phase 6: Data Migration** (US-019 to US-020)
   - Create migration script, update LanceDbService for vector-only operations

7. **Phase 7: Testing and Documentation** (US-021 to US-024)
   - Update config, add integration tests, graceful shutdown, performance optimization

## Dependencies

- `drizzle-orm` (^0.36.0 or latest)
- `drizzle-kit` (^0.29.0 or latest)
- `mysql2` (^3.11.0 or latest)
- Existing: `@lancedb/lancedb`, `apache-arrow`, `typedi`, `routing-controllers`

## Migration Timeline Estimate

- Phase 1: 1 day (setup and configuration)
- Phase 2: 2 days (simple services)
- Phase 3: 3 days (complex services with vector handling)
- Phase 4: 2 days (AI and scheduling services)
- Phase 5: 1 day (infrastructure)
- Phase 6: 2 days (data migration script and testing)
- Phase 7: 2 days (testing, documentation, optimization)

**Total: ~13 days** (assumes single developer, full-time work)

## Rollback Plan

If migration fails or causes critical issues:

1. Revert code changes to pre-migration commit
2. Restore LanceDB data from backup (if modified)
3. Drop MySQL database (no production data lost if migration script failed)
4. Investigate root cause before re-attempting migration
5. Consider gradual migration (migrate one service at a time, dual-write period)
