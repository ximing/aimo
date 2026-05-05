# Personal API Token 设计

## 概述

在现有 JWT 认证基础上，新增 Personal API Token 认证方式。用户可在设置页创建多个 Token，所有需要鉴权的接口均可通过 Bearer Token 方式调用。

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                     认证中间件 (auth-handler.ts)            │
│  1. 尝试 JWT Token 验证                                      │
│  2. JWT 失败 → 提取 Bearer Token → 查找 tokenKey hash        │
│  3. Token 验证通过 → 附加用户信息到 request.user             │
└─────────────────────────────────────────────────────────────┘
```

**Token 存储策略**：使用 dual-hash 方案
- `tokenKey`: SHA-256 hash of original token，用于快速查找（唯一索引）
- `tokenHash`: bcrypt hash，用于校验（防止彩虹表攻击）
- 原始 token 只在创建时返回一次

## 数据模型

### user_tokens 表

**文件**: `apps/server/src/db/schema/user-tokens.ts`

| 字段 | 类型 | 说明 |
|---|---|---|
| id | VARCHAR(36) | UUID，主键 |
| userId | VARCHAR(36) | 外键 → users.uid |
| name | VARCHAR(100) | Token 名称 |
| tokenKey | VARCHAR(64) | SHA-256(token)，唯一索引 |
| tokenHash | VARCHAR(255) | bcrypt hash，用于校验 |
| expiresAt | TIMESTAMP(3) | 过期时间戳（NULL = 永不过期） |
| createdAt | TIMESTAMP(3) | 创建时间 |
| revokedAt | TIMESTAMP(3) | 失效时间（NULL = 未失效） |

**索引**：
- `tokenKey` 上有唯一索引
- `userId` 上有普通索引

## 后端改动

### 1. 新建 Schema 文件

**文件**: `apps/server/src/db/schema/user-tokens.ts`

```typescript
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

导出添加到 `apps/server/src/db/schema/index.ts`

### 2. 新建 DTO 文件

**文件**: `packages/dto/src/user-token.ts`

```typescript
export class CreateUserTokenDto {
  name: string;        // 1-100 字符
  expiresAt: number;   // 毫秒时间戳，0 = 永不过期
}

export class UserTokenResponseDto {
  id: string;
  name: string;
  token?: string;       // 创建时返回原始值
  expiresAt: number;
  createdAt: number;
  revokedAt: number;
  isExpired: boolean;
  isActive: boolean;
}

export class UserTokenListResponseDto {
  tokens: UserTokenResponseDto[];
}
```

### 3. 新建 Token Service

**文件**: `apps/server/src/services/user-token.service.ts`

```typescript
@Service()
export class UserTokenService {
  constructor(
    private db: ReturnType<typeof getDatabase>,
  ) {}

  // 创建 Token（返回原始 token）
  async createToken(userId: string, name: string, expiresAt: number): Promise<{ token: string; id: string }> {
    const token = `aimo_tk_${crypto.randomBytes(32).toString('hex')}`;
    const tokenKey = crypto.createHash('sha256').update(token).digest('hex');
    const tokenHash = await bcrypt.hash(token, 10);

    // ... 插入数据库
    return { token, id };
  }

  // 根据 tokenKey 查找有效 Token
  async getTokenByKey(tokenKey: string): Promise<UserToken | null> {
    // ... 查询并验证未过期、未失效
  }

  // 获取用户所有 Token（不含敏感信息）
  async getTokensByUserId(userId: string): Promise<UserTokenResponseDto[]> {}

  // 失效 Token
  async revokeToken(id: string, userId: string): Promise<void> {}
}
```

### 4. 认证中间件升级

**文件**: `apps/server/src/middlewares/auth-handler.ts`

```typescript
// 提取 Bearer Token
const authHeader = request.headers.authorization;
if (authHeader?.startsWith('Bearer ')) {
  const token = authHeader.slice(7);
  const tokenKey = crypto.createHash('sha256').update(token).digest('hex');
  const userToken = await userTokenService.getTokenByKey(tokenKey);
  if (userToken && userToken.user) {
    request.user = userToken.user;
  }
}
```

### 5. 新建 Controller

**文件**: `apps/server/src/controllers/v1/user-token.controller.ts`

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/tokens` | 创建 Token |
| GET | `/tokens` | 列出 Token |
| DELETE | `/tokens/:id` | 失效 Token |

### 6. 错误码

**文件**: `apps/server/src/constants/error-codes.ts`

添加新错误码：
```typescript
TOKEN_NOT_FOUND: 1004,
TOKEN_REVOKED: 1005,
```

复用现有 `TOKEN_EXPIRED: 1003`。

## 前端改动

### 1. 设置菜单新增 "API Token" 项

**文件**: `apps/web/src/pages/settings/components/settings-menu.tsx`

添加菜单项:
```typescript
{ id: 'api-tokens', label: 'API Token', route: '/settings/api-tokens' }
```

### 2. 新建 API Token 设置页面

**文件**: `apps/web/src/pages/settings/api-tokens.tsx`

功能:
- 列出用户所有 Token
- 创建 Token 按钮 → 弹出表单
- 失效按钮
- 创建后显示原始 Token

### 3. API 层

**文件**: `apps/web/src/api/user.ts`（扩展现有文件）

```typescript
export const createToken = (data: CreateUserTokenDto) =>
  axios.post('/user/tokens', data);

export const getTokens = () => axios.get('/user/tokens');

export const revokeToken = (id: string) => axios.delete(`/user/tokens/${id}`);
```

## 有效期选项

| 选项 | expiresAt 值 |
|---|---|
| 7 天 | `Date.now() + 7*24*60*60*1000` |
| 30 天 | `Date.now() + 30*24*60*60*1000` |
| 90 天 | `Date.now() + 90*24*60*60*1000` |
| 365 天 | `Date.now() + 365*24*60*60*1000` |
| 永不过期 | `0` |

## 实现步骤

1. 创建 schema: `apps/server/src/db/schema/user-tokens.ts`
2. 导出到 `schema/index.ts`
3. 构建: `cd apps/server && pnpm build`
4. 生成迁移: `cd apps/server && pnpm migrate:generate`
5. 创建 DTO: `packages/dto/src/user-token.ts`
6. 构建 DTO: `pnpm --filter @aimo/dto build`
7. 创建 Service: `apps/server/src/services/user-token.service.ts`
8. 创建 Controller: `apps/server/src/controllers/v1/user-token.controller.ts`
9. 注册 Controller: 在 controllers index 中添加
10. 更新 Middleware: `apps/server/src/middlewares/auth-handler.ts`
11. 添加错误码: `apps/server/src/constants/error-codes.ts`
12. 前端: 添加设置菜单项
13. 前端: 创建 API Token 设置页面
14. 前端: 扩展 `apps/web/src/api/user.ts`

## 安全性

1. Token 值只返回一次（创建时），后续查询不返回
2. 存储使用 SHA-256（查找）+ bcrypt（校验）双哈希
3. 每个 Token 只能被其创建者操作
4. 支持随时失效
5. 过期 Token 自动失效（查询时检查）
6. Token 前缀 `aimo_tk_` 便于识别
