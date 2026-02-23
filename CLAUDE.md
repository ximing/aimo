# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AIMO is a full-stack AI-powered note-taking and knowledge management system. It's a pnpm monorepo with a React 19 frontend and Express.js backend using LanceDB for vector search.

## Development Commands

### Setup
```bash
# Install dependencies (requires pnpm 10.22.0+)
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env - required: JWT_SECRET (32+ chars), OPENAI_API_KEY
```

### Development
```bash
# Start all apps (frontend + backend)
pnpm dev

# Start individual apps
pnpm dev:web      # Frontend only - Vite dev server at http://localhost:5173
pnpm dev:server   # Backend only - Express at http://localhost:3000

# Start Docker dependencies (if needed)
pnpm dev:env
```

### Build
```bash
# Build all packages (DTO builds first due to Turbo dependency graph)
pnpm build

# Build specific apps
pnpm build:web
pnpm build:server
```

### Code Quality
```bash
pnpm lint           # ESLint across all packages
pnpm lint:fix       # Auto-fix lint issues
pnpm format         # Prettier format entire codebase
```

### Testing
```bash
# Run tests (server only - configured with Jest)
cd apps/server && pnpm test

# Run single test file
cd apps/server && pnpm test -- path/to/test.ts

# Run tests matching pattern
cd apps/server && pnpm test -- --testNamePattern="pattern"
```

### Cleanup
```bash
pnpm clean          # Clean dist directories
pnpm rm             # Remove all node_modules recursively
```

## Monorepo Architecture

### Package Structure
```
aimo/
├── apps/
│   ├── web/              # React 19 + Vite frontend
│   └── server/           # Express.js + TypeScript backend
├── packages/
│   └── dto/              # Shared Data Transfer Objects (Rollup-built)
└── config/
    ├── config-typescript/# Shared tsconfig
    ├── eslint-config/    # Shared ESLint rules
    ├── jest-presets/     # Shared Jest configs
    └── rollup-config/    # Shared Rollup configs
```

### Build Dependencies
Turbo orchestrates the build order:
1. `@aimo/dto` builds first (shared types)
2. `@aimo/web` and `@aimo/server` can build in parallel after DTO

Always import from `@aimo/dto` for shared types between frontend and backend.

## Backend Architecture (apps/server)

### Key Technologies
- **Express.js** with routing-controllers (decorator-based routing)
- **TypeDI** for dependency injection
- **LanceDB** for vector database (semantic search)
- **OpenAI** for embeddings (text-embedding-3-small default)
- **JWT** authentication with bcrypt
- **Multer** for file uploads
- **Zod** for validation

### Service Layer Pattern
Business logic lives in `src/services/`:
- `memo.service.ts` - CRUD + embedding generation
- `search.service.ts` - Vector similarity search
- `attachment.service.ts` - File storage (local/S3/OSS)
- `user.service.ts` - User management

### Storage Adapters (Multi-adapter Pattern)
Located in `src/sources/`:
- `lancedb.ts` - Vector database abstraction
- `storage/` - File storage adapters (local, S3, OSS)

### Controllers
Located in `src/controllers/v1/` - REST endpoints using routing-controllers decorators:
```typescript
@JsonController('/memos')
export class MemoController {
  constructor(private memoService: MemoService) {}

  @Get('/')
  async listMemos() { ... }
}
```

### Important Backend Conventions
- All services are decorated with `@Service()` for TypeDI injection
- Controllers auto-register via `src/controllers/index.ts` glob import
- LanceDB auto-generates embeddings on memo create/update via `EmbeddingService`
- Graceful shutdown handles LanceDB cleanup and scheduler stop
- Public endpoints (no auth): Omit `@CurrentUser()` decorator from method parameters
- Protected endpoints: Use `@CurrentUser() user: UserInfoDto` to get authenticated user
- Error codes: Import from `ErrorCode` constants in `constants/error-codes.ts`

## Frontend Architecture (apps/web)

### Key Technologies
- **React 19** with React Router 7
- **@rabjs/react** for reactive state management
- **Tailwind CSS** for styling
- **Axios** for HTTP requests
- **Vite** for building

