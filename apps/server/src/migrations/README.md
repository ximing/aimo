# Database Migration System

This directory contains the database schema migration system for LanceDB. It provides version-based schema management with automatic initialization and incremental migration support.

## Architecture

### Core Components

1. **MigrationManager** (`index.ts`)
   - Main orchestrator for migrations
   - Handles initialization flow
   - Tracks version state across tables
   - Validates migration completion

2. **MigrationExecutor** (`executor.ts`)
   - Executes individual migration scripts
   - Updates metadata table after each migration
   - Provides version tracking queries

3. **Migration Scripts** (`scripts/`)
   - Individual migration files numbered sequentially (001-init.ts, 002-*, etc.)
   - Each script implements the `Migration` interface
   - Organized by version, not by table

4. **Metadata Table** (table_migrations)
   - Stores current schema version for each table
   - Created automatically on first run
   - Used to determine which migrations to execute

## How It Works

### First Run (Fresh Database)
1. `LanceDbService.init()` connects to database
2. `MigrationManager.initialize()` is called
3. `MigrationExecutor.ensureMetadataTableExists()` creates `table_migrations` table
4. All migrations from version 1 are executed
5. Metadata table is populated with version 1 for all tables
6. Scalar indexes are created

### Subsequent Runs (Database Exists)
1. Connect to database
2. Read current versions from `table_migrations` table
3. Compare with target versions from migration scripts
4. Execute only pending migrations (current+1 to target)
5. Update metadata with new versions

### Migration Execution Flow
```
For each table:
  1. Read current version from metadata (or 0 if not found)
  2. Get target version (latest version available)
  3. If target == current → skip
  4. Get pending migrations (versions > current)
  5. Execute each migration in order
  6. Update metadata after each successful migration
```

## Adding New Migrations

### Step 1: Create Migration File
Create a new file in `scripts/` with the next version number:

```typescript
// scripts/002-add-tags-field.ts
import type { Connection } from '@lancedb/lancedb';
import type { Migration } from '../types.js';

export const memoTagsMigration: Migration = {
  version: 2,
  tableName: 'memos',
  description: 'Add tags field to memos table',
  up: async (connection: Connection) => {
    // Your migration logic here
    // Note: LanceDB has limitations on schema modification
    // You may need to recreate the table with new schema
    const table = await connection.openTable('memos');
    // ... migration implementation
  },
};
```

### Step 2: Export Migration
Update `scripts/index.ts` to include the new migration:

```typescript
import {
  usersTableMigration,
  memosTableMigration,
  // ... other imports
  memoTagsMigration, // Add this
} from './002-add-tags-field.js';

export const ALL_MIGRATIONS: Migration[] = [
  // Version 1
  usersTableMigration,
  memosTableMigration,
  // ... other v1 migrations
  
  // Version 2
  memoTagsMigration,
];
```

### Step 3: Update Helper Functions
The helper functions in `scripts/index.ts` will automatically:
- Include the new migration in `getMigrationsForTable()`
- Update `getLatestVersion()` to reflect the new version
- List the new table in `getAllTableNames()` if applicable

## Type Definitions

### Migration Interface
```typescript
interface Migration {
  version: number;              // Version number (must be unique per table)
  tableName: string;             // Table this migration applies to
  description?: string;          // Description of changes
  up: (connection: Connection) => Promise<void>; // Migration logic
}
```

### MigrationRecord
```typescript
interface TableMigrationRecord {
  tableName: string;             // Unique table name
  currentVersion: number;        // Current schema version
  lastMigratedAt: number;        // Timestamp in milliseconds
}
```

## Important Notes

### LanceDB Limitations
- LanceDB doesn't support traditional ALTER TABLE operations
- To modify schema, you typically need to:
  1. Create a new table with updated schema
  2. Copy data from old table to new table
  3. Delete old table
  4. Rename new table to original name

### Migration Principles
- **One-way**: Migrations only go forward (no rollback support)
- **Idempotent**: Running the same migration twice should be safe
- **Atomic per table**: Each table migration is treated as atomic
- **Sequential**: Migrations execute in version order

### Version Numbering
- Versions must be positive integers (1, 2, 3, ...)
- Each migration version is unique per table
- Versions are independent across tables (each table has its own version line)

## Usage Examples

### Automatic Initialization
Migrations run automatically during application startup:

```typescript
// In apps/server/src/index.ts
const lanceDbService = Container.get(LanceDbService);
await lanceDbService.init(); // Runs migrations automatically
```

### Check Migration Status
```typescript
const manager = new MigrationManager({ verbose: true });
const status = await manager.getStatus(connection);

// Output: Map<string, number>
// { 'users' => 1, 'memos' => 1, ... }
```

### Validate Migrations
```typescript
const validation = await manager.validate(connection);
console.log(validation.valid);    // boolean
console.log(validation.errors);   // string[]
```

### Dry Run Mode
```typescript
const manager = new MigrationManager({ 
  verbose: true, 
  dryRun: true // Don't actually execute
});
await manager.initialize(connection);
```

## Debugging

Enable verbose logging to see detailed migration information:

```typescript
const manager = new MigrationManager({ verbose: true });
await manager.initialize(connection);

// Output:
// Starting migration manager initialization...
// Found 7 tables with migrations: users, memos, ...
// Processing table: users
//   Current version: 0, Target version: 1
//   Pending migrations: v1
//   Successfully migrated users to v1
// ... (repeat for each table)
// Migration manager initialization completed successfully
```

## File Structure

```
migrations/
├── index.ts                    # MigrationManager - main entry point
├── executor.ts                 # MigrationExecutor - executes migrations
├── types.ts                    # Type definitions (Migration interface, etc.)
├── scripts/
│   ├── index.ts               # Migration script exports and helpers
│   ├── 001-init.ts            # Version 1: Initialize all tables
│   ├── 002-add-*.ts           # Version 2: Add new field/table
│   └── ...                    # Future migrations
└── README.md                   # This file
```

## Related Files

- `apps/server/src/models/db/schema.ts` - Table schemas and TableMigrationRecord type
- `apps/server/src/sources/lancedb.ts` - LanceDbService integration point
- `apps/server/src/migrations/` - This directory

## Future Enhancements

- [ ] Rollback mechanism (storing migration history)
- [ ] Migration creation CLI tool
- [ ] Parallel migration support for independent tables
- [ ] Migration health checks and validation
- [ ] Migration statistics and performance tracking
