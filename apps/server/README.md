# AIMO Server

Express.js backend server for AIMO with MySQL for relational data and LanceDB for vector embeddings.

## Architecture

The server uses a hybrid database architecture:

- **MySQL** (via Drizzle ORM): Stores all scalar/relational data (users, memos, categories, tags, etc.)
- **LanceDB**: Stores vector embeddings for semantic search (memo_vectors, attachment_vectors)

## Prerequisites

- Node.js 18+ (recommended: use the version specified in `.nvmrc`)
- pnpm 10.22.0+
- MySQL 8.0+ or MariaDB 10.6+

## Setup

### 1. Install Dependencies

```bash
# From project root
pnpm install
```

### 2. Configure MySQL

#### Option A: Local MySQL Installation

Install MySQL locally:

```bash
# macOS (Homebrew)
brew install mysql
brew services start mysql

# Ubuntu/Debian
sudo apt-get install mysql-server
sudo systemctl start mysql

# Create database
mysql -u root -p
CREATE DATABASE aimo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'aimo'@'localhost' IDENTIFIED BY 'your-secure-password';
GRANT ALL PRIVILEGES ON aimo.* TO 'aimo'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### Option B: Docker MySQL

```bash
# From project root
docker-compose up -d mysql

# The database 'aimo' will be created automatically
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and configure MySQL connection:

```env
# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=aimo
MYSQL_PASSWORD=your-secure-password
MYSQL_DATABASE=aimo
MYSQL_CONNECTION_LIMIT=10

# Required: OpenAI API Key for embeddings
OPENAI_API_KEY=sk-your-openai-api-key

# Required: JWT Secret (32+ characters)
JWT_SECRET=your-super-secret-key-at-least-32-characters-long
```

### 4. Run Database Migrations

Migrations run automatically on server startup, but you can also run them manually:

```bash
# From apps/server directory
cd apps/server

# Run migrations
pnpm migrate

# Or from project root
pnpm --filter @aimo/server migrate
```

## Development

### Start Development Server

```bash
# From project root
pnpm dev:server

# Or from apps/server directory
cd apps/server
pnpm dev
```

The server will start at `http://localhost:3000`.

### Drizzle Commands

```bash
# Generate new migration after schema changes
pnpm migrate:generate

# Run migrations manually
pnpm migrate

# Open Drizzle Studio (database GUI)
pnpm migrate:studio
```

### Code Quality

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Format code
pnpm format
```

### Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test -- path/to/test.ts

# Run tests matching pattern
pnpm test -- --testNamePattern="pattern"
```

## Database Schema

### MySQL Tables (via Drizzle ORM)

- `users` - User accounts and authentication
- `categories` - Memo categories
- `tags` - Tags with usage tracking
- `memos` - Memo content and metadata
- `memo_relations` - Relations between memos
- `attachments` - File attachment metadata
- `ai_conversations` - AI chat conversations
- `ai_messages` - Messages within conversations
- `daily_recommendations` - Cached daily recommendations
- `push_rules` - Push notification rules
- `table_migrations` - Migration tracking

### LanceDB Tables (Vector Storage)

- `memo_vectors` - Memo embeddings for semantic search
- `attachment_vectors` - Multimodal embeddings for images/videos
- `embedding_cache` - Text embedding cache
- `multimodal_embedding_cache` - Multimodal embedding cache

## Project Structure

```
apps/server/
├── src/
│   ├── config/           # Configuration management
│   ├── controllers/      # REST API controllers (routing-controllers)
│   ├── db/               # Database layer
│   │   ├── schema/       # Drizzle ORM schemas
│   │   ├── connection.ts # MySQL connection pool
│   │   ├── migrate.ts    # Migration runner
│   │   └── transaction.ts # Transaction helpers
│   ├── middlewares/      # Express middlewares
│   ├── migrations/       # LanceDB migration scripts
│   ├── models/           # Data models and types
│   ├── services/         # Business logic layer
│   ├── sources/          # Data source adapters (LanceDB, storage)
│   ├── utils/            # Utility functions
│   ├── app.ts            # App initialization
│   └── index.ts          # Entry point
├── drizzle/              # Generated SQL migrations
├── drizzle.config.ts     # Drizzle configuration
└── package.json
```

## Common Tasks

### Adding a New Database Field

1. Update the Drizzle schema in `src/db/schema/`
2. Rebuild the server: `pnpm build`
3. Generate migration: `pnpm migrate:generate`
4. Review the generated SQL in `drizzle/`
5. Run migration: `pnpm migrate` or restart the server

### Adding a New API Endpoint

1. Create or update controller in `src/controllers/v1/`
2. Use routing-controllers decorators (`@Get`, `@Post`, etc.)
3. Inject services via constructor
4. Update corresponding DTO in `packages/dto/src/` if needed

### Working with Transactions

Use the transaction helpers for multi-table operations:

```typescript
import { withTransaction } from '@/db/transaction.js';

await withTransaction(async (tx) => {
  // All queries use tx instead of db
  await tx.insert(memos).values(newMemo);
  await tx.insert(memoRelations).values(relations);
  // Automatically commits on success, rolls back on error
});
```

## Troubleshooting

### MySQL Connection Errors

1. Verify MySQL is running: `mysql -u root -p`
2. Check credentials in `.env` match your MySQL setup
3. Ensure database exists: `SHOW DATABASES;`
4. Check connection pool logs in server output

### Migration Errors

1. Ensure schema is built: `pnpm build`
2. Check `drizzle.config.ts` points to `dist/db/schema/index.js`
3. Verify MySQL connection before running migrations
4. Check migration logs in `apps/server/drizzle/meta/_journal.json`

### Type Errors

1. Rebuild DTO package: `pnpm --filter @aimo/dto build`
2. Run typecheck: `pnpm typecheck`
3. Clear Turbo cache: `pnpm clean`

## Production Deployment

See [PRODUCTION_DEPLOYMENT.md](../../PRODUCTION_DEPLOYMENT.md) in the project root for production setup instructions.

## License

Business Source License (BSL 1.1) - See [LICENSE](../../LICENSE) for details.
