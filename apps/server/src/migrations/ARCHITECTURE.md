# Database Migration System Architecture

## Overview

The database migration system is a comprehensive schema management solution that tracks and applies database changes incrementally. It's fully integrated into the LanceDB initialization process.

## Core Components

### 1. MigrationManager (index.ts)

The orchestrator for the entire migration process.

**Responsibilities:**

- Reads metadata table on startup
- Determines which tables need migrations
- Compares current vs target versions
- Executes pending migrations in sequence
- Validates final state

**Key Methods:**

- `initialize(connection)` - Entry point for migration
- `getStatus(connection)` - Returns current version state
- `validate(connection)` - Checks if all tables are up-to-date

### 2. MigrationExecutor (executor.ts)

Executes individual migration scripts and manages metadata.

**Responsibilities:**

- Executes migration `up()` functions
- Updates metadata table after each migration
- Handles version tracking
- Provides idempotent queries

**Key Methods:**

- `executeMigration()` - Run single migration
- `executeMigrations()` - Run multiple migrations in sequence
- `getCurrentVersion()` - Query current version from metadata
- `ensureMetadataTableExists()` - Create metadata table if needed

### 3. Migration Scripts (scripts/\*)

Individual migration files numbered sequentially.

**Current Migrations:**

- `001-init.ts` - Creates all business tables
- `002-create-indexes.ts` - Creates scalar indexes for query optimization

**Future Migrations:**

- `003-*.ts` - Add new fields/tables as needed
- `004-*.ts` - Further schema changes

### 4. Metadata Table (table_migrations)

Stores version information for each table.

**Schema:**

```
tableName: string          // Unique table identifier
currentVersion: number      // Current schema version number
lastMigratedAt: number     // Timestamp of last migration
```

**Purpose:**

- Tracks which version each table is at
- Enables incremental migrations
- Prevents re-running completed migrations

## Initialization Flow

### First Run (Fresh Database)

```
LanceDbService.init()
  └─> Establish DB connection
  └─> runMigrations()
      └─> MigrationManager.initialize()
          └─> MigrationExecutor.ensureMetadataTableExists()
              └─> Create 'table_migrations' table
          └─> For each table with migrations:
              ├─> Get current version from metadata (default: 0)
              ├─> Get target version from scripts
              ├─> Execute migrations: v(0+1) to v(target)
              │   ├─> 001-init.ts v1
              │   │   ├─> Create users table
              │   │   ├─> Create memos table
              │   │   ├─> Create memo_relations table
              │   │   ├─> Create categories table
              │   │   ├─> Create attachments table
              │   │   ├─> Create embedding_cache table
              │   │   └─> Create multimodal_embedding_cache table
              │   └─> 002-create-indexes.ts v2
              │       └─> Create all indexes for all tables
              └─> Update metadata table with v2
```

### Subsequent Runs (Database Exists)

```
LanceDbService.init()
  └─> runMigrations()
      └─> MigrationManager.initialize()
          └─> MigrationExecutor.ensureMetadataTableExists()
          └─> For each table with migrations:
              ├─> Read current version from metadata (e.g., v2)
              ├─> Get target version from scripts (e.g., v2)
              ├─> Current == Target → Skip (no pending migrations)
              └─> Or if target > current:
                  └─> Execute only pending migrations
```

## Migration Lifecycle

### For Each Table

1. **Check Current State**

   ```typescript
   currentVersion = await MigrationExecutor.getCurrentVersion(metadataTable, 'memos'); // Returns: 1 (or 0 if not migrated)
   ```

2. **Determine Target Version**

   ```typescript
   targetVersion = getLatestVersion('memos'); // Returns: 2
   ```

3. **Get Pending Migrations**

   ```typescript
   pending = getMigrationsFromVersion('memos', currentVersion);
   // Returns migrations where version > currentVersion
   // Example: [v2_indexes_migration]
   ```

4. **Execute Each Migration**

   ```typescript
   for (const migration of pending) {
     await MigrationExecutor.executeMigration(connection, migration, metadataTable);
   }
   ```

5. **Update Metadata**
   After each migration completes:
   ```typescript
   table_migrations UPDATE
   SET currentVersion = 2, lastMigratedAt = now()
   WHERE tableName = 'memos'
   ```

## Version Management

### Version Numbering

- **Positive integers only:** 1, 2, 3, ...
- **Per-table tracking:** Each table has independent versions
- **Incremental:** Versions must be applied in order

### Example State

