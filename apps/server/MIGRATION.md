# Migration Guide: LanceDB to MySQL + LanceDB Hybrid Architecture

This guide documents the migration from LanceDB-only storage to a hybrid MySQL + LanceDB architecture.

## Overview

**Before**: All data (scalar and vectors) stored in LanceDB
**After**: Scalar data in MySQL, vector embeddings in LanceDB

### Why Migrate?

1. **Better Relational Data Management**: MySQL provides ACID transactions, foreign keys, and complex joins
2. **Performance**: Optimized indexes for scalar queries, separate vector search in LanceDB
3. **Scalability**: Independent scaling of relational and vector data
4. **Data Integrity**: Foreign key constraints prevent orphaned records
5. **Standard Tooling**: Use standard SQL tools, ORMs, and migration systems

## Architecture Changes

### Database Responsibilities

#### MySQL (via Drizzle ORM)
Stores all scalar/relational data:
- User accounts and authentication
- Memo content and metadata (excluding embeddings)
- Categories, tags, and relations
- Attachment metadata (excluding multimodal embeddings)
- AI conversation history
- Daily recommendations and push rules

#### LanceDB
Stores only vector embeddings:
- `memo_vectors`: Text embeddings for semantic search
- `attachment_vectors`: Multimodal embeddings for images/videos
- `embedding_cache`: Text embedding cache (unchanged)
- `multimodal_embedding_cache`: Multimodal embedding cache (unchanged)

### Data Flow

#### Before (LanceDB-only)
```
Client Request → Service → LanceDB (scalar + vector) → Response
```

#### After (Hybrid)
```
Client Request → Service → MySQL (scalar data)
                        ↓
                        → LanceDB (vectors) → Response
```

## Migration Process

### Phase 1: Setup (US-001 to US-004)

1. **Install Dependencies** (US-001)
   - Drizzle ORM and MySQL client
   - Configure database connection

2. **Define Schemas** (US-002)
   - Create Drizzle schemas for all tables
   - Add foreign keys and indexes

3. **Setup Connection** (US-003)
   - Connection pooling (max 10 connections)
   - Health checks and graceful shutdown

4. **Generate Migrations** (US-004)
   - Initial SQL migrations
   - Auto-run on server startup

### Phase 2: Service Migration (US-005 to US-015)

Each service was refactored to use Drizzle ORM:

| Service | Priority | Status | Notes |
|---------|----------|--------|-------|
| UserService | 5 | ✅ | Basic CRUD operations |
| CategoryService | 6 | ✅ | Foreign key to users |
| TagService | 7 | ✅ | Usage count tracking |
| MemoRelationService | 8 | ✅ | Composite unique index |
| AttachmentService | 11 | ✅ | Hybrid: MySQL + LanceDB vectors |
| MemoService | 12 | ✅ | Hybrid: MySQL + LanceDB vectors |
| SearchService | 13 | ✅ | Vector search + MySQL enrichment |
| AIConversationService | 14 | ✅ | Includes message handling |
| RecommendationService | 16 | ✅ | JSON array storage |
| PushRuleService | 17 | ✅ | JSON channel storage |

### Phase 3: Vector Separation (US-016, US-018, US-020)

1. **Create Vector-Only Tables** (US-016)
   - `memo_vectors`: `{ memoId, embedding }`
   - `attachment_vectors`: `{ attachmentId, multimodalEmbedding }`

2. **Transaction Support** (US-018)
   - Helper functions for multi-table operations
   - Automatic rollback on errors

3. **Update LanceDB Service** (US-020)
   - Remove scalar table initialization
   - Add vector CRUD methods
   - Update optimization to only vector tables

### Phase 4: Documentation and Optimization (US-017, US-021, US-023, US-024)

1. **Update DTOs** (US-017)
   - Add JSDoc comments
   - Verify completeness

2. **Documentation** (US-021) - **Current Phase**
   - Environment configuration
   - README files
   - Migration guide (this file)

3. **Graceful Shutdown** (US-023)
   - Close MySQL connections properly
   - Shutdown order: Scheduler → MySQL → LanceDB

4. **Performance Optimization** (US-024)
   - Add indexes on frequently queried fields
   - Verify with EXPLAIN queries

### Phase 5: Data Migration (US-019)

