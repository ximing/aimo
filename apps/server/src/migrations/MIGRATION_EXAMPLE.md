# Migration Example: Adding a New Field

This document demonstrates how to add a new migration for schema changes.

## Example: Add `tags` field to memos table

### Step 1: Create the Migration File

Create `apps/server/src/migrations/scripts/002-add-tags-field.ts`:

```typescript
/**
 * Migration v2: Add tags field to memos table
 * Adds support for tagging memos with user-defined tags
 */

import type { Connection } from '@lancedb/lancedb';
import type { Migration } from '../types.js';
import { memosSchema } from '../../models/db/schema.js';

// First, update the schema in schema.ts to include the tags field:
// new Field('tags', new List(new Field('item', new Utf8(), true)), true)

export const memoTagsMigration: Migration = {
  version: 2,
  tableName: 'memos',
  description: 'Add tags field to memos table for tagging support',
  
  up: async (connection: Connection) => {
    try {
      console.log('Starting migration: Add tags field to memos');
      
      // Note: LanceDB doesn't support ALTER TABLE
      // Solution: Create new table, copy data, replace old table
      
      const db = connection;
      const tableNames = await db.tableNames();
      
      // Check if migration already applied (for idempotency)
      const memosTempExists = tableNames.includes('memos_v2_temp');
      if (memosTempExists) {
        console.log('Migration appears to have been partially applied. Cleaning up...');
        try {
          const tempTable = await db.openTable('memos_v2_temp');
          // Cleanup if needed
        } catch (e) {
          // Ignore
        }
      }
      
      if (!tableNames.includes('memos')) {
        throw new Error('Source table "memos" not found');
      }
      
      // Step 1: Read all existing data
      console.log('Reading existing memos data...');
      const oldTable = await db.openTable('memos');
      const allMemos = await oldTable.query().toArray();
      
      console.log(`Found ${allMemos.length} existing memos`);
      
      // Step 2: Create new table with updated schema (imported from schema.ts)
      console.log('Creating new memos table with updated schema...');
      
      // Import the updated schema
      const { memosSchema: updatedMemosSchema } = await import('../../models/db/schema.js');
      
      // Create temporary table with new schema
      const tempTableName = 'memos_v2_temp';
      await db.createEmptyTable(tempTableName, updatedMemosSchema);
      
      // Step 3: Copy data from old table to new table
      console.log('Migrating data to new schema...');
      const newTable = await db.openTable(tempTableName);
      
      const migratedMemos = allMemos.map((memo: any) => ({
        ...memo,
        tags: [], // New field - initialize as empty array
      }));
      
      await newTable.add(migratedMemos);
      
      // Step 4: Delete old table and rename new table
      console.log('Replacing old table with new table...');
      
      // In LanceDB, we need to delete the old table
      const oldTableRef = await db.openTable('memos');
      // LanceDB doesn't have direct drop, so we delete all records
      const allRecords = await oldTableRef.query().toArray();
      if (allRecords.length > 0) {
        // Delete by making table empty or by other means
        // This is a workaround - ideally LanceDB would support DROP TABLE
        for (const record of allRecords) {
          await oldTableRef.delete(`memoId = '${record.memoId}'`);
        }
      }
      
      // Copy all data from temp table back to original
      const allNewMemos = await newTable.query().toArray();
      await oldTableRef.add(allNewMemos);
      
      // Clean up temp table
      await db.openTable(tempTableName).then(async (table) => {
        // Delete all records from temp table
        const tempRecords = await table.query().toArray();
        for (const record of tempRecords) {
          await table.delete(`memoId = '${record.memoId}'`);
        }
      }).catch(() => {
        // Ignore cleanup errors
      });
      
      console.log('Migration completed: tags field added to memos');
      
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },
};
```

### Step 2: Update Schema

First, update `apps/server/src/models/db/schema.ts` to add the tags field:

```typescript
// In memosSchema definition
export const memosSchema = new Schema([
  new Field('memoId', new Utf8(), false),
  new Field('uid', new Utf8(), false),
  new Field('categoryId', new Utf8(), true),
  new Field('content', new Utf8(), false),
  new Field('attachments', new List(new Field('item', new Utf8(), true)), true),
  new Field('tags', new List(new Field('item', new Utf8(), true)), true), // NEW FIELD
  new Field(
    'embedding',
    new FixedSizeList(getEmbeddingDimensions(), new Field('item', new Float32(), true)),
    false
  ),
  new Field('createdAt', new Timestamp(TimeUnit.MILLISECOND), false),
  new Field('updatedAt', new Timestamp(TimeUnit.MILLISECOND), false),
]);

// Update MemoRecord interface
export interface MemoRecord {
  memoId: string;
  uid: string;
  categoryId?: string;
  content: string;
  attachments?: string[];
  tags?: string[];                // NEW FIELD
  embedding: number[];
  createdAt: number;
  updatedAt: number;
}
```