### Directory Structure
```
src/
├── pages/           # Route-level components
│   ├── home/        # Memo list (main interface)
│   ├── gallery/     # Image gallery
│   ├── ai-explore/  # AI content exploration
│   └── settings/    # User settings
├── components/      # Reusable components
├── services/        # API abstraction layer
├── api/             # Raw API calls
└── utils/           # Helper utilities
```

### State Management Pattern
Uses @rabjs/react - stores in `src/services/`:
```typescript
// services/memo.service.ts
export class MemoService {
  memos = observable<Memo[]>([]);

  async fetchMemos() {
    this.memos.value = await api.get('/memos');
  }
}
```

## Environment Variables

### Required
```env
JWT_SECRET=your-super-secret-key-at-least-32-characters-long
OPENAI_API_KEY=sk-xxx...
CORS_ORIGIN=http://localhost:3000
```

### Storage Configuration
```env
# LanceDB (vector DB)
LANCEDB_STORAGE_TYPE=local  # or s3
LANCEDB_PATH=./lancedb_data

# File attachments
ATTACHMENT_STORAGE_TYPE=local  # or s3
ATTACHMENT_LOCAL_PATH=./attachments
```

### S3 Configuration (when using cloud storage)
```env
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
# Plus service-specific bucket/prefix settings
```

## Database Migrations

The project has a migration system in `apps/server/src/migrations/`:
- Migrations run automatically on startup
- Each migration has `up()` and `down()` methods
- Migration state tracked in `_migrations` meta table

## Docker Deployment

### Pre-built Image
```bash
docker pull ghcr.io/ximing/aimo:stable
```

### Local Build
```bash
make build-docker    # Build production image
make docker-run      # Run container
```

The Dockerfile is multi-stage:
1. Builder: Compiles DTO → Web → Server
2. Production: Minimal image with only runtime deps

## Common Tasks

### Adding a New API Endpoint
1. Create controller method in `apps/server/src/controllers/v1/`
2. Use routing-controllers decorators (@Get, @Post, etc.)
3. Inject services via constructor
4. Add corresponding frontend API call in `apps/web/src/api/`

### Adding a Database Field
1. Update DTO in `packages/dto/src/`
2. Rebuild DTO: `pnpm --filter @aimo/dto build`
3. Update LanceDB schema in `apps/server/src/sources/lancedb.ts`
4. Create migration if needed
5. Update frontend types (auto-imported from DTO)

### Adding New DTOs for API Response Types
1. Create DTO file in `packages/dto/src/<feature>.ts`
2. Export from `packages/dto/src/index.ts`
3. Rebuild DTO package: `pnpm --filter @aimo/dto build`
4. Import in server code from `@aimo/dto`
5. Run typecheck to verify: `cd apps/server && pnpm typecheck`

### Working with Vector Search
Embeddings are auto-generated via `EmbeddingService`. The flow:
1. Memo created/updated → `MemoService` calls `EmbeddingService.generateEmbedding()`
2. Vector stored in LanceDB alongside memo data
3. Search uses `SearchService.semanticSearch()` to query by vector similarity

### Working with Memo Relations
Memo relations are stored in a separate `memo_relations` table in LanceDB:
- `sourceMemoId` → `targetMemoId` (directed relation)
- Use `MemoRelationService` for relation operations
- **Forward relations**: `getRelatedMemos()` returns targets of a source memo
- **Backlinks**: `getBacklinks()` returns sources that target a memo (reverse lookup)
- Relations are enriched on read in `enrichMemosWithRelations()`

## TypeScript Configuration

- **Target**: ES2022
- **Module**: ESM (`"type": "module"` in package.json)
- **Path Aliases**: `@/` maps to `src/` in both frontend and backend
- **Strict mode**: Enabled

## Code Style

Prettier configuration:
```javascript
{
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 100,
  tabWidth: 2,
  arrowParens: 'always'
}
```

## License

Business Source License (BSL 1.1) - Commercial use requires separate license.
