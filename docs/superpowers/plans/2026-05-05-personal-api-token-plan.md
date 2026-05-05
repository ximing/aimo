# Personal API Token Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Personal API Token feature - users can create tokens in settings, use them for Bearer auth on all protected endpoints.

**Architecture:** Dual-hash token storage (SHA-256 for fast lookup, bcrypt for verification). JWT auth remains primary; Personal Token is fallback when JWT fails. New `user_tokens` table stores token metadata.

**Tech Stack:** Express.js + TypeDI + Drizzle ORM + MySQL (backend); React 19 + Tailwind + @rabjs/react (frontend)

---

## Chunk 1: Database Schema & Migration

### Task 1: Create user-tokens schema

**Files:**
- Create: `apps/server/src/db/schema/user-tokens.ts`
- Modify: `apps/server/src/db/schema/index.ts`

- [ ] **Step 1: Create schema file**

```typescript
// apps/server/src/db/schema/user-tokens.ts
import { mysqlTable, varchar, timestamp } from 'drizzle-orm/mysql-core';
import { userTokens } from './index';

export const userTokens = mysqlTable('user_tokens', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  tokenKey: varchar('token_key', { length: 64 }).notNull().unique(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', { mode: 'date', fsp: 3 }),
  createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { mode: 'date', fsp: 3 }),
});
```

- [ ] **Step 2: Add to schema index**

Add to `apps/server/src/db/schema/index.ts`:
```typescript
export * from './user-tokens';
```

- [ ] **Step 3: Build server**

Run: `cd apps/server && pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Generate migration**

Run: `cd apps/server && pnpm migrate:generate`
Expected: Migration file created in `drizzle/` folder

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/db/schema/user-tokens.ts apps/server/src/db/schema/index.ts drizzle/
git commit -m "feat(server): add user_tokens schema for personal API tokens"
```

---

## Chunk 2: DTO Package

### Task 2: Create DTO file

**Files:**
- Create: `packages/dto/src/user-token.ts`
- Modify: `packages/dto/src/index.ts`

- [ ] **Step 1: Create DTO file**

```typescript
// packages/dto/src/user-token.ts
export class CreateUserTokenDto {
  name!: string;        // 1-100 字符
  expiresAt!: number;   // 毫秒时间戳，0 = 永不过期
}

export class UserTokenResponseDto {
  id!: string;
  name!: string;
  token?: string;       // 创建时返回原始值
  expiresAt!: number;
  createdAt!: number;
  revokedAt!: number;
  isExpired!: boolean;
  isActive!: boolean;
}

export class UserTokenListResponseDto {
  tokens!: UserTokenResponseDto[];
}
```

- [ ] **Step 2: Export from index**

Add to `packages/dto/src/index.ts`:
```typescript
export * from './user-token';
```

- [ ] **Step 3: Build DTO package**

Run: `pnpm --filter @aimo/dto build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add packages/dto/src/user-token.ts packages/dto/src/index.ts
git commit -m "feat(dto): add UserToken DTOs"
```

---

## Chunk 3: Error Codes

### Task 3: Add new error codes

**Files:**
- Modify: `apps/server/src/constants/error-codes.ts`

- [ ] **Step 1: Add error codes**

Add to the ErrorCode enum in `apps/server/src/constants/error-codes.ts`:
```typescript
TOKEN_NOT_FOUND: 1004,
TOKEN_REVOKED: 1005,
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/constants/error-codes.ts
git commit -m "feat(server): add TOKEN_NOT_FOUND and TOKEN_REVOKED error codes"
```

---

## Chunk 4: User Token Service

### Task 4: Create UserTokenService

**Files:**
- Create: `apps/server/src/services/user-token.service.ts`

- [ ] **Step 1: Create service file**

