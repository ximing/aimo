# PRD: Remove Database Foreign Keys and Implement Application-Layer Referential Integrity

## Introduction

This PRD outlines the migration strategy to remove all database-level foreign key constraints from the AIMO system and implement application-layer referential integrity management. The goal is to improve database maintainability and flexibility while ensuring data consistency through application logic, soft delete strategies, and automated integrity checks.

This migration will be performed during a planned maintenance window with minimal downtime, targeting production databases with zero data loss tolerance.

## Goals

- Remove all database foreign key constraints from 9 tables (memos, memo_relations, attachments, ai_conversations, ai_messages, categories, tags, daily_recommendations, push_rules)
- Implement soft delete pattern for all user-related data to prevent data loss
- Implement application-layer referential integrity through proper cascade and cleanup logic
- Ensure zero data corruption during migration with rollback-capable deployment
- Maintain existing user-facing behavior (cascade deletes, cleanup for category/tag removal)
- Validate data integrity before and after migration

## User Stories

### US-001: Add soft delete columns to all tables
**Description:** As a developer, I need to add soft delete columns to all tables so we can implement soft delete patterns instead of hard deletes.

**Acceptance Criteria:**
- [ ] Add `deleted_at` bigint column (NOT NULL, default 0) to database tables: users, memos, memo_relations, attachments, ai_conversations, ai_messages, categories, tags, daily_recommendations, push_rules
- [ ] `deleted_at` stores Unix timestamp in milliseconds (0 = not deleted, >0 = deletion timestamp)
- [ ] Update Drizzle schema definitions to use `deletedAt: bigint('deleted_at')` (database column name: deleted_at, JS property name: deletedAt)
- [ ] Generate and test migration script locally
- [ ] Migration includes rollback script to remove columns
- [ ] Typecheck passes after schema update
- [ ] Verify Drizzle correctly maps `deleted_at` ↔ `deletedAt`

### US-002: Update query patterns to filter soft-deleted records
**Description:** As a developer, I need to update all existing queries to filter soft-deleted records so the application only works with active data.

**Acceptance Criteria:**
- [ ] Audit all queries in services to add `WHERE deletedAt = 0` filter
- [ ] Update user queries (UserService)
- [ ] Update memo queries (MemoService)
- [ ] Update category queries (CategoryService)
- [ ] Update tag queries (TagService)
- [ ] Update attachment queries (AttachmentService)
- [ ] Update AI conversation queries (AIConversationService, AIMessageService)
- [ ] Update daily recommendation queries (DailyRecommendationService)
- [ ] Update push rule queries (PushRuleService)
- [ ] Typecheck passes
- [ ] Test queries return only non-deleted records

### US-003: Implement soft delete for users
**Description:** As a system, I need to soft delete users instead of hard deleting them so the account is disabled but all user data is preserved.

**Acceptance Criteria:**
- [ ] Update `UserService.deleteUser()` to set `deletedAt = Date.now()` instead of DELETE
- [ ] Do NOT cascade delete to user-owned records (memos, attachments, etc. remain accessible)
- [ ] Update authentication middleware to reject login for soft-deleted users (deletedAt > 0)
- [ ] Return appropriate error message: "Account has been deleted" or similar
- [ ] Update user profile queries to filter `WHERE deletedAt = 0` (for user lists, admin panels, etc.)
- [ ] Typecheck passes
- [ ] Add unit tests for user soft delete and authentication blocking

### US-004: Implement soft delete for memos
**Description:** As a system, I need to soft delete memos and cascade to related records so data relationships are preserved.

**Acceptance Criteria:**
- [ ] Update `MemoService.deleteMemo()` to set `deletedAt = Date.now()`
- [ ] Cascade soft delete to memo_relations where `sourceMemoId` or `targetMemoId` matches
- [ ] Do NOT delete attachments (they may be referenced by other memos)
- [ ] Use transaction for cascade operations
- [ ] Update memo queries to filter `WHERE deletedAt = 0`
- [ ] Update search queries to exclude soft-deleted memos (deletedAt = 0)
- [ ] Typecheck passes
- [ ] Add unit tests for memo soft delete

### US-005: Implement soft delete for categories with memo cleanup
**Description:** As a system, I need to soft delete categories and set related memos' categoryId to NULL so memos become uncategorized.