One-time script to migrate existing LanceDB data to MySQL:
- Read all records from LanceDB
- Insert scalar fields to MySQL
- Move embeddings to vector-only tables
- Verify data integrity

## Schema Mapping

### Users Table

| LanceDB Field | MySQL Field | Type | Notes |
|--------------|-------------|------|-------|
| uid | uid | VARCHAR(191) | Primary key |
| email | email | VARCHAR(255) | Unique, nullable |
| phone | phone | VARCHAR(50) | Unique, nullable |
| password | password | VARCHAR(255) | Hashed |
| nickname | nickname | VARCHAR(100) | - |
| avatar | avatar | VARCHAR(500) | Nullable |
| createdAt | created_at | TIMESTAMP(3) | Auto-generated |
| updatedAt | updated_at | TIMESTAMP(3) | Auto-updated |

### Memos Table

| LanceDB Field | MySQL Field | LanceDB Vector Table | Notes |
|--------------|-------------|---------------------|-------|
| memoId | memo_id | memo_vectors.memoId | Primary key |
| uid | uid | - | Foreign key → users.uid |
| content | content | - | TEXT |
| categoryId | category_id | - | Foreign key → categories.categoryId |
| attachments | attachments | - | JSON array |
| tagIds | tag_ids | - | JSON array |
| isPublic | is_public | - | Boolean |
| createdAt | created_at | - | TIMESTAMP(3) |
| updatedAt | updated_at | - | TIMESTAMP(3) |
| embedding | - | memo_vectors.embedding | Vector(1536) |

### Attachments Table

| LanceDB Field | MySQL Field | LanceDB Vector Table | Notes |
|--------------|-------------|---------------------|-------|
| attachmentId | attachment_id | attachment_vectors.attachmentId | Primary key |
| uid | uid | - | Foreign key → users.uid |
| filename | filename | - | VARCHAR(255) |
| mimeType | mime_type | - | VARCHAR(100) |
| size | size | - | BIGINT |
| url | url | - | VARCHAR(1000) |
| properties | properties | - | JSON |
| createdAt | created_at | - | TIMESTAMP(3) |
| multimodalEmbedding | - | attachment_vectors.multimodalEmbedding | Vector(1024) |

## Index Strategy

### Primary Indexes (Auto-created)

- Primary keys on all tables (uid, memoId, categoryId, etc.)
- Unique constraints (email, phone, composite keys)

### Performance Indexes

```sql
-- User-specific queries
CREATE INDEX memos_uid_idx ON memos(uid);
CREATE INDEX categories_uid_idx ON categories(uid);
CREATE INDEX tags_uid_idx ON tags(uid);
CREATE INDEX attachments_uid_idx ON attachments(uid);

-- Time-based sorting
CREATE INDEX memos_created_at_idx ON memos(created_at);
CREATE INDEX memos_updated_at_idx ON memos(updated_at);

-- Category filtering
CREATE INDEX memos_category_id_idx ON memos(category_id);

-- Relation queries
CREATE UNIQUE INDEX memo_relations_unique_idx ON memo_relations(source_memo_id, target_memo_id);

-- Conversation queries
CREATE INDEX ai_messages_conversation_id_idx ON ai_messages(conversation_id);

-- Cache lookups
CREATE UNIQUE INDEX daily_recommendations_uid_date_idx ON daily_recommendations(uid, date);
```

### Verify Index Usage

Use `EXPLAIN` to verify indexes are being used:

```sql
EXPLAIN SELECT * FROM memos WHERE uid = 'user123' ORDER BY created_at DESC LIMIT 20;
```

Look for:
- `type: ref` or `type: range` (good)
- `type: ALL` (bad - full table scan)
- `key: memos_uid_idx` (index is being used)

## Common Patterns

### Drizzle Query Patterns