```
table_migrations table:
┌─────────────┬──────────────┬─────────────┐
│ tableName   │ currentVer   │ migratedAt  │
├─────────────┼──────────────┼─────────────┤
│ users       │ 2            │ 1708521000  │
│ memos       │ 2            │ 1708521000  │
│ categories  │ 2            │ 1708521000  │
│ attachments │ 2            │ 1708521000  │
│ ... (other) │ 2            │ 1708521000  │
└─────────────┴──────────────┴─────────────┘
```

## Migration Execution Strategy

### Serial Execution (Current)

- Migrations execute one at a time
- Simplifies error handling
- Easier to debug and monitor

### Version Ordering

```
All v1 migrations for all tables (if needed)
  ↓
All v2 migrations for all tables
  ↓
All v3 migrations for all tables
```

### Example: Adding Index on Memos

**Scenario:** Memos table at v1, need to add index (v2)

1. Read metadata: memos.currentVersion = 1
2. Check scripts: getLatestVersion('memos') = 2
3. Pending = [v2_index_migration]
4. Execute v2_index_migration.up(connection)
5. Update metadata: memos.currentVersion = 2

## Error Handling

### Migration Failures

- Stop execution immediately
- Don't update metadata
- Throw descriptive error
- Application startup fails (forces fix)

### Partial Migrations

- If v1 succeeds but v2 fails
- Metadata only updates if migration succeeds
- Next run will retry from v2

### Recovery

1. Fix migration code
2. Restart application
3. Migration system retries from failure point

## Index Management

### Previous Approach

- Indexes created immediately after table creation
- Hardcoded in LanceDbService
- No version tracking

### Current Approach

- Indexes as migration v2 (002-create-indexes.ts)
- Tracked in metadata table
- Can add/modify indexes in future migrations

### Index Composition

**By Table:**
| Table | Indexes |
|-------|---------|
| users | uid, email, phone, status |
| memos | uid, memoId, categoryId, createdAt, updatedAt |
| memo_relations | uid, relationId, sourceMemoId, targetMemoId |
| categories | uid, categoryId, createdAt |
| attachments | uid, attachmentId, createdAt |
| embedding_cache | contentHash, modelHash |
| multimodal_embedding_cache | contentHash, modelHash, modalityType |
| table_migrations | tableName |

**By Type:**

- BTREE: Most common, for exact match and range queries
- BITMAP: Low-cardinality fields (status, modalityType)

## Design Principles

### 1. Version Isolation

Each table maintains its own version line independently.

### 2. Idempotency

Running migrations multiple times should be safe:

- Already-created tables are skipped
- Already-created indexes check existence

### 3. Forward-Only

No rollback support. Schema changes are permanent.

### 4. Atomic per Migration

Each migration succeeds or fails completely. No partial states.

### 5. Metadata-Driven

Version truth lives in metadata table, not hardcoded.

### 6. Self-Contained

Each migration file is complete and runnable.

## File Structure

```
migrations/
├── index.ts                    # MigrationManager
├── executor.ts                 # MigrationExecutor
├── types.ts                    # Type definitions
├── scripts/
│   ├── 001-init.ts            # Initial schema
│   ├── 002-create-indexes.ts  # Indexes
│   └── index.ts               # Script registry
├── README.md                   # User guide
├── MIGRATION_EXAMPLE.md        # How to add migrations
└── ARCHITECTURE.md             # This file
```

## Integration Points

### LanceDbService (lancedb.ts)

```typescript
async init() {
  // 1. Connect to database
  this.db = await lancedb.connect(path, options)

  // 2. Run migrations (replaces old ensureTablesExist)
  await this.runMigrations()

  // 3. Done! Indexes created by migration system
}

private async runMigrations() {
  const manager = new MigrationManager({ verbose: true })
  await manager.initialize(this.db)
  const validation = await manager.validate(this.db)
  if (!validation.valid) throw new Error(...)
}
```

### Application Startup

1. Server starts
2. LanceDbService instantiated via TypeDI
3. `init()` called automatically
4. Migrations run
5. Tables and indexes created/updated
6. Application ready to serve requests

## Benefits

1. **Version Control:** Schema changes tracked and versioned
2. **Incremental Updates:** Only apply needed migrations
3. **Automatic:** No manual steps needed
4. **Reversible (in code):** Can always add migration to revert
5. **Auditable:** Can see migration history in metadata table
6. **Scalable:** Easily add new migrations
7. **Safe:** Prevents schema inconsistencies
8. **Testable:** Each migration is isolated

## Future Enhancements

- [ ] Migration rollback support
- [ ] Parallel migration execution
- [ ] Migration performance statistics
- [ ] CLI tool to generate migration templates
- [ ] Migration validation/health checks
- [ ] Automated backup before migrations
- [ ] Dry-run mode for preview
- [ ] Migration documentation generator