**Acceptance Criteria:**
- [ ] Update `CategoryService.deleteCategory()` to set `deletedAt = Date.now()`
- [ ] Scan all memos where `categoryId` matches the deleted category (only non-deleted memos where deletedAt = 0)
- [ ] Set `categoryId = NULL` for all matching memos
- [ ] Use transaction to ensure atomicity (soft delete category + update memos)
- [ ] Update category queries to filter `WHERE deletedAt = 0`
- [ ] Typecheck passes
- [ ] Add unit tests for category soft delete with memo cleanup

### US-006: Implement soft delete for AI conversations
**Description:** As a system, I need to soft delete AI conversations and cascade to messages.

**Acceptance Criteria:**
- [ ] Update `AIConversationService.deleteConversation()` to set `deletedAt = Date.now()`
- [ ] Cascade soft delete to all ai_messages with matching conversationId
- [ ] Use transaction for cascade operations
- [ ] Update conversation queries to filter `WHERE deletedAt = 0`
- [ ] Typecheck passes
- [ ] Add unit tests for conversation soft delete

### US-007: Implement soft delete for tags with memo cleanup
**Description:** As a system, I need to soft delete tags and remove the tagId from all memos' tagIds arrays.

**Acceptance Criteria:**
- [ ] Update `TagService.deleteTag()` to set `deletedAt = Date.now()`
- [ ] Scan all memos where `tagIds` JSON array contains the deleted tagId (only non-deleted memos where deletedAt = 0)
- [ ] Remove the tagId from each memo's `tagIds` array (use JSON array manipulation or read-modify-write)
- [ ] Use transaction to ensure atomicity (soft delete tag + update memos)
- [ ] Update tag queries to filter `WHERE deletedAt = 0`
- [ ] Typecheck passes
- [ ] Add unit tests for tag soft delete with memo cleanup

### US-008: Implement soft delete for remaining entities
**Description:** As a system, I need to implement soft delete for attachments, daily_recommendations, and push_rules.

**Acceptance Criteria:**
- [ ] Update `AttachmentService.deleteAttachment()` to soft delete (no cascades needed)
- [ ] Update `DailyRecommendationService` to soft delete (no cascades needed)
- [ ] Update `PushRuleService` to soft delete (no cascades needed)
- [ ] Update all queries for these entities to filter `WHERE deletedAt = 0`
- [ ] Typecheck passes
- [ ] Add unit tests for each entity's soft delete

### US-009: Generate migration to drop foreign keys
**Description:** As a developer, I need a migration script to safely drop all foreign key constraints from the database.

**Acceptance Criteria:**
- [ ] Generate migration script using Drizzle ORM
- [ ] Remove `.references()` from all schema definitions: memos.uid, memos.categoryId, memo_relations.uid, memo_relations.sourceMemoId, memo_relations.targetMemoId, attachments.uid, ai_conversations.uid, ai_messages.conversationId, categories.uid, tags.uid, daily_recommendations.uid, push_rules.uid
- [ ] Migration includes rollback script to re-add foreign keys
- [ ] Test migration on local database copy
- [ ] Verify indexes are preserved after foreign key removal
- [ ] Typecheck passes after schema update

### US-010: Create pre-deployment validation script
**Description:** As a DevOps engineer, I need a validation script to run before production deployment to ensure data integrity.

**Acceptance Criteria:**
- [ ] Create `scripts/validate-data-integrity.ts`
- [ ] Check for memos with non-existent users
- [ ] Check for memo_relations with non-existent or soft-deleted memos
- [ ] Check for attachments with non-existent users
- [ ] Check for ai_messages with non-existent or soft-deleted conversations
- [ ] Check for categories/tags/push_rules/daily_recommendations with non-existent users
- [ ] Check for memos with invalid categoryId references
- [ ] Check for memos with invalid tagIds in JSON array
- [ ] Report counts and sample IDs (first 5) for any issues found
- [ ] Exit with error code if critical issues detected (> 0 orphaned records)
- [ ] Log validation results to timestamped file (e.g., validation-2026-03-05-10-30-00.json)
- [ ] Support both pre-deployment and post-deployment modes
- [ ] Typecheck passes
- [ ] Test script on staging database with known issues

### US-011: Create deployment runbook
**Description:** As a DevOps engineer, I need a detailed deployment runbook so the migration can be executed safely during maintenance window.