```typescript
import { eq, and, desc, sql } from 'drizzle-orm';
import { getDatabase } from '@/db/connection.js';
import { memos } from '@/db/schema/index.js';

// Single record query
const db = getDatabase();
const result = await db
  .select()
  .from(memos)
  .where(eq(memos.memoId, memoId))
  .limit(1);
const memo = result[0];

// Multiple conditions
const results = await db
  .select()
  .from(memos)
  .where(and(
    eq(memos.uid, uid),
    eq(memos.categoryId, categoryId)
  ));

// Insert
await db.insert(memos).values(newMemo);

// Update
await db
  .update(memos)
  .set({ content: newContent, updatedAt: new Date() })
  .where(eq(memos.memoId, memoId));

// Delete
await db
  .delete(memos)
  .where(eq(memos.memoId, memoId));

// Pagination with sorting
const results = await db
  .select()
  .from(memos)
  .where(eq(memos.uid, uid))
  .orderBy(desc(memos.createdAt))
  .limit(20)
  .offset(0);

// Count
const [{ count }] = await db
  .select({ count: sql<number>`count(*)` })
  .from(memos)
  .where(eq(memos.uid, uid));
```

### Transaction Pattern

```typescript
import { withTransaction } from '@/db/transaction.js';

await withTransaction(async (tx) => {
  // Insert memo
  await tx.insert(memos).values(newMemo);

  // Insert relations
  await tx.insert(memoRelations).values(relations);

  // Automatically commits on success
  // Automatically rolls back on error
});
```

### Hybrid Query Pattern (MySQL + LanceDB)

```typescript
// 1. Vector search in LanceDB
const vectorResults = await lancedb
  .getTable('memo_vectors')
  .search(queryEmbedding)
  .limit(50)
  .execute();

// 2. Extract memo IDs
const memoIds = vectorResults.map(r => r.memoId);

// 3. Batch query MySQL for full records
const memos = await db
  .select()
  .from(memosTable)
  .where(inArray(memosTable.memoId, memoIds));

// 4. Enrich with similarity scores
const enriched = memos.map(memo => ({
  ...memo,
  relevanceScore: vectorResults.find(r => r.memoId === memo.memoId)?.score
}));
```

## Type Conversions

### Drizzle to DTO

Drizzle returns different types than DTOs expect:

```typescript
// Drizzle: Date objects
// DTO: number (milliseconds)
createdAt: memo.createdAt.getTime()

// Drizzle: string | null
// DTO: string | undefined
avatar: user.avatar ?? undefined

// Drizzle: JSON columns (already parsed)
// DTO: native arrays/objects
attachments: memo.attachments as string[]
```

## Troubleshooting

### Common Issues

#### 1. Type Errors: `Type 'null' is not assignable to type 'undefined'`

**Problem**: Drizzle nullable fields return `null`, but DTOs expect `undefined`

**Solution**: Use nullish coalescing operator
```typescript
avatar: user.avatar ?? undefined
```

#### 2. Migration Generation Fails

**Problem**: Drizzle can't find schema files

**Solution**: Build before generating migrations
```bash
pnpm build && pnpm migrate:generate
```

#### 3. Foreign Key Constraint Errors

**Problem**: Trying to insert record with invalid foreign key

**Solution**: Ensure referenced records exist first
```typescript
// Create user first
await db.insert(users).values(newUser);

// Then create memo with valid uid
await db.insert(memos).values({ ...newMemo, uid: newUser.uid });
```

#### 4. Connection Pool Exhausted

**Problem**: Too many concurrent queries

**Solution**: Increase connection limit or optimize queries
```env
MYSQL_CONNECTION_LIMIT=20
```

#### 5. Vector Search Returns No Results

**Problem**: Vectors not synced between MySQL and LanceDB

**Solution**: Ensure both are updated together
```typescript
// Always update both
await db.update(memos).set({ content }).where(eq(memos.memoId, memoId));
await lancedb.insertVector('memo_vectors', { memoId, embedding });
```

## Performance Considerations

### Query Optimization

1. **Use Indexes**: Ensure frequently queried fields have indexes
2. **Limit Results**: Always use `.limit()` for list queries
3. **Batch Queries**: Use `inArray()` instead of multiple single queries
4. **Avoid N+1**: Join or batch instead of querying in loops

### Connection Pooling

- Default: 10 connections
- Increase for high traffic: `MYSQL_CONNECTION_LIMIT=20`
- Monitor pool usage in logs

### Vector Search

- LanceDB handles vector search efficiently
- Keep vector tables small (only ID + embedding)
- Use appropriate similarity threshold

## Index Strategy

All tables have been optimized with proper indexes for common query patterns. This section documents the indexing strategy for optimal query performance.

