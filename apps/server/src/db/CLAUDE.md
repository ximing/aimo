# Database Module (Drizzle ORM)

This module handles MySQL database connections, schema definitions, and migrations using Drizzle ORM.

## Key Files

- `connection.ts` - Database connection pool and singleton accessor
- `migrate.ts` - Migration runner for applying schema changes
- `schema/` - Drizzle table schema definitions

## Important Patterns

### Drizzle Config (drizzle.config.ts)

- **Must use environment variables directly** - Do NOT import from config.ts (causes module resolution issues)
- **Schema path must point to compiled output** - Use `./dist/db/schema/index.js`, not source TypeScript files
- Drizzle-kit requires JavaScript files, not TypeScript

### Database Connection

- Access via `getDatabase()` singleton from `connection.ts`
- Connection pool is initialized once at app startup
- Pool configuration: max 10 connections, keepAlive enabled
- Health checks on startup ensure MySQL is reachable

### Schema Definitions

- All schemas in `schema/` directory must be exported from `schema/index.ts`
- Use `mysqlTable()` with proper column types
- Foreign keys: `.references()` with `onDelete: 'cascade'` or `onDelete: 'set null'`
- JSON columns: Use `.$type<T>()` for type safety
- Timestamps: `timestamp('created_at', { mode: 'date', fsp: 3 })` for millisecond precision
- VARCHAR key lengths: 191 for primary/foreign keys (MySQL utf8mb4 index limit)

### Migrations

- **Generate migrations**: `pnpm migrate:generate` (requires build first: `pnpm build`)
- **Run migrations**: `pnpm migrate` (manual) or automatic on server startup
- **View database**: `pnpm migrate:studio` (Drizzle Studio)
- Migration files stored in `drizzle/` folder at server root
- Migrations run automatically after MySQL connection, before LanceDB initialization

## Startup Sequence

The app follows this initialization order:

1. IOC container
2. MySQL connection pool
3. **Database migrations** ← This module
4. LanceDB initialization
5. Scheduler service
6. Express server

## Shutdown Sequence

Graceful shutdown closes resources in reverse order:

1. Express server stops accepting requests
2. Scheduler service stops
3. **MySQL connection pool closes** ← This module
4. LanceDB closes

## Common Tasks

### Adding a New Table

1. Create schema file in `schema/` (e.g., `new-table.ts`)
2. Export from `schema/index.ts`
3. Build server: `pnpm build`
4. Generate migration: `pnpm migrate:generate`
5. Review generated SQL in `drizzle/` folder
6. Migration runs automatically on next server start

### Modifying an Existing Table

1. Update schema file in `schema/`
2. Build server: `pnpm build`
3. Generate migration: `pnpm migrate:generate`
4. Review generated SQL (Drizzle will create ALTER TABLE statements)
5. Migration runs automatically on next server start

### Accessing the Database

```typescript
import { getDatabase } from '@/db/connection.js';
import { users } from '@/db/schema/index.js';
import { eq } from 'drizzle-orm';

const db = getDatabase();

// Query
const user = await db.select().from(users).where(eq(users.uid, userId));

// Insert
await db.insert(users).values({ uid: 'xxx', email: 'test@example.com', ... });

// Update
await db.update(users).set({ nickname: 'New Name' }).where(eq(users.uid, userId));

// Delete
await db.delete(users).where(eq(users.uid, userId));
```

## Gotchas

- Always build (`pnpm build`) before generating migrations - drizzle-kit reads from dist/ folder
- Schema changes require migration generation - don't modify database manually
- Foreign key constraints are enforced - respect cascade rules when deleting
- JSON columns need explicit typing with `.$type<T>()` for TypeScript safety
- VARCHAR(191) limit for keys is due to MySQL utf8mb4 index size limit (767 bytes / 4 bytes per char = 191)