```typescript
// apps/server/src/services/user-token.service.ts
import { Service } from 'typedi';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { getDatabase } from '@/db/connection';
import { userTokens } from '@/db/schema';
import { UserTokenResponseDto } from '@aimo/dto';
import { ErrorCode } from '@/constants/error-codes';

@Service()
export class UserTokenService {
  private db = getDatabase();

  async createToken(userId: string, name: string, expiresAt: number): Promise<{ token: string; id: string }> {
    const token = `aimo_tk_${crypto.randomBytes(32).toString('hex')}`;
    const tokenKey = crypto.createHash('sha256').update(token).digest('hex');
    const tokenHash = await bcrypt.hash(token, 10);
    const id = crypto.randomUUID();

    await this.db.insert(userTokens).values({
      id,
      userId,
      name,
      tokenKey,
      tokenHash,
      expiresAt: expiresAt > 0 ? new Date(expiresAt) : null,
    });

    return { token, id };
  }

  async getTokenByKey(tokenKey: string): Promise<typeof userTokens.$inferSelect & { user?: any } | null> {
    const result = await this.db
      .select()
      .from(userTokens)
      .where(eq(userTokens.tokenKey, tokenKey))
      .limit(1);

    if (!result[0]) {
      return null;
    }

    const token = result[0];

    // Check if revoked
    if (token.revokedAt) {
      throw new ErrorCode('TOKEN_REVOKED');
    }

    // Check if expired
    if (token.expiresAt && token.expiresAt.getTime() < Date.now()) {
      throw new ErrorCode('TOKEN_EXPIRED');
    }

    // Load user relation
    // (depends on how relations are set up - may need to join manually)

    return token;
  }

  async getTokensByUserId(userId: string): Promise<UserTokenResponseDto[]> {
    const results = await this.db
      .select()
      .from(userTokens)
      .where(eq(userTokens.userId, userId));

    return results.map((t) => ({
      id: t.id,
      name: t.name,
      expiresAt: t.expiresAt?.getTime() ?? 0,
      createdAt: t.createdAt.getTime(),
      revokedAt: t.revokedAt?.getTime() ?? 0,
      isExpired: !!t.expiresAt && t.expiresAt.getTime() < Date.now(),
      isActive: !t.revokedAt && (!t.expiresAt || t.expiresAt.getTime() >= Date.now()),
    }));
  }

  async revokeToken(id: string, userId: string): Promise<void> {
    const result = await this.db
      .update(userTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(userTokens.id, id), eq(userTokens.userId, userId)));

    if (!result.rowCount) {
      throw new ErrorCode('TOKEN_NOT_FOUND');
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/services/user-token.service.ts
git commit -m "feat(server): add UserTokenService for personal API token management"
```

---

## Chunk 5: User Token Controller

### Task 5: Create UserTokenController

**Files:**
- Create: `apps/server/src/controllers/v1/user-token.controller.ts`
- Modify: `apps/server/src/controllers/index.ts` (or wherever controllers are registered)

- [ ] **Step 1: Create controller file**

```typescript
// apps/server/src/controllers/v1/user-token.controller.ts
import { JsonController, Get, Post, Delete, Body, Param, CurrentUser } from 'routing-controllers';
import { UserTokenService } from '@/services/user-token.service';
import { CreateUserTokenDto, UserTokenResponseDto, UserTokenListResponseDto } from '@aimo/dto';
import { OpenAPI } from 'routing-controllers-openapi';

@JsonController('/api/v1/user/tokens')
export class UserTokenController {
  constructor(private userTokenService: UserTokenService) {}

  @Post()
  @OpenAPI({ description: 'Create a new personal API token' })
  async createToken(
    @CurrentUser() user: { uid: string },
    @Body() dto: CreateUserTokenDto
  ): Promise<UserTokenResponseDto> {
    if (!dto.name || dto.name.length < 1 || dto.name.length > 100) {
      throw new ErrorCode('INVALID_PARAMETER');
    }

    const { token, id } = await this.userTokenService.createToken(user.uid, dto.name, dto.expiresAt);
    const tokens = await this.userTokenService.getTokensByUserId(user.uid);
    const created = tokens.find((t) => t.id === id)!;

    return { ...created, token };
  }

  @Get()
  @OpenAPI({ description: 'List all personal API tokens for current user' })
  async listTokens(@CurrentUser() user: { uid: string }): Promise<UserTokenListResponseDto> {
    const tokens = await this.userTokenService.getTokensByUserId(user.uid);
    return { tokens };
  }

  @Delete('/:id')
  @OpenAPI({ description: 'Revoke a personal API token' })
  async revokeToken(
    @CurrentUser() user: { uid: string },
    @Param('id') id: string
  ): Promise<{ success: boolean }> {
    await this.userTokenService.revokeToken(id, user.uid);
    return { success: true };
  }
}
```