### Primary Indexes

All tables use VARCHAR(191) primary keys to support utf8mb4 character set within MySQL's index length limits.

### Table-Specific Indexes

#### memos table
- **uid_idx** on `uid`: User-specific memo queries (most common query pattern)
- **category_id_idx** on `category_id`: Filter memos by category
- **created_at_idx** on `created_at`: Time-based sorting and filtering
- **Usage**: Supports queries like "get all memos for user X" and "get recent memos"

#### memo_relations table
- **uid_idx** on `uid`: User-specific relation queries
- **source_memo_id_idx** on `source_memo_id`: Find all relations from a memo (forward relations)
- **target_memo_id_idx** on `target_memo_id`: Find all backlinks to a memo (reverse lookup)
- **source_target_unique** (UNIQUE) on `(source_memo_id, target_memo_id)`: Prevent duplicate relations
- **Usage**: Supports bi-directional memo graph traversal

#### attachments table
- **uid_idx** on `uid`: User-specific attachment queries
- **Usage**: Supports "get all attachments for user X" with sorting by created_at

#### ai_messages table
- **conversation_id_idx** on `conversation_id`: Fetch all messages in a conversation
- **Usage**: Supports conversation history retrieval with ORDER BY created_at

#### daily_recommendations table
- **uid_idx** on `uid`: User-specific recommendation queries
- **uid_date_unique** (UNIQUE) on `(uid, date)`: Ensure one recommendation per user per day
- **Usage**: Supports cache lookups by user and date

#### categories, tags, ai_conversations, push_rules tables
- **uid_idx** on `uid`: User-specific queries for all user-owned entities
- **Usage**: Supports "get all X for user Y" queries

### Composite Index Benefits

The composite unique index on `memo_relations(source_memo_id, target_memo_id)` provides:
1. Uniqueness constraint (prevents duplicate relations)
2. Index on source_memo_id (left-most prefix)
3. Index on (source_memo_id, target_memo_id) combination

This means queries filtering by source_memo_id OR both fields will use this index efficiently.

### Index Verification

Run the index verification script to confirm indexes are being used:

```bash
pnpm verify:indexes
```

This script uses `EXPLAIN` to analyze critical queries and verify index usage. Look for:
- **key**: The index being used (should not be NULL)
- **type**: Should be "ref", "eq_ref", or "range" (not "ALL" which means full table scan)
- **rows**: Lower is better (estimated rows scanned)

### Index Maintenance

MySQL automatically maintains indexes. No manual maintenance required for:
- Index updates on INSERT/UPDATE/DELETE
- Query optimizer statistics
- Index cardinality estimation

### Performance Monitoring

Monitor query performance with:

```sql
-- Show slow queries (requires slow query log enabled)
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;

-- Show index usage statistics
SELECT * FROM sys.schema_index_statistics
WHERE table_schema = 'aimo'
ORDER BY rows_selected DESC;

-- Show unused indexes
SELECT * FROM sys.schema_unused_indexes
WHERE object_schema = 'aimo';
```

### When to Add More Indexes

Consider adding indexes if you see:
1. Slow queries in production logs
2. EXPLAIN shows "type: ALL" (full table scan)
3. High "rows" count in EXPLAIN output
4. New query patterns not covered by existing indexes

**Note**: Every index has overhead on INSERT/UPDATE/DELETE operations. Only add indexes that significantly improve query performance.

## Data Migration Script

After completing the code migration, use the data migration script to transfer existing data from LanceDB to MySQL.

### Prerequisites

1. **Backup your data** - Create a backup of your LanceDB data directory
2. **Run schema migrations** - Ensure MySQL schema is up to date: `pnpm migrate`
3. **Verify connections** - Both MySQL and LanceDB must be accessible

### Usage

#### Dry Run (Preview Only)

Preview the migration without writing data:

```bash
pnpm migrate:data --dry-run
```

This will:
- Count records in each LanceDB table
- Check for existing records in MySQL
- Show what would be migrated
- Display summary without writing data

#### Full Migration

Migrate all tables from LanceDB to MySQL:

```bash
pnpm migrate:data
```

#### Migrate Specific Table

Migrate only one table (useful for testing or incremental migration):

```bash
pnpm migrate:data --table=users
pnpm migrate:data --table=memos
pnpm migrate:data --table=categories
```