**Acceptance Criteria:**
- [ ] Create `docs/deployment-runbook-remove-fk.md`
- [ ] Include pre-deployment checklist (backup, validation, maintenance mode)
- [ ] Include step-by-step deployment commands with expected output
- [ ] Include rollback procedures for each step
- [ ] Include post-deployment verification steps
- [ ] Include monitoring and alerting setup
- [ ] Document estimated downtime (target: < 30 minutes)
- [ ] Include contact information for escalation

### US-012: Execute production migration
**Description:** As a DevOps engineer, I need to execute the migration during maintenance window following the runbook.

**Acceptance Criteria:**
- [ ] Announce maintenance window to users (24h advance notice)
- [ ] Create full database backup before migration
- [ ] Enable maintenance mode (block new writes)
- [ ] Run pre-deployment validation script
- [ ] Deploy code with soft delete logic (application still works with foreign keys present)
- [ ] Verify application functionality with foreign keys still present
- [ ] Run migration to drop foreign keys
- [ ] Verify application functionality after foreign key removal
- [ ] Run post-deployment validation (check for orphaned data)
- [ ] Disable maintenance mode
- [ ] Monitor error logs for 24 hours
- [ ] Document actual downtime and any issues encountered

## Functional Requirements

### Data Model Changes
- **FR-1**: All tables must have a `deleted_at` bigint column (NOT NULL, default 0) storing Unix timestamp in milliseconds
- **FR-2**: Drizzle schema must map `deleted_at` (database) to `deletedAt` (JavaScript) using `bigint('deleted_at')` syntax
- **FR-3**: All foreign key constraints must be removed from database schema
- **FR-4**: Indexes on foreign key columns must be preserved for query performance
- **FR-5**: Add index on `deleted_at` column for all tables to optimize soft delete queries

### Soft Delete Behavior
- **FR-6**: Soft deleted records must have `deletedAt` (JavaScript) set to current Unix timestamp in milliseconds (Date.now())
- **FR-7**: All SELECT queries for user-facing data must filter `WHERE deletedAt = 0` by default to exclude deleted records
- **FR-8**: User soft delete must NOT cascade to owned records - all user data (memos, attachments, etc.) remains intact
- **FR-9**: Authentication must reject soft-deleted users (deletedAt > 0) at login with appropriate error message
- **FR-10**: Memo soft delete must cascade to: memo_relations (both source and target)
- **FR-11**: Category soft delete must set `categoryId = NULL` for all related memos (only non-deleted memos where deletedAt = 0)
- **FR-12**: Tag soft delete must remove the tagId from `tagIds` JSON array in all related memos (only non-deleted memos where deletedAt = 0)
- **FR-13**: AI conversation soft delete must cascade to: ai_messages
- **FR-14**: Soft delete operations with cascades or memo cleanup must use transactions to ensure atomicity

### Referential Integrity Management
- **FR-15**: Delete operations must properly cascade or cleanup dependent records in the same transaction
- **FR-16**: Category delete must clear categoryId from all related memos
- **FR-17**: Tag delete must remove tagId from all related memos' tagIds arrays
- **FR-18**: Memo delete must cascade to memo_relations (both source and target)
- **FR-19**: AI conversation delete must cascade to ai_messages
- **FR-20**: All cascade/cleanup operations must complete atomically within a transaction

### Data Validation
- **FR-21**: Pre-deployment validation script must check for existing referential integrity issues
- **FR-22**: Post-deployment validation must verify no orphaned records were created during migration
- **FR-23**: Validation scripts must check all foreign key relationships (user → memos, memo → relations, etc.)
- **FR-24**: Validation failures must be logged with record counts and sample IDs for investigation

### Migration Safety
- **FR-25**: All schema changes must be reversible via rollback migrations
- **FR-26**: Migration must preserve all existing data (zero data loss)
- **FR-27**: Migration must preserve all indexes for query performance
- **FR-28**: Deployment must be staged (code first, then schema) to allow fast rollback
- **FR-29**: Full database backup must be created before migration
- **FR-30**: Migration must be tested on staging environment with production-like data

## Non-Goals (Out of Scope)