- [ ] **Step 2: Register controller**

Add to the controller index file where other controllers are imported/registered (check `apps/server/src/controllers/index.ts`).

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/controllers/v1/user-token.controller.ts apps/server/src/controllers/index.ts
git commit -m "feat(server): add UserTokenController for token CRUD operations"
```

---

## Chunk 6: Auth Middleware Update

### Task 6: Update auth handler to support personal tokens

**Files:**
- Modify: `apps/server/src/middlewares/auth-handler.ts`

- [ ] **Step 1: Update auth handler**

In the auth handler, after JWT verification fails, add personal token check:

```typescript
import { UserTokenService } from '@/services/user-token.service';
import crypto from 'crypto';

// After JWT verify fails, try personal token:
const authHeader = request.headers.authorization;
if (authHeader?.startsWith('Bearer ')) {
  const token = authHeader.slice(7);
  // Skip if it looks like a JWT (has two dots)
  if (!token.includes('.') || token.split('.').length !== 3) {
    try {
      const tokenKey = crypto.createHash('sha256').update(token).digest('hex');
      const userToken = await userTokenService.getTokenByKey(tokenKey);
      if (userToken) {
        request.user = { uid: userToken.userId };
      }
    } catch (e) {
      // Token invalid/expired/revoked - don't set user
    }
  }
}
```

Note: May need to resolve circular dependency issue. If UserTokenService is not available at middleware init time, use `Container.get(UserTokenService)` instead of direct import.

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/middlewares/auth-handler.ts
git commit -m "feat(server): add personal API token support to auth handler"
```

---

## Chunk 7: Frontend - Settings Menu

### Task 7: Add API Token to settings menu

**Files:**
- Modify: `apps/web/src/pages/settings/components/settings-menu.tsx`

- [ ] **Step 1: Add menu item**

Add to the menu items array:
```typescript
{ id: 'api-tokens', label: 'API Token', route: '/settings/api-tokens' }
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/settings/components/settings-menu.tsx
git commit -m "feat(web): add API Token menu item to settings"
```

---

## Chunk 8: Frontend - API Layer

### Task 8: Add token API functions

**Files:**
- Modify: `apps/web/src/api/user.ts`

- [ ] **Step 1: Add API functions**

Add these exports to `apps/web/src/api/user.ts`:
```typescript
export const createToken = (data: { name: string; expiresAt: number }) =>
  axios.post('/user/tokens', data);

export const getTokens = () => axios.get('/user/tokens');

export const revokeToken = (id: string) => axios.delete(`/user/tokens/${id}`);
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/api/user.ts
git commit -m "feat(web): add token API functions"
```

---

## Chunk 9: Frontend - API Token Settings Page

### Task 10: Create API Token settings page

**Files:**
- Create: `apps/web/src/pages/settings/api-tokens.tsx`

- [ ] **Step 1: Create settings page**

Create a React component that:
1. Lists all tokens with name, created date, expires date, status
2. Has "Create Token" button that opens a modal
3. Modal has name input and expiry select dropdown (7d, 30d, 90d, 365d, never)
4. After creation, shows the raw token with copy button - user must save it
5. Each token row has "Revoke" button

