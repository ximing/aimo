# PRD: Migrate to Drizzle ORM with Hybrid Storage Architecture

## Introduction

Migrate AIMO's data layer from pure LanceDB to a hybrid architecture where scalar data lives in a relational database (MySQL/PostgreSQL/SQLite via Drizzle ORM) and vector/full-text search remains in LanceDB. This addresses performance issues with scalar queries while maintaining vector search capabilities. The migration preserves all existing controller interfaces and automatically migrates historical LanceDB data on first startup.

## Goals

- Eliminate scalar query performance bottlenecks by moving to relational DB
- Support MySQL (default), PostgreSQL, and SQLite through unified Drizzle abstraction
- Maintain vector search and full-text search capabilities via LanceDB
- Preserve all existing REST API contracts (no breaking changes to controllers)
- Automatically migrate historical LanceDB data on first startup with backup
- Maintain clean separation between scalar storage and vector storage layers

## User Stories

### US-001: Create Drizzle database abstraction layer
**Description:** As a developer, I need a unified database interface that supports MySQL, PostgreSQL, and SQLite so the application works across different deployment environments.

**Acceptance Criteria:**
- [ ] Create `src/sources/database/` directory structure
- [ ] Implement `DrizzleAdapter` with connection factory for MySQL/PostgreSQL/SQLite
- [ ] Database type selected via `DATABASE_TYPE` env var (mysql|postgresql|sqlite, default: mysql)
- [ ] Connection string parsed from existing env pattern (e.g., `DATABASE_URL` or service-specific vars)
- [ ] Connection pooling configured appropriately for each DB type
- [ ] Graceful connection error handling with clear error messages
- [ ] Typecheck passes

### US-002: Define Drizzle schema for scalar data
**Description:** As a developer, I need Drizzle table schemas that mirror current LanceDB scalar fields so data structure remains consistent.

**Acceptance Criteria:**
- [ ] Create schema files in `src/sources/database/schema/` for:
  - `memos.ts` (id, userId, content, createdAt, updatedAt, tags, etc.)
  - `users.ts` (existing user fields)
  - `memo_relations.ts` (sourceMemoId, targetMemoId, createdAt)
  - `attachments.ts` (existing attachment fields)
  - `_migrations.ts` (migration tracking)
- [ ] Schemas exclude embedding vectors (remain in LanceDB)
- [ ] Use appropriate Drizzle column types for each DB (e.g., `text()` vs `varchar()`)
- [ ] Define indexes for frequently queried fields (userId, createdAt, tags)
- [ ] Typecheck passes

### US-003: Implement database migration system
**Description:** As a developer, I need Drizzle migrations to manage schema changes across all supported databases.

**Acceptance Criteria:**
- [ ] Configure `drizzle-kit` in `apps/server/drizzle.config.ts`
- [ ] Generate initial migration for all schemas
- [ ] Migration files created in `src/sources/database/migrations/`
- [ ] Migrations run automatically on app startup via `DrizzleAdapter.runMigrations()`
- [ ] Migration state tracked in `_migrations` table (reuse existing pattern)
- [ ] Typecheck passes

### US-004: Create repository layer for scalar operations
**Description:** As a developer, I need repository classes that encapsulate Drizzle queries so services don't directly interact with the ORM.

**Acceptance Criteria:**
- [x] Create `src/repositories/` directory
- [x] Implement `MemoRepository` with methods:
  - `create()`, `findById()`, `findByUserId()`, `update()`, `delete()`
  - `findByIds()` (batch fetch for LanceDB results)
  - `search()` (scalar filters: tags, date range, userId)
- [x] Implement `MemoRelationRepository` (existing relation operations)
- [x] Implement `UserRepository` (existing user operations)
- [x] Implement `AttachmentRepository` (existing attachment operations)
- [x] All methods return DTOs from `@aimo/dto`
- [x] Repositories decorated with `@Service()` for TypeDI injection
- [x] Typecheck passes

### US-005: Refactor MemoService to use hybrid storage
**Description:** As a developer, I need MemoService to query LanceDB for vector IDs then fetch details from Drizzle so vector search works with relational data.