- **Hard delete functionality** - All deletes will be soft deletes. No UI for permanently removing records in this phase
- **Soft delete recovery UI** - No user-facing "restore deleted items" feature in this phase
- **Orphaned data detection** - No automated daily job to scan for orphaned data (deferred to future phase)
- **Real-time integrity monitoring** - No continuous monitoring of referential integrity (validation only during migration)
- **Cascade deletion of user data** - User deletion does NOT cascade to owned records (memos, attachments, etc.)
- **User data anonymization** - Soft-deleted user data remains associated with the original user ID
- **GDPR compliance features** - Hard delete and data export features are out of scope for this phase
- **Performance optimization** - Existing query performance should be maintained, but optimization is not a goal
- **Multi-tenancy isolation changes** - Soft delete does not change tenant isolation logic
- **Audit log integration** - Soft delete events are not automatically logged to audit system

## Technical Considerations

### Database Schema Changes

**SQL (snake_case):**
```sql
-- Add soft delete column (database uses snake_case: deleted_at)
ALTER TABLE users ADD COLUMN deleted_at BIGINT NOT NULL DEFAULT 0;
ALTER TABLE memos ADD COLUMN deleted_at BIGINT NOT NULL DEFAULT 0;
ALTER TABLE memo_relations ADD COLUMN deleted_at BIGINT NOT NULL DEFAULT 0;
ALTER TABLE attachments ADD COLUMN deleted_at BIGINT NOT NULL DEFAULT 0;
ALTER TABLE ai_conversations ADD COLUMN deleted_at BIGINT NOT NULL DEFAULT 0;
ALTER TABLE ai_messages ADD COLUMN deleted_at BIGINT NOT NULL DEFAULT 0;
ALTER TABLE categories ADD COLUMN deleted_at BIGINT NOT NULL DEFAULT 0;
ALTER TABLE tags ADD COLUMN deleted_at BIGINT NOT NULL DEFAULT 0;
ALTER TABLE daily_recommendations ADD COLUMN deleted_at BIGINT NOT NULL DEFAULT 0;
ALTER TABLE push_rules ADD COLUMN deleted_at BIGINT NOT NULL DEFAULT 0;

-- Add indexes for soft delete queries
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_memos_deleted_at ON memos(deleted_at);
CREATE INDEX idx_memo_relations_deleted_at ON memo_relations(deleted_at);
CREATE INDEX idx_attachments_deleted_at ON attachments(deleted_at);
CREATE INDEX idx_ai_conversations_deleted_at ON ai_conversations(deleted_at);
CREATE INDEX idx_ai_messages_deleted_at ON ai_messages(deleted_at);
CREATE INDEX idx_categories_deleted_at ON categories(deleted_at);
CREATE INDEX idx_tags_deleted_at ON tags(deleted_at);
CREATE INDEX idx_daily_recommendations_deleted_at ON daily_recommendations(deleted_at);
CREATE INDEX idx_push_rules_deleted_at ON push_rules(deleted_at);

-- Example foreign key removal
ALTER TABLE memos DROP FOREIGN KEY memos_uid_users_uid_fk;
ALTER TABLE memos DROP FOREIGN KEY memos_category_id_categories_category_id_fk;
-- ... repeat for all foreign keys
```

**Drizzle Schema (camelCase in JS, maps to snake_case in DB):**
```typescript
// Example: apps/server/src/db/schema/users.ts
import { mysqlTable, varchar, bigint, timestamp } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  uid: varchar('uid', { length: 191 }).primaryKey().notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  // ... other columns
  deletedAt: bigint('deleted_at', { mode: 'number' }).notNull().default(0),
  createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
});

// TypeScript type inference
export type User = typeof users.$inferSelect;
// User.deletedAt will be number type in JavaScript
// But stored as deleted_at in MySQL
```

### Service Layer Pattern

**User Soft Delete (No Cascade):**
```typescript
async softDeleteUser(uid: string): Promise<void> {
  const db = getDatabase();
  const now = Date.now(); // Unix timestamp in milliseconds

  // Only soft delete the user record, do NOT cascade to owned data
  // Note: deletedAt in code maps to deleted_at in database
  await db.update(users)
    .set({ deletedAt: now })
    .where(and(
      eq(users.uid, uid),
      eq(users.deletedAt, 0)
    ));
}
```

**Authentication Middleware:**
```typescript
async authenticate(token: string): Promise<User> {
  const user = await verifyToken(token);

  // Reject soft-deleted users
  if (user.deletedAt > 0) {
    throw new UnauthorizedError('Account has been deleted');
  }

  return user;
}
```

