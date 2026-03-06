# 用户注册控制功能

## 概述

通过环境变量 `ALLOW_REGISTRATION` 控制系统是否允许新用户注册，支持服务端校验和前端 UI 控制。

## 配置

### 环境变量

在 `.env` 文件中添加：

```bash
# 是否允许用户注册（默认为 true）
ALLOW_REGISTRATION=true
```

- `true` - 允许用户注册（默认值）
- `false` - 禁止用户注册

## 实现细节

### 1. 后端实现

#### 配置层 (`apps/server/src/config/config.ts`)

```typescript
auth: {
  allowRegistration: process.env.ALLOW_REGISTRATION !== 'false', // 默认允许注册
}
```

#### 系统配置接口 (`apps/server/src/controllers/v1/system.controller.ts`)

新增公共接口返回系统配置：

```typescript
@Get('/config')
async getConfig() {
  return ResponseUtility.success({
    allowRegistration: config.auth.allowRegistration,
  });
}
```

- 路径：`GET /api/v1/system/open/config`
- 权限：公开接口，无需认证
- 返回：`{ allowRegistration: boolean }`

#### 注册接口校验 (`apps/server/src/controllers/v1/auth.controller.ts`)

在注册接口中添加校验：

```typescript
@Post('/register')
async register(@Body() userData: RegisterDto) {
  // 检查是否允许注册
  if (!config.auth.allowRegistration) {
    return ResponseUtility.error(
      ErrorCode.OPERATION_NOT_ALLOWED,
      'Registration is currently disabled'
    );
  }
  // ... 其他注册逻辑
}
```

#### 错误码 (`apps/server/src/constants/error-codes.ts`)

新增错误码：

```typescript
OPERATION_NOT_ALLOWED: 6,  // 操作不被允许
```

### 2. 前端实现

#### API 层 (`apps/web/src/api/system.ts`)

新增获取系统配置的 API：

```typescript
export const getSystemConfig = () => {
  return request.get<unknown, { code: number; msg: string; data: { allowRegistration: boolean } }>(
    '/api/v1/system/open/config'
  );
};
```

#### UI 层 (`apps/web/src/pages/auth/auth.tsx`)

- 页面加载时获取系统配置
- 根据 `allowRegistration` 控制注册入口显示/隐藏
- 如果注册被禁用且用户在注册页面，自动跳转到登录页面

```typescript
// 获取系统配置
useEffect(() => {
  const fetchConfig = async () => {
    const response = await getSystemConfig();
    if (response.code === 0) {
      setAllowRegistration(response.data.allowRegistration);
      // 如果注册被禁用且在注册页面，跳转到登录
      if (!response.data.allowRegistration && !isLogin) {
        navigate('/auth?mode=login', { replace: true });
      }
    }
  };
  fetchConfig();
}, [isLogin, navigate]);

// 条件渲染注册入口
{allowRegistration && (
  <div className="mt-6 text-center">
    <button onClick={...}>
      {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
    </button>
  </div>
)}
```

## 使用场景

### 场景 1: 完全开放注册（默认）

```bash
# .env
ALLOW_REGISTRATION=true
# 或者不设置（默认为 true）
```

- 用户可以正常访问注册页面
- 注册接口正常工作
- 登录页面显示"注册"入口

### 场景 2: 禁止注册

```bash
# .env
ALLOW_REGISTRATION=false
```

- 登录页面隐藏"注册"入口
- 直接访问注册页面会自动跳转到登录页面
- 调用注册接口返回错误：`{ code: 6, msg: "Registration is currently disabled" }`

### 场景 3: 内部部署/私有化场景

适用于企业内部部署，只允许管理员创建账户：

1. 设置 `ALLOW_REGISTRATION=false`
2. 管理员通过数据库直接创建用户账户
3. 普通用户只能登录，无法自行注册

## 安全性

### 多层防护

1. **前端 UI 控制**：隐藏注册入口，提升用户体验
2. **前端路由拦截**：访问注册页面自动跳转到登录页
3. **后端接口校验**：即使绕过前端，后端也会拒绝注册请求

### 防止绕过

即使用户通过以下方式尝试注册，也会被后端拦截：

- 直接访问 `/auth?mode=register`
- 使用 API 工具直接调用 `/api/v1/auth/register`
- 修改前端代码

所有这些尝试都会收到 `OPERATION_NOT_ALLOWED` 错误。

## 测试

### 测试允许注册

```bash
# 1. 设置环境变量
echo "ALLOW_REGISTRATION=true" >> .env

# 2. 启动服务
pnpm dev

# 3. 验证
# - 访问 http://localhost:5173/auth
# - 应该能看到"注册"入口
# - 可以正常注册新用户
```

### 测试禁止注册

```bash
# 1. 设置环境变量
echo "ALLOW_REGISTRATION=false" >> .env

# 2. 启动服务
pnpm dev

# 3. 验证
# - 访问 http://localhost:5173/auth
# - 看不到"注册"入口
# - 访问 http://localhost:5173/auth?mode=register 会自动跳转到登录页
# - 直接调用注册 API 会返回错误
```

### API 测试

```bash
# 1. 获取系统配置
curl http://localhost:3000/api/v1/system/open/config

# 预期响应（允许注册）：
# {
#   "code": 0,
#   "msg": "Success",
#   "data": {
#     "allowRegistration": true
#   }
# }

# 2. 尝试注册（当 ALLOW_REGISTRATION=false 时）
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'

# 预期响应（禁止注册）：
# {
#   "code": 6,
#   "msg": "Registration is currently disabled",
#   "data": null
# }
```

## 文件变更清单

### 后端

- ✅ `.env.example` - 添加 `ALLOW_REGISTRATION` 环境变量说明
- ✅ `apps/server/src/config/config.ts` - 添加 `auth.allowRegistration` 配置
- ✅ `apps/server/src/constants/error-codes.ts` - 添加 `OPERATION_NOT_ALLOWED` 错误码
- ✅ `apps/server/src/controllers/v1/system.controller.ts` - 添加 `/config` 接口
- ✅ `apps/server/src/controllers/v1/auth.controller.ts` - 添加注册校验

### 前端

- ✅ `apps/web/src/api/system.ts` - 添加 `getSystemConfig` API
- ✅ `apps/web/src/pages/auth/auth.tsx` - 添加配置获取和 UI 控制

## 未来扩展

可以基于此功能继续扩展：

1. **邀请码注册**：即使禁止公开注册，也可以通过邀请码注册
2. **注册审核**：允许注册但需要管理员审核
3. **注册限流**：限制每天/每小时的注册数量
4. **域名白名单**：只允许特定邮箱域名注册（如 @company.com）
5. **更多配置项**：通过 `/api/v1/system/config` 返回更多公开配置
