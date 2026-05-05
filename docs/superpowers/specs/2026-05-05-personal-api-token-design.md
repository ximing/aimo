# Personal API Token 设计

## 概述

在现有 JWT 认证基础上，新增 Personal API Token 认证方式。用户可在设置页创建多个 Token，所有需要鉴权的接口均可通过 Bearer Token 方式调用。

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                     认证中间件 (auth-handler.ts)            │
│  1. 尝试 JWT Token 验证                                      │
│  2. JWT 失败 → 提取 Bearer Token → 匹配 Personal Token      │
│  3. Personal Token 验证通过 → 附加用户信息到 request.user   │
└─────────────────────────────────────────────────────────────┘
```

## 数据模型

### user_tokens 表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | VARCHAR(36) | UUID，主键 |
| user_id | VARCHAR(36) | 外键 → users.uid |
| name | VARCHAR(100) | Token 名称 |
| token | VARCHAR(255) | Token 值（bcrypt hash 存储） |
| expires_at | INT | 过期时间戳（0 = 永不过期） |
| created_at | INT | 创建时间 |
| revoked_at | INT | 失效时间（0 = 未失效） |

**索引**：
- `user_id` 上有普通索引
- `token` 上有唯一索引（用于快速查找）

## 后端改动

### 1. 新建 Token Service

**文件**: `apps/server/src/services/user-token.service.ts`

```typescript
@Service()
export class UserTokenService {
  // createToken(userId, name, expiresAt) - 创建 Token，返回原始 token
  // getTokensByUserId(userId) - 获取用户所有 Token（不含 token 值）
  // getTokenByValue(token) - 根据 token 值查找有效 Token
  // revokeToken(id, userId) - 失效 Token
}
```

**Token 生成**: `crypto.randomBytes(32).toString('hex')` 生成 64 位十六进制字符串
**存储**: 使用 bcrypt hash 存储

### 2. 认证中间件升级

**文件**: `apps/server/src/middlewares/auth-handler.ts`

修改认证逻辑：
1. 先尝试现有 JWT Token 验证
2. JWT 失败时，从 `Authorization: Bearer <token>` 提取 token
3. 调用 `UserTokenService.getTokenByValue()` 查找有效 Token
4. 验证 Token 未过期且未失效
5. 附加用户信息到 `request.user`

### 3. 新增 API 端点

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| POST | `/api/v1/user/tokens` | 创建 Token | 是 |
| GET | `/api/v1/user/tokens` | 列出 Token | 是 |
| DELETE | `/api/v1/user/tokens/:id` | 失效 Token | 是 |

**创建 Token 请求体**:
```json
{
  "name": "My API Token",
  "expiresAt": 0
}
```

**创建 Token 响应**:
```json
{
  "id": "uuid",
  "name": "My API Token",
  "token": "原始token值（只返回一次）",
  "expiresAt": 0,
  "createdAt": 1234567890
}
```

**列出 Token 响应**:
```json
{
  "tokens": [
    {
      "id": "uuid",
      "name": "My API Token",
      "expiresAt": 0,
      "createdAt": 1234567890,
      "revokedAt": 0,
      "isExpired": false,
      "isActive": true
    }
  ]
}
```

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
- 列出用户所有 Token（名称、创建时间、过期时间、状态）
- 创建 Token 按钮 → 弹出表单（输入名称、选择有效期）
- 失效按钮（每个 Token 行）
- 创建后显示原始 Token 值，提示用户保存

### 3. API 层

**文件**: `apps/web/src/api/user/token.ts`

```typescript
// 创建 Token
export const createToken = (data: { name: string; expiresAt: number }) =>
  axios.post('/user/tokens', data);

// 获取 Token 列表
export const getTokens = () => axios.get('/user/tokens');

// 失效 Token
export const revokeToken = (id: string) => axios.delete(`/user/tokens/${id}`);
```

## 有效期选项

| 选项 | expiresAt 值 |
|---|---|
| 7 天 | `now + 7*24*60*60*1000` |
| 30 天 | `now + 30*24*60*60*1000` |
| 90 天 | `now + 90*24*60*60*1000` |
| 365 天 | `now + 365*24*60*60*1000` |
| 永不过期 | `0` |

前端用下拉选择。

## 错误处理

| 场景 | 错误码 | 说明 |
|---|---|---|
| Token 不存在 | `TOKEN_NOT_FOUND` | 404 |
| Token 已失效 | `TOKEN_REVOKED` | 401 |
| Token 已过期 | `TOKEN_EXPIRED` | 401 |
| 无权操作 | `FORBIDDEN` | 403（尝试操作他人 Token） |

## 安全性

1. Token 值只返回一次（创建时），后续查询不返回
2. 存储使用 bcrypt hash
3. 每个 Token 只能被其创建者操作
4. 支持随时失效
5. 过期 Token 自动失效（查询时检查）