**Category Soft Delete with Memo Cleanup:**
```typescript
async softDeleteCategory(categoryId: string, uid: string): Promise<void> {
  const db = getDatabase();
  const now = Date.now(); // Unix timestamp in milliseconds

  await db.transaction(async (tx) => {
    // 1. Soft delete category
    // deletedAt (JS) maps to deleted_at (DB)
    await tx.update(categories)
      .set({ deletedAt: now })
      .where(and(
        eq(categories.categoryId, categoryId),
        eq(categories.uid, uid),
        eq(categories.deletedAt, 0)
      ));

    // 2. Clear categoryId from all related memos
    await tx.update(memos)
      .set({ categoryId: null })
      .where(and(
        eq(memos.categoryId, categoryId),
        eq(memos.deletedAt, 0)  // Only update non-deleted memos
      ));
  });
}
```

**Tag Soft Delete with Memo Cleanup:**
```typescript
async softDeleteTag(tagId: string, uid: string): Promise<void> {
  const db = getDatabase();
  const now = Date.now(); // Unix timestamp in milliseconds

  await db.transaction(async (tx) => {
    // 1. Soft delete tag
    // deletedAt (JS) maps to deleted_at (DB)
    await tx.update(tags)
      .set({ deletedAt: now })
      .where(and(
        eq(tags.tagId, tagId),
        eq(tags.uid, uid),
        eq(tags.deletedAt, 0)
      ));

    // 2. Find all memos with this tagId in their tagIds array
    // Note: tag_ids is the DB column, tagIds is the JS property
    const memosWithTag = await tx.select()
      .from(memos)
      .where(and(
        eq(memos.deletedAt, 0),
        sql`JSON_CONTAINS(tag_ids, ${JSON.stringify(tagId)})`
      ));

    // 3. Remove tagId from each memo's tagIds array
    for (const memo of memosWithTag) {
      const updatedTagIds = (memo.tagIds || []).filter(id => id !== tagId);
      await tx.update(memos)
        .set({ tagIds: updatedTagIds })
        .where(eq(memos.memoId, memo.memoId));
    }
  });
}
```

**Entity Soft Delete with Cascade (Memos, Conversations, etc.):**
```typescript
async softDelete(id: string, uid: string): Promise<void> {
  const db = getDatabase();
  const now = Date.now(); // Unix timestamp in milliseconds

  await db.transaction(async (tx) => {
    // 1. Soft delete main record
    // deletedAt (JS) maps to deleted_at (DB)
    await tx.update(table)
      .set({ deletedAt: now })
      .where(and(
        eq(table.id, id),
        eq(table.uid, uid),
        eq(table.deletedAt, 0)
      ));

    // 2. Cascade to dependent records (if applicable)
    await tx.update(dependentTable)
      .set({ deletedAt: now })
      .where(and(
        eq(dependentTable.parentId, id),
        eq(dependentTable.deletedAt, 0)
      ));
  });
}
```

### Query Pattern
All queries must filter soft-deleted records:
```typescript
// Before
const memos = await db.select().from(memos).where(eq(memos.uid, uid));

// After
// deletedAt in code maps to deleted_at in database
const memos = await db.select()
  .from(memos)
  .where(and(
    eq(memos.uid, uid),
    eq(memos.deletedAt, 0)  // Filter soft-deleted records
  ));
```

