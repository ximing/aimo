# Migration 0003 - Drop Foreign Keys Test Plan

## Overview

This migration removes all foreign key constraints from the database to implement application-layer referential integrity with soft delete patterns.

## Foreign Keys Being Removed

1. `categories_uid_users_uid_fk` - categories.uid → users.uid
2. `tags_uid_users_uid_fk` - tags.uid → users.uid
3. `memos_uid_users_uid_fk` - memos.uid → users.uid
4. `memos_category_id_categories_category_id_fk` - memos.category_id → categories.category_id
5. `memo_relations_uid_users_uid_fk` - memo_relations.uid → users.uid
6. `memo_relations_source_memo_id_memos_memo_id_fk` - memo_relations.source_memo_id → memos.memo_id
7. `memo_relations_target_memo_id_memos_memo_id_fk` - memo_relations.target_memo_id → memos.memo_id
8. `attachments_uid_users_uid_fk` - attachments.uid → users.uid
9. `ai_conversations_uid_users_uid_fk` - ai_conversations.uid → users.uid
10. `ai_messages_conversation_id_ai_conversations_conversation_id_fk` - ai_messages.conversation_id → ai_conversations.conversation_id
11. `daily_recommendations_uid_users_uid_fk` - daily_recommendations.uid → users.uid
12. `push_rules_uid_users_uid_fk` - push_rules.uid → users.uid

## Pre-Migration Verification

### 1. Check Existing Foreign Keys

```sql
-- List all foreign keys in the database
SELECT
  TABLE_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM
  information_schema.KEY_COLUMN_USAGE
WHERE
  REFERENCED_TABLE_NAME IS NOT NULL
  AND TABLE_SCHEMA = 'aimo'
ORDER BY
  TABLE_NAME;
```

Expected: 12 foreign key constraints should be listed.

### 2. Check Existing Indexes

```sql
-- List all indexes (should be preserved after FK removal)
SELECT
  TABLE_NAME,
  INDEX_NAME,
  COLUMN_NAME,
  NON_UNIQUE
FROM
  information_schema.STATISTICS
WHERE
  TABLE_SCHEMA = 'aimo'
  AND TABLE_NAME IN (
    'users', 'categories', 'tags', 'memos', 'memo_relations',
    'attachments', 'ai_conversations', 'ai_messages',
    'daily_recommendations', 'push_rules'
  )
ORDER BY
  TABLE_NAME, INDEX_NAME;
```

Expected: All indexes should be present (uid_idx, deleted_at_idx, etc.).

### 3. Backup Database

```bash
# Create a backup before migration
mysqldump -u root -p aimo > aimo_backup_before_fk_removal_$(date +%Y%m%d_%H%M%S).sql
```

## Migration Execution

### Automatic (Recommended)

The migration will run automatically when the server starts:

```bash
cd apps/server
pnpm dev
```

### Manual

If you need to run it manually:

```bash
cd apps/server
pnpm migrate
```

## Post-Migration Verification

### 1. Verify Foreign Keys Are Removed

```sql
-- Should return 0 rows
SELECT
  TABLE_NAME,
  CONSTRAINT_NAME
FROM
  information_schema.KEY_COLUMN_USAGE
WHERE
  REFERENCED_TABLE_NAME IS NOT NULL
  AND TABLE_SCHEMA = 'aimo';
```

Expected: No foreign key constraints should exist.

### 2. Verify Indexes Are Preserved

Run the same index query from pre-migration verification. All indexes should still exist.

Expected index counts per table:
- users: 3 indexes (PRIMARY, email_idx, phone_idx, deleted_at_idx)
- categories: 3 indexes (PRIMARY, uid_idx, deleted_at_idx)
- tags: 3 indexes (PRIMARY, uid_idx, deleted_at_idx)
- memos: 5 indexes (PRIMARY, uid_idx, category_id_idx, created_at_idx, deleted_at_idx)
- memo_relations: 6 indexes (PRIMARY, uid_idx, source_memo_id_idx, target_memo_id_idx, deleted_at_idx, source_target_unique)
- attachments: 3 indexes (PRIMARY, uid_idx, deleted_at_idx)
- ai_conversations: 3 indexes (PRIMARY, uid_idx, deleted_at_idx)
- ai_messages: 3 indexes (PRIMARY, conversation_id_idx, deleted_at_idx)
- daily_recommendations: 4 indexes (PRIMARY, uid_idx, deleted_at_idx, uid_date_unique)
- push_rules: 3 indexes (PRIMARY, uid_idx, deleted_at_idx)

### 3. Test Application Functionality

After migration, test the following:

1. **User Operations**
   - Create user
   - Login
   - Update user
   - Soft delete user (should work without cascade)

2. **Memo Operations**
   - Create memo
   - Update memo
   - Delete memo (should soft delete memo + relations)
   - Verify deleted memo is filtered from queries

3. **Category Operations**
   - Create category
   - Delete category (should set memos.categoryId to NULL)
   - Verify category deletion doesn't fail due to missing FK

4. **Tag Operations**
   - Create tag
   - Delete tag (should remove tagId from memos.tagIds arrays)
   - Verify tag deletion doesn't fail due to missing FK

5. **Memo Relations**
   - Create relation
   - Delete source memo (should cascade to relations)
   - Verify relations are soft deleted

6. **AI Conversations**
   - Create conversation + messages
   - Delete conversation (should cascade to messages)
   - Verify messages are soft deleted

## Rollback Procedure

If you need to rollback and re-add foreign keys:

```bash
cd apps/server
mysql -u root -p aimo < drizzle/0003_eminent_peter_quill.rollback.sql
```

**WARNING**: Rollback will fail if there is orphaned data (records with invalid foreign key references). Clean up orphaned data first using the validation script (US-012).

## Success Criteria

- ✅ Migration completes without errors
- ✅ All 12 foreign keys are removed
- ✅ All indexes are preserved
- ✅ Application starts successfully
- ✅ All CRUD operations work correctly
- ✅ Soft delete patterns work as expected
- ✅ No database errors in application logs

## Notes

- This migration is part of the larger refactoring to implement application-layer referential integrity
- Foreign key constraints are replaced by soft delete patterns (deletedAt = 0 filtering)
- All service layers have been updated to filter soft-deleted records (US-001 through US-010)
- Cascade delete logic is now handled in application code (MemoService, CategoryService, TagService, etc.)