Available tables: `users`, `categories`, `tags`, `memos`, `memo_relations`, `attachments`, `ai_conversations`, `ai_messages`, `daily_recommendations`, `push_rules`

#### Advanced Options

```bash
# Custom batch size (default: 100)
pnpm migrate:data --batch-size=500

# Custom retry attempts (default: 3)
pnpm migrate:data --retry=5

# Combine options
pnpm migrate:data --dry-run --table=memos --batch-size=1000
```

### Migration Process

The script migrates tables in dependency order:

1. **users** - Base table (no dependencies)
2. **categories** - Depends on users
3. **tags** - Depends on users
4. **memos** - Depends on users, categories
   - Scalar fields → MySQL
   - Embeddings → LanceDB `memo_vectors` table
5. **memo_relations** - Depends on memos
6. **attachments** - Depends on users
   - Scalar fields → MySQL
   - Multimodal embeddings → LanceDB `attachment_vectors` table
7. **ai_conversations** - Depends on users
8. **ai_messages** - Depends on ai_conversations
9. **daily_recommendations** - Depends on users
10. **push_rules** - Depends on users

### Safety Features

#### Idempotent
The script checks for existing records before inserting. Running it multiple times is safe - it will skip already migrated records.

#### Progress Logging
Shows progress every 100 records:
```
Progress: 1000/5000 (20%) - Failed: 0, Skipped: 50
```

#### Error Handling
- Failed records are logged with details
- Migration continues for other records
- Summary shows failed count at the end

#### Retry Logic
Automatically retries failed operations (default: 3 attempts) with exponential backoff.

### Migration Summary

After completion, you'll see a summary:

```
═══════════════════════════════════════════
           MIGRATION SUMMARY
═══════════════════════════════════════════

📊 users:
   Total:    150
   Migrated: 150
   Failed:   0
   Skipped:  0

📊 memos:
   Total:    5000
   Migrated: 4950
   Failed:   0
   Skipped:  50

...

═══════════════════════════════════════════
Total Migrated: 10450
Total Failed:   0
Total Skipped:  50
═══════════════════════════════════════════
```

### Troubleshooting

#### Foreign Key Errors
If you see foreign key constraint violations:
1. Ensure parent tables are migrated first (users before memos)
2. Check that referenced records exist in MySQL
3. Verify foreign key constraints in schema

#### Connection Timeouts
For large datasets:
1. Increase batch size: `--batch-size=500`
2. Run table-by-table: `--table=users`
3. Check MySQL connection limit: `MYSQL_CONNECTION_LIMIT=20`

#### Duplicate Key Errors
The script skips existing records. If you see duplicate errors:
1. Check primary key values in both databases
2. Ensure UUIDs are unique
3. Review migration logs for data inconsistencies

### Post-Migration Verification

After migration:

1. **Check Record Counts**
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM memos;
   -- Compare with LanceDB counts
   ```

2. **Verify Foreign Keys**
   ```sql
   -- Should return 0 (no orphaned records)
   SELECT COUNT(*) FROM memos WHERE uid NOT IN (SELECT uid FROM users);
   ```

3. **Test Application**
   - Start the server: `pnpm dev`
   - Test CRUD operations
   - Verify vector search works
   - Check AI conversation features

4. **Monitor Performance**
   - Run index verification: `pnpm verify:indexes`
   - Check query performance
   - Monitor connection pool usage

## Rollback Strategy

If migration causes issues:

1. **Backup Data**: Always backup before migration
2. **Keep LanceDB**: Don't delete old LanceDB data until verified
3. **Dual Write**: Write to both systems during transition
4. **Gradual Cutover**: Migrate services one at a time

## Next Steps

After completing this migration:

1. **Monitor Performance**: Track query times and connection pool usage
2. **Optimize Indexes**: Add indexes based on slow query logs
3. **Verify Data Integrity**: Run post-migration checks
4. **Cleanup**: Remove old LanceDB scalar tables after verification (optional)

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [MySQL 8.0 Reference Manual](https://dev.mysql.com/doc/refman/8.0/en/)
- [LanceDB Documentation](https://lancedb.github.io/lancedb/)
- [Project CLAUDE.md](../../CLAUDE.md) - Development guidelines