**Acceptance Criteria:**
- [ ] `MemoService.create()` writes to both Drizzle (scalar) and LanceDB (vector + id)
- [ ] `MemoService.update()` updates both Drizzle and LanceDB
- [ ] `MemoService.delete()` removes from both stores
- [ ] `MemoService.findById()` fetches from Drizzle only
- [ ] `MemoService.listMemos()` fetches from Drizzle with pagination/filters
- [ ] Vector search flow: LanceDB returns IDs → `MemoRepository.findByIds()` fetches details
- [ ] Existing controller methods unchanged (same signatures and responses)
- [ ] Typecheck passes

### US-006: Refactor SearchService for hybrid queries
**Description:** As a developer, I need SearchService to coordinate between LanceDB (vector search) and Drizzle (scalar filters) so complex queries work efficiently.

**Acceptance Criteria:**
- [ ] `SearchService.semanticSearch()` queries LanceDB for vector similarity, returns IDs
- [ ] Fetch memo details via `MemoRepository.findByIds()` with scalar filters applied
- [ ] Full-text search remains in LanceDB, scalar enrichment from Drizzle
- [ ] Support combined queries (e.g., semantic search + tag filter + date range)
- [ ] Maintain existing search response format (DTOs unchanged)
- [ ] Typecheck passes

### US-007: Refactor UserService and AttachmentService
**Description:** As a developer, I need UserService and AttachmentService to use Drizzle repositories so all scalar data lives in the relational DB.

**Acceptance Criteria:**
- [ ] `UserService` uses `UserRepository` instead of LanceDB
- [ ] `AttachmentService` uses `AttachmentRepository` instead of LanceDB
- [ ] All existing service methods work identically (same inputs/outputs)
- [ ] JWT authentication flow unchanged
- [ ] File upload/storage logic unchanged (only metadata storage migrated)
- [ ] Typecheck passes

### US-008: Implement LanceDB data migration script
**Description:** As a system administrator, I want historical LanceDB data automatically migrated to Drizzle on first startup so no data is lost.

**Acceptance Criteria:**
- [ ] Create `src/migrations/lancedb-to-drizzle.migration.ts`
- [ ] On startup, check if LanceDB data exists and Drizzle is empty
- [ ] Before migration, export full LanceDB backup to `./backups/lancedb-backup-[timestamp].json`
- [ ] Migrate all tables: memos, users, memo_relations, attachments
- [ ] Migration is transactional (rollback on failure)
- [ ] Migration failure causes startup to abort with clear error message
- [ ] Log migration progress (e.g., "Migrated 1000/5000 memos...")
- [ ] Mark migration complete in `_migrations` table to prevent re-run
- [ ] Typecheck passes

### US-009: Update environment configuration
**Description:** As a deployment engineer, I need updated environment variables to configure the relational database connection.

**Acceptance Criteria:**
- [ ] Update `.env.example` with new variables:
  - `DATABASE_TYPE=mysql` (mysql|postgresql|sqlite)
  - `DATABASE_URL=mysql://user:pass@localhost:3306/aimo` (or equivalent)
  - Optional: `DATABASE_POOL_SIZE=10`
- [ ] Update `README.md` and `CLAUDE.md` with database setup instructions
- [ ] Document migration from LanceDB-only setup
- [ ] Keep existing `LANCEDB_*` variables (still used for vectors)
- [ ] Validate required env vars on startup with helpful error messages

### US-010: Add database health checks
**Description:** As a DevOps engineer, I need health check endpoints to verify database connectivity for monitoring and deployment validation.

**Acceptance Criteria:**
- [ ] Add `GET /health/db` endpoint in existing health controller
- [ ] Check Drizzle connection (simple query like `SELECT 1`)
- [ ] Check LanceDB connection (existing check)
- [ ] Return JSON: `{ drizzle: "ok", lancedb: "ok" }` or error details
- [ ] 200 status if both healthy, 503 if either fails
- [ ] Typecheck passes

### US-011: Update test suite for hybrid storage
**Description:** As a developer, I need tests updated to cover Drizzle repositories and hybrid queries so regressions are caught.

**Acceptance Criteria:**
- [ ] Update existing service tests to use in-memory SQLite for Drizzle
- [ ] Mock LanceDB interactions in service tests
- [ ] Add repository unit tests for CRUD operations
- [ ] Add integration tests for hybrid search (LanceDB IDs → Drizzle details)
- [ ] All existing tests pass with new implementation
- [ ] Test coverage maintained or improved

### US-012: Graceful shutdown for Drizzle connections
**Description:** As a system administrator, I need database connections properly closed on shutdown so no connections leak.

