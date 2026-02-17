# Migration System Quick Start Guide

## What is the Migration System?

A version-based schema management system that automatically initializes and upgrades the database on application startup.

## Key Concepts

| Concept | Meaning |
|---------|---------|
| **Version** | Schema iteration number (1, 2, 3, ...) |
| **Migration** | A TypeScript file that applies schema changes |
| **Metadata Table** | `table_migrations` - tracks current version of each table |
| **Pending Migrations** | Migrations that haven't been applied yet |

## How It Works

### On First Run
1. ✅ Creates `table_migrations` metadata table
2. ✅ Creates all business tables (v1)
3. ✅ Creates all indexes (v2)
4. ✅ Records versions in metadata table

### On Subsequent Runs
1. ✅ Reads metadata table
2. ✅ Compares current vs target versions
3. ✅ Applies only pending migrations
4. ✅ Updates metadata with new versions

## Creating a New Migration

### Step 1: Create Migration File
```bash
# Create a new file in apps/server/src/migrations/scripts/
# Name it with next version number: 003-add-tags.ts

# Use this template:
```

```typescript
// 003-add-tags.ts
import type { Connection } from '@lancedb/lancedb';
import type { Migration } from '../types.js';

export const addTagsMigration: Migration = {
  version: 3,
  tableName: 'memos',
  description: 'Add tags field to memos table',
  
  up: async (connection: Connection) => {
    // Your migration logic here
    console.log('Adding tags field to memos...');
    
    // Get the table
    const table = await connection.openTable('memos');
    
    // Implement your changes
    // (see MIGRATION_EXAMPLE.md for detailed patterns)
  },
};
```

### Step 2: Update Schema
```typescript
// apps/server/src/models/db/schema.ts

// Add new field to memosSchema
export const memosSchema = new Schema([
  // ... existing fields ...
  new Field('tags', new List(new Field('item', new Utf8(), true)), true), // NEW
]);

// Update MemoRecord interface
export interface MemoRecord {
  // ... existing fields ...
  tags?: string[]; // NEW
}
```

### Step 3: Export Migration
```typescript
// apps/server/src/migrations/scripts/index.ts

import { addTagsMigration } from './003-add-tags.js';

export const ALL_MIGRATIONS: Migration[] = [
  // ... existing migrations ...
  addTagsMigration, // ADD THIS
];
```

### Step 4: Test
```bash
# Start the application - migration runs automatically
pnpm dev

# Check console logs for:
# "Executing migration: memos v3 - Add tags field to memos..."
# "Migration completed: memos v3"
```

## Common Patterns

### Pattern 1: Add a New Field
```typescript
up: async (connection: Connection) => {
  const table = await connection.openTable('memos');
  const allRecords = await table.query().toArray();
  
  // Add new field with default value
  const updated = allRecords.map(record => ({
    ...record,
    newField: 'default_value',
  }));
  
  // Delete and re-add (LanceDB limitation)
  for (const record of allRecords) {
    await table.delete(`memoId = '${record.memoId}'`);
  }
  await table.add(updated);
}
```

### Pattern 2: Create New Table
```typescript
up: async (connection: Connection) => {
  const newSchema = new Schema([
    new Field('id', new Utf8(), false),
    // ... other fields ...
  ]);
  
  await connection.createEmptyTable('new_table_name', newSchema);
}
```

### Pattern 3: Create Indexes
```typescript
up: async (connection: Connection) => {
  const table = await connection.openTable('table_name');
  
  try {
    await table.createIndex('columnName', { config: lancedb.Index.btree() });
  } catch (error) {
    // Index might already exist - that's ok
    console.debug('Index already exists');
  }
}
```

### Pattern 4: Data Transformation
```typescript
up: async (connection: Connection) => {
  const table = await connection.openTable('memos');
  const allRecords = await table.query().toArray();
  
  // Transform data
  const transformed = allRecords.map(record => ({
    ...record,
    content: record.content.toUpperCase(), // Example: uppercase all content
  }));
  
  // Delete and re-add
  for (const record of allRecords) {
    await table.delete(`memoId = '${record.memoId}'`);
  }
  await table.add(transformed);
}
```

## Debugging

### Enable Verbose Logging
```typescript
// In MigrationManager instantiation
const manager = new MigrationManager({ verbose: true });

// Output:
// "Processing table: memos"
// "  Current version: 1, Target version: 3"
// "  Pending migrations: v2 -> v3"
// "Migration completed: memos v3"
```

### Check Current State
```typescript
const manager = new MigrationManager();
const status = await manager.getStatus(connection);

// Output: Map<string, number>
// { 'memos' => 3, 'users' => 2, ... }
```

### Validate Schema
```typescript
const validation = await manager.validate(connection);
console.log(validation.valid);    // true/false
console.log(validation.errors);   // List of mismatches
```

## Directory Structure

```
migrations/
├── 📄 README.md                 ← Read this first
├── 📄 ARCHITECTURE.md          ← Deep dive into design
├── 📄 MIGRATION_EXAMPLE.md     ← Detailed examples
├── 📄 QUICK_START.md           ← You are here
│
├── 📜 index.ts                 ← MigrationManager
├── 📜 executor.ts              ← MigrationExecutor
├── 📜 types.ts                 ← Type definitions
│
└── scripts/
    ├── 📜 001-init.ts          ← Create tables
    ├── 📜 002-create-indexes.ts ← Create indexes
    ├── 📜 index.ts             ← Migration registry
    └── 📝 (add more here)
```

## Important Notes

⚠️ **No Rollback**
- Migrations only go forward
- Cannot downgrade schema versions
- Make backups before major changes

⚠️ **LanceDB Limitations**
- No ALTER TABLE support
- Use delete/re-add pattern for schema changes
- Can be slow on large tables

⚠️ **Version Uniqueness**
- Each migration version must be unique per table
- v1, v2, v3... must be applied in order

⚠️ **Production Safety**
- Test migrations on development database first
- Use dry-run mode if available
- Verify data integrity after migration

## Commands

```bash
# Start dev server (runs migrations automatically)
pnpm dev

# Check for linter errors
pnpm lint

# Fix linter errors
pnpm lint:fix

# Build for production
pnpm build
```

## FAQ

**Q: Can I skip a version?**
A: No, migrations must be applied in order (v1 → v2 → v3).

**Q: Can I modify old migrations?**
A: Don't modify already-applied migrations. Create a new version instead.

**Q: What if a migration fails?**
A: Fix the migration code and restart the app. It will retry from the failed version.

**Q: Can I run migrations manually?**
A: No, they run automatically on application startup via MigrationManager.

**Q: How do I see migration history?**
A: Query the `table_migrations` table. Check `lastMigratedAt` timestamp for when each migration ran.

**Q: Can multiple applications migrate simultaneously?**
A: Current design is for single-process. For multi-process, would need locking mechanism.

## Next Steps

1. ✅ Read `README.md` for comprehensive overview
2. ✅ Study `ARCHITECTURE.md` for deep understanding
3. ✅ Review `MIGRATION_EXAMPLE.md` for detailed patterns
4. ✅ Create your first migration following the steps above

## Support

For more details:
- Schema definitions: `apps/server/src/models/db/schema.ts`
- LanceDB docs: https://lancedb.com/docs
- Migration examples: `MIGRATION_EXAMPLE.md`