### Pre/Post-Deployment Validation
```typescript
// Validation script to check referential integrity before and after migration
// Note: Use deletedAt in Drizzle queries (maps to deleted_at in DB)
async function validateDataIntegrity(): Promise<ValidationReport> {
  const issues: ValidationIssue[] = [];

  // Check for memos with missing users
  const memosWithMissingUsers = await db.select()
    .from(memos)
    .leftJoin(users, eq(memos.uid, users.uid))
    .where(and(
      eq(memos.deletedAt, 0),
      isNull(users.uid)
    ));
  if (memosWithMissingUsers.length > 0) {
    issues.push({
      type: 'orphaned_memos',
      count: memosWithMissingUsers.length,
      samples: memosWithMissingUsers.slice(0, 5).map(m => m.memoId)
    });
  }

  // Check for memo_relations with missing memos
  const relationsWithMissingMemos = await db.select()
    .from(memoRelations)
    .leftJoin(memos, eq(memoRelations.sourceMemoId, memos.memoId))
    .where(and(
      eq(memoRelations.deletedAt, 0),
      or(
        isNull(memos.memoId),
        gt(memos.deletedAt, 0)
      )
    ));
  if (relationsWithMissingMemos.length > 0) {
    issues.push({
      type: 'orphaned_relations',
      count: relationsWithMissingMemos.length,
      samples: relationsWithMissingMemos.slice(0, 5).map(r => r.relationId)
    });
  }

  // Check for memos with invalid categoryId
  const memosWithInvalidCategory = await db.select()
    .from(memos)
    .leftJoin(categories, eq(memos.categoryId, categories.categoryId))
    .where(and(
      eq(memos.deletedAt, 0),
      isNotNull(memos.categoryId),
      or(
        isNull(categories.categoryId),
        gt(categories.deletedAt, 0)
      )
    ));
  if (memosWithInvalidCategory.length > 0) {
    issues.push({
      type: 'invalid_category_refs',
      count: memosWithInvalidCategory.length,
      samples: memosWithInvalidCategory.slice(0, 5).map(m => m.memoId)
    });
  }

  // Check for ai_messages with missing conversations
  const messagesWithMissingConversations = await db.select()
    .from(aiMessages)
    .leftJoin(aiConversations, eq(aiMessages.conversationId, aiConversations.conversationId))
    .where(and(
      eq(aiMessages.deletedAt, 0),
      or(
        isNull(aiConversations.conversationId),
        gt(aiConversations.deletedAt, 0)
      )
    ));
  if (messagesWithMissingConversations.length > 0) {
    issues.push({
      type: 'orphaned_messages',
      count: messagesWithMissingConversations.length,
      samples: messagesWithMissingConversations.slice(0, 5).map(m => m.messageId)
    });
  }

  return {
    timestamp: new Date(),
    totalIssues: issues.length,
    issues
  };
}
```

### Rollback Strategy
- **Code rollback**: Revert to previous version via git/CI/CD (keeps soft delete columns, re-adds foreign keys via migration)
- **Schema rollback**: Rollback migration re-adds foreign key constraints (safe because data is unchanged)
- **Data rollback**: Database backup restoration (last resort, requires maintenance window)

### Performance Considerations
- **Index preservation**: All existing indexes on foreign key columns must be retained
- **Index addition**: Add index on `deleted_at` column (database) for all tables to optimize `WHERE deletedAt = 0` queries
- **Query overhead**: `deletedAt = 0` filter adds minimal overhead with proper indexing (equality check on indexed column)
- **Storage efficiency**: bigint (8 bytes) is more space-efficient than timestamp(3) (8 bytes) with equivalent precision
- **Column naming**: Drizzle automatically maps camelCase (deletedAt) to snake_case (deleted_at) - no performance impact
- **Transaction size**: Cascade deletes and memo cleanup may affect many rows, use batch processing for large datasets
- **Tag cleanup performance**: Removing tagId from memo tagIds arrays requires read-modify-write; consider batch processing if a tag has many memos
- **JSON array operations**: Use MySQL JSON functions for efficient tagIds manipulation where possible
- **Validation script performance**: Pre/post-deployment validation should use indexed columns and LIMIT results for large tables

### Testing Strategy
- **Unit tests**: Each service's soft delete, cascade, and cleanup logic
- **Integration tests**: End-to-end delete flows with transaction verification
- **Tag cleanup tests**: Verify tagId removal from memos with various tagIds array states (empty, single tag, multiple tags)
- **Category cleanup tests**: Verify categoryId is set to NULL for all related memos
- **Load tests**: Verify cascade delete and memo cleanup performance with large datasets (e.g., tag with 1000+ memos)
- **Migration tests**: Test migration and rollback on copy of production data

## Success Metrics

- **Zero data loss**: All existing records preserved after migration
- **Zero orphaned data**: Pre-deployment validation shows no existing orphans; post-deployment validation shows no new orphans created
- **Downtime < 30 minutes**: Maintenance window duration
- **Zero rollbacks**: Successful first-time deployment
- **Query performance maintained**: No regression in p95 query latency
- **Validation script completion < 5 minutes**: Pre/post-deployment validation runtime

## Deployment Plan

### Phase 1: Pre-Migration (Week 1)
1. Add `deletedAt` columns to all tables (backward compatible)
2. Deploy application code with soft delete logic (foreign keys still enforced)
3. Run for 1 week to validate soft delete behavior in production
4. Monitor for any issues with cascade logic