**Acceptance Criteria:**
- [ ] Add Drizzle connection cleanup to `src/index.ts` shutdown handler
- [ ] Close connection pool before process exit
- [ ] Shutdown order: Stop accepting requests → Close Drizzle → Close LanceDB
- [ ] Log shutdown steps for debugging
- [ ] Typecheck passes

## Functional Requirements

**Database Abstraction:**
- FR-1: Support MySQL, PostgreSQL, and SQLite via Drizzle ORM with unified interface
- FR-2: Database type selected via `DATABASE_TYPE` environment variable (default: mysql)
- FR-3: Connection configuration read from environment variables (DATABASE_URL or service-specific)
- FR-4: Connection pooling configured per database type with sensible defaults

**Schema & Data Model:**
- FR-5: Drizzle schemas mirror LanceDB scalar fields (exclude embedding vectors)
- FR-6: Schemas support all three database types with appropriate column type mapping
- FR-7: Indexes created for frequently queried fields (userId, createdAt, tags)
- FR-8: Foreign key constraints defined where applicable (e.g., memo.userId → user.id)

**Repository Pattern:**
- FR-9: Repository classes encapsulate all Drizzle queries (services don't use ORM directly)
- FR-10: Repositories return DTOs from `@aimo/dto` package
- FR-11: Repositories support batch operations (e.g., `findByIds()` for hybrid queries)
- FR-12: Repositories decorated with `@Service()` for dependency injection

**Hybrid Storage Architecture:**
- FR-13: Memo creation writes scalar data to Drizzle, embeddings to LanceDB
- FR-14: Memo updates synchronize both Drizzle and LanceDB
- FR-15: Memo deletion removes from both stores
- FR-16: Vector search queries LanceDB for IDs, then fetches details from Drizzle
- FR-17: Scalar queries (list, filter, pagination) use Drizzle only
- FR-18: Full-text search uses LanceDB, results enriched from Drizzle

**Controller Interface Preservation:**
- FR-19: All existing REST endpoints maintain identical request/response formats
- FR-20: No breaking changes to DTOs or API contracts
- FR-21: Controller method signatures unchanged
- FR-22: Error responses maintain existing format and status codes

**Data Migration:**
- FR-23: On first startup, detect existing LanceDB data
- FR-24: Backup LanceDB data to `./backups/lancedb-backup-[timestamp].json` before migration
- FR-25: Migrate all scalar data from LanceDB to Drizzle (memos, users, relations, attachments)
- FR-26: Migration is blocking (app waits for completion before accepting requests)
- FR-27: Migration failure aborts startup with clear error message and instructions
- FR-28: Migration marked complete in `_migrations` table to prevent re-run
- FR-29: Migration progress logged to console (e.g., batch progress)

**Error Handling:**
- FR-30: Database connection failures provide clear error messages with troubleshooting hints
- FR-31: Missing required environment variables fail startup with helpful messages
- FR-32: Unsupported `DATABASE_TYPE` values rejected with list of valid options
- FR-33: Migration errors include backup file location for manual recovery

**Health & Monitoring:**
- FR-34: Health check endpoint verifies both Drizzle and LanceDB connectivity
- FR-35: Graceful shutdown closes Drizzle connections before process exit
- FR-36: Database connection status logged on startup

## Non-Goals (Out of Scope)

- No support for other ORMs (Prisma, TypeORM, etc.) - Drizzle only
- No support for other vector databases - LanceDB remains the vector store
- No real-time replication or multi-region database support
- No automatic database provisioning (users must set up MySQL/PostgreSQL themselves)
- No query performance benchmarking tools (assume relational DB is faster for scalar queries)
- No data sharding or horizontal scaling strategies
- No migration rollback command (backup file provided for manual recovery)
- No gradual migration or feature flag toggle (one-time migration only)
- No changes to frontend code (API contracts preserved)
- No changes to authentication or authorization logic
- No changes to file storage or attachment handling (only metadata migrated)

## Design Considerations

**Directory Structure:**
```
apps/server/src/
├── sources/
│   ├── database/
│   │   ├── index.ts              # DrizzleAdapter factory
│   │   ├── schema/
│   │   │   ├── memos.ts
│   │   │   ├── users.ts
│   │   │   ├── memo-relations.ts
│   │   │   ├── attachments.ts
│   │   │   └── migrations.ts
│   │   └── migrations/           # Generated Drizzle migrations
│   └── lancedb.ts                # Existing vector DB (vectors only)
├── repositories/
│   ├── memo.repository.ts
│   ├── user.repository.ts
│   ├── memo-relation.repository.ts
│   └── attachment.repository.ts
├── services/
│   ├── memo.service.ts           # Refactored for hybrid storage
│   ├── search.service.ts         # Refactored for hybrid queries
│   ├── user.service.ts           # Refactored to use UserRepository
│   └── attachment.service.ts     # Refactored to use AttachmentRepository
└── migrations/
    └── lancedb-to-drizzle.migration.ts
```

**Drizzle Configuizzle-orm` and `drizzle-kit` packages
- Database-specific drivers: `mysql2`, `pg`, `better-sqlite3`
- Schema defined in TypeScript (type-safe)
- Migrations generated via `drizzle-kit generate:mysql|pg|sqlite`

**Repository Pattern Benefits:**
- Services don't import Drizzle directly (easier to mock in tests)
- Query logic centralized (easier to optimize later)
- Clear separation of concerns (service = business logic, repository = data access)

**Hybrid Query Flow Example:**
```typescript
// Semantic search with tag filter
async semanticSearch(query: string, userId: string, tags?: string[]) {
  // 1. LanceDB: Get IDs by vector similarity
  const ids = await lancedb.searchByEmbedding(query, userId);

  // 2. Drizzle: Fetch details with scalar filters
  const memos = await memoRepository.findByIds(ids, { tags });

  return memos;
}
```

## Technical Considerations

**Database Driver Selection:**
- MySQL: `mysql2` (recommended over `mysql` for better performance)
- PostgreSQL: `pg` with `@types/pg`
- SQLite: `better-sqlite3` (synchronous, faster for local dev)

**Connection Pooling:**
- MySQL/PostgreSQL: Pool size 10-20 connections (configurable via env)
- SQLite: Single connection (no pooling needed)

**Transaction Handling:**
- Use Drizzle transactions for multi-table operations (e.g., create memo + relations)
- LanceDB writes outside transactions (eventual consistency acceptable)
- Migration uses transactions for atomic data transfer

**Performance Considerations:**
- Batch fetch from Drizzle after LanceDB search (avoid N+1 queries)
- Index frequently queried fields (userId, createdAt, tags)
- Use prepared statements via Drizzle (automatic)
- Consider query result caching for hot paths (future optimization)

**Testing Strategy:**
- Unit tests: Use in-memory SQLite for fast repository tests
- Integration tests: Use Docker containers for MySQL/PostgreSQL
- Mock LanceDB in service tests (focus on Drizzle logic)
- E2E tests: Run against all three database types in CI

**Backward Compatibility:**
- LanceDB backup file allows manual rollback if needed
- Keep LanceDB code intact (only change what writes to it)
- Environment variables additive (no breaking changes to existing vars)

**Migration Safety:**
- Backup created before any writes to Drizzle
- Migration runs in transaction (rollback on error)
- Startup aborts if migration fails (prevents data inconsistency)
- Migration idempotent (safe to retry after fixing errors)

## Success Metrics

- All existing API endpoints return identical responses (contract preserved)
- Scalar query performance improved by >50% (measure with existing slow queries)
- All tests pass with new implementation (no regressions)
- Application successfully starts with MySQL, PostgreSQL, and SQLite
- Historical LanceDB data migrated without loss (verify record counts)
- No increase in vector search latency (LanceDB performance unchanged)
- Graceful shutdown completes within 5 seconds

## Open Questions

None - all critical decisions made based on clarifying questions.

## Implementation Notes

**Recommended Implementation Order:**
1. US-001, US-002, US-003 (Database foundation)
2. US-004 (Repository layer)
3. US-009 (Environment config)
4. US-005, US-006, US-007 (Service refactoring)
5. US-008 (Data migration)
6. US-010, US-012 (Health checks and shutdown)
7. US-011 (Testing)

**Dependencies:**
- `drizzle-orm` - ORM framework
- `drizzle-kit` - Migration generator
- `mysql2` - MySQL driver
- `pg` + `@types/pg` - PostgreSQL driver
- `better-sqlite3` - SQLite driver

**Environment Variable Example:**
```env
# Relational Database (new)
DATABASE_TYPE=mysql
DATABASE_URL=mysql://root:password@localhost:3306/aimo

# Vector Database (existing, unchanged)
LANCEDB_STORAGE_TYPE=local
LANCEDB_PATH=./lancedb_data
```