```tsx
// apps/web/src/pages/settings/api-tokens.tsx
import { useState, useEffect } from 'react';
import { getTokens, createToken, revokeToken } from '@/api/user';

const EXPIRY_OPTIONS = [
  { label: '7 天', value: 7 * 24 * 60 * 60 * 1000 },
  { label: '30 天', value: 30 * 24 * 60 * 60 * 1000 },
  { label: '90 天', value: 90 * 24 * 60 * 60 * 1000 },
  { label: '365 天', value: 365 * 24 * 60 * 60 * 1000 },
  { label: '永不过期', value: 0 },
];

export function ApiTokensPage() {
  const [tokens, setTokens] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newToken, setNewToken] = useState(null);
  const [form, setForm] = useState({ name: '', expiresAt: 0 });

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    const res = await getTokens();
    setTokens(res.data.tokens);
  };

  const handleCreate = async () => {
    const res = await createToken({
      name: form.name,
      expiresAt: form.expiresAt,
    });
    setNewToken(res.data.token);
    setShowModal(false);
    loadTokens();
  };

  const handleRevoke = async (id) => {
    await revokeToken(id);
    loadTokens();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">API Token</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          创建 Token
        </button>
      </div>

      {newToken && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800 mb-2">
            Token 已创建，请妥善保管，关闭后无法再次查看：
          </p>
          <code className="block bg-white p-2 rounded border font-mono text-sm break-all">
            {newToken}
          </code>
          <button
            onClick={() => setNewToken(null)}
            className="mt-2 text-sm text-yellow-600 hover:underline"
          >
            关闭
          </button>
        </div>
      )}

      <div className="space-y-3">
        {tokens.map((token) => (
          <div key={token.id} className="p-4 border rounded flex justify-between items-center">
            <div>
              <div className="font-medium">{token.name}</div>
              <div className="text-sm text-gray-500">
                创建于 {new Date(token.createdAt).toLocaleDateString()}
                {token.expiresAt > 0 ? ` · 过期于 ${new Date(token.expiresAt).toLocaleDateString()}` : ' · 永不过期'}
              </div>
              <div className="text-sm">
                状态: <span className={token.isActive ? 'text-green-600' : 'text-red-600'}>
                  {token.isActive ? (token.isExpired ? '已过期' : '有效') : '已失效'}
                </span>
              </div>
            </div>
            {token.isActive && (
              <button
                onClick={() => handleRevoke(token.id)}
                className="px-3 py-1 text-red-600 border border-red-600 rounded hover:bg-red-50"
              >
                失效
              </button>
            )}
          </div>
        ))}
        {tokens.length === 0 && (
          <div className="text-center text-gray-500 py-8">暂无 Token</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-lg font-semibold mb-4">创建 API Token</h2>
            <div className="mb-4">
              <label className="block text-sm mb-1">名称</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="例如: My API Token"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm mb-1">有效期</label>
              <select
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: Number(e.target.value) })}
                className="w-full border rounded px-3 py-2"
              >
                {EXPIRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.name}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Register route**

Add route to the settings router (check how other settings routes are registered).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/settings/api-tokens.tsx
git commit -m "feat(web): add API Token settings page"
```

---

## Chunk 10: Integration Test

### Task 11: Test the complete flow

- [ ] **Step 1: Start server and create token via API**

```bash
# Login and get JWT token first
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Use JWT to create a personal token
curl -X POST http://localhost:3000/api/v1/user/tokens \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Token","expiresAt":0}'

# Use personal token to access protected endpoint
curl http://localhost:3000/api/v1/user/info \
  -H "Authorization: Bearer aimo_tk_<TOKEN>"
```

- [ ] **Step 2: Verify token appears in settings page**

- [ ] **Step 3: Revoke token and verify it no longer works**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: add personal API token integration tests"
```