### Phase 2: Migration (Maintenance Window)
1. Announce maintenance window (24h notice)
2. Create full database backup
3. Enable maintenance mode (read-only)
4. Run pre-deployment validation script
5. Run migration to drop foreign keys (~5 minutes)
6. Verify migration success
7. Disable maintenance mode
8. Monitor for 24 hours

### Phase 3: Post-Migration (Week 2)
1. Run post-deployment validation daily for first week
2. Monitor error logs for referential integrity issues
3. Monitor application metrics for anomalies
4. Document lessons learned
5. Plan for orphaned data detection feature in future phase

## Open Questions

1. **Backup retention**: How long should we retain database backups after migration? (Recommend: 30 days)
2. **Orphan detection timeline**: When should we implement automated orphan detection job? (Recommend: Next phase after migration stabilizes)
3. **Hard delete timeline**: When should we implement hard delete functionality for compliance (GDPR)? (Recommend: 3 months after soft delete stabilizes)
4. **Validation frequency**: How often should we run validation scripts post-migration? (Recommend: Daily for first week, then weekly)
5. **Soft delete UI**: Do we need admin UI to view/restore soft-deleted records? (Recommend: Not in Phase 1, evaluate after 1 month)
6. **User data access**: Should soft-deleted users be able to view (read-only) their data after account deletion? (Recommend: No access, data preserved for legal/audit only)
7. **User data retention**: How long should we retain data for soft-deleted users before hard delete? (Recommend: Define retention policy based on legal requirements)

## Risk Assessment

### High Risks
- **Data corruption during migration**: Mitigated by full backup + rollback plan + pre/post validation
- **Orphaned data after migration**: Mitigated by pre/post-deployment validation + careful cascade/cleanup implementation
- **Performance degradation**: Mitigated by preserving indexes + load testing

### Medium Risks
- **Cascade logic bugs**: Mitigated by unit tests + 1-week pre-migration validation
- **Query bugs (missing deletedAt filter)**: Mitigated by code review + integration tests
- **Extended maintenance window**: Mitigated by practice runs on staging
- **Soft-deleted user data accumulation**: Data for deleted users remains indefinitely without hard delete policy
- **Tag cleanup performance**: Deleting a tag with many memos may cause long transaction; mitigated by batch processing
- **JSON array manipulation bugs**: tagIds cleanup requires careful testing; mitigated by comprehensive unit tests

### Low Risks
- **Rollback failure**: Mitigated by multiple rollback options (code, schema, data)
- **User confusion during maintenance**: Mitigated by clear communication + status page

## Appendix: Affected Tables and Foreign Keys

### Tables Requiring Soft Delete (deleted_at column)
All tables will have `deleted_at` bigint column in database, mapped to `deletedAt` in JavaScript/TypeScript:

1. `users` (root entity, no parent)
2. `memos` (parent: users, categories)
3. `memo_relations` (parent: users, memos)
4. `attachments` (parent: users)
5. `ai_conversations` (parent: users)
6. `ai_messages` (parent: ai_conversations)
7. `categories` (parent: users)
8. `tags` (parent: users)
9. `daily_recommendations` (parent: users)
10. `push_rules` (parent: users)

### Naming Convention
- **Database (MySQL)**: `deleted_at` (snake_case)
- **Drizzle Schema**: `deletedAt: bigint('deleted_at', { mode: 'number' })`
- **TypeScript/JavaScript**: `deletedAt` (camelCase)
- **Drizzle automatically maps**: `deletedAt` ↔ `deleted_at`

### Foreign Keys to Remove
1. `memos.uid` → `users.uid` (CASCADE)
2. `memos.categoryId` → `categories.categoryId` (SET NULL)
3. `memo_relations.uid` → `users.uid` (CASCADE)
4. `memo_relations.sourceMemoId` → `memos.memoId` (CASCADE)
5. `memo_relations.targetMemoId` → `memos.memoId` (CASCADE)
6. `attachments.uid` → `users.uid` (CASCADE)
7. `ai_conversations.uid` → `users.uid` (CASCADE)
8. `ai_messages.conversationId` → `ai_conversations.conversationId` (CASCADE)
9. `categories.uid` → `users.uid` (CASCADE)
10. `tags.uid` → `users.uid` (CASCADE)
11. `daily_recommendations.uid` → `users.uid` (CASCADE)
12. `push_rules.uid` → `users.uid` (CASCADE)

**Total**: 12 foreign key constraints to remove across 10 tables.