### Step 3: Export Migration

Update `apps/server/src/migrations/scripts/index.ts`:

```typescript
import {
  usersTableMigration,
  memosTableMigration,
  // ... other imports
  memoTagsMigration, // Add this
} from './002-add-tags-field.js';

export const ALL_MIGRATIONS: Migration[] = [
  // Version 1: Initial schema
  usersTableMigration,
  memosTableMigration,
  // ... other v1 migrations
  
  // Version 2: Add tags support
  memoTagsMigration,
];
```

### Step 4: Test the Migration

```bash
# 1. Start the application
pnpm dev

# 2. Check logs for migration output:
# "Starting migration manager initialization..."
# "Processing table: memos"
# "  Current version: 1, Target version: 2"
# "  Pending migrations: v1 -> v2"
# "Migration completed: tags field added to memos"

# 3. Verify by querying memos - they should now have an empty tags array
```

## Advanced Examples

### Example 2: Add a New Table

```typescript
// scripts/003-add-tags-table.ts

export const tagsTableMigration: Migration = {
  version: 3,
  tableName: 'tags',
  description: 'Create new tags table for tag management',
  
  up: async (connection: Connection) => {
    const tagsSchema = new Schema([
      new Field('tagId', new Utf8(), false),
      new Field('uid', new Utf8(), false),
      new Field('name', new Utf8(), false),
      new Field('color', new Utf8(), true),
      new Field('createdAt', new Timestamp(TimeUnit.MILLISECOND), false),
    ]);
    
    await connection.createEmptyTable('tags', tagsSchema);
  },
};
```

### Example 3: Data Transformation

```typescript
// scripts/004-transform-memo-content.ts

export const transformMemoContentMigration: Migration = {
  version: 4,
  tableName: 'memos',
  description: 'Transform memo content format (e.g., Markdown to HTML)',
  
  up: async (connection: Connection) => {
    const table = await connection.openTable('memos');
    const allMemos = await table.query().toArray();
    
    // Transform each memo
    const transformedMemos = allMemos.map((memo) => ({
      ...memo,
      content: transformMarkdownToHtml(memo.content), // Custom transformation
    }));
    
    // Delete all old records
    for (const memo of allMemos) {
      await table.delete(`memoId = '${memo.memoId}'`);
    }
    
    // Re-insert with transformed data
    await table.add(transformedMemos);
  },
};

function transformMarkdownToHtml(markdown: string): string {
  // Your transformation logic
  return markdown;
}
```

## Best Practices

1. **Make migrations idempotent** - Running twice should be safe
   ```typescript
   // Check if already applied
   const results = await table.query().where(...).limit(1).toArray();
   if (results.length > 0 && results[0].hasNewField) {
     return; // Already migrated
   }
   ```

2. **Handle empty tables gracefully**
   ```typescript
   const records = await table.query().toArray();
   if (records.length === 0) {
     console.log('Table is empty, skipping data migration');
     return;
   }
   ```

3. **Use descriptive names and descriptions**
   ```typescript
   export const myMigration: Migration = {
     version: 5,
     tableName: 'memos',
     description: 'Add full-text search index columns', // Clear purpose
     up: async (connection) => { ... }
   };
   ```

4. **Log progress for long-running migrations**
   ```typescript
   for (let i = 0; i < records.length; i++) {
     if (i % 1000 === 0) {
       console.log(`Processed ${i}/${records.length} records...`);
     }
     // Process record
   }
   ```

5. **Test migrations thoroughly**
   - Run on development database first
   - Use dryRun mode to preview changes
   - Verify data integrity after migration

## Common Pitfalls

1. **Not updating schema.ts** - Always update schema before creating migration
2. **SQL injection in WHERE clauses** - Escape quotes in table names
   ```typescript
   // ❌ Bad
   const results = await table.query().where(`tableName = '${name}'`).toArray();
   
   // ✅ Good
   const escaped = name.replace(/'/g, "''");
   const results = await table.query().where(`tableName = '${escaped}'`).toArray();
   ```

3. **Not handling errors** - Migrations should fail fast and clearly
4. **Blocking operations on large tables** - Consider batching for performance
