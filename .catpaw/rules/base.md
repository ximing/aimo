---
ruleType: Always
---

<constraint>
pnpm workspace仓库，安装 npm 包 使用 pnpm
</constraint>
<constraint>
网络请求使用 urllib 库
</constraint>
<constraint>
符合SOILD原则
同时如无必要勿增实体，不要过度设计
</constraint>

## 项目结构

```
aimo/
├── apps/                          # 应用程序
│   ├── server/                    # 后端服务（Node.js + Express）
│   │   ├── src/
│   │   │   ├── config/            # 环境和配置管理
│   │   │   ├── constants/         # 常量定义（错误码等）
│   │   │   ├── controllers/       # 路由控制器
│   │   │   │   └── v1/           # API v1 版本
│   │   │   ├── middlewares/       # Express 中间件
│   │   │   ├── models/            # 数据模型和 schema
│   │   │   ├── services/          # 业务逻辑服务
│   │   │   ├── sources/           # 数据源（LanceDB 连接）
│   │   │   ├── types/             # TypeScript 类型定义
│   │   │   ├── utils/             # 工具函数
│   │   │   ├── index.ts           # 入口文件
│   │   │   ├── app.ts             # Express 应用初始化
│   │   │   └── ioc.ts             # IOC 容器配置
│   │   └── package.json
│   │
│   └── web/                       # 前端应用（React + Vite）
│       ├── src/
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   ├── assets/            # 静态资源
│       │   └── index.css
│       ├── public/                # 公共文件
│       └── package.json
│
├── packages/                      # 公共包
│   └── dto/                       # 数据传输对象（DTO）- 共享代码
│       ├── src/
│       │   ├── auth.ts            # 认证 DTO
│       │   ├── user.ts            # 用户 DTO
│       │   ├── memo.ts            # 笔记 DTO
│       │   ├── response.ts        # 响应 DTO
│       │   └── index.ts           # 统一导出
│       ├── dist/                  # 构建输出
│       └── package.json
│
├── config/                        # 共享配置
│   ├── config-typescript/         # TypeScript 配置
│   ├── eslint-config/             # ESLint 配置
│   ├── jest-presets/              # Jest 预设
│   │   ├── browser/
│   │   └── node/
│   └── rollup-config/             # Rollup 打包配置
│

├── .github/                       # GitHub 配置
│   └── workflows/                 # CI/CD 工作流
│
├── docs/                          # 文档
├── package.json                   # 根 workspace 配置
├── pnpm-workspace.yaml           # pnpm workspace 配置
├── turbo.json                     # Turbo 配置
└── tsconfig.json                  # 根 TypeScript 配置
```

## 核心技术栈

### 后端 (Server)

- **运行时**: Node.js + TypeScript
- **框架**: Express.js
- **路由**: routing-controllers
- **依赖注入**: TypeDI
- **数据库**: LanceDB (向量数据库)
- **向量化**: @ai-sdk/openai
- **认证**: JWT + bcrypt
- **构建**: TypeScript (tsc)

### 前端 (Web)

- **框架**: React 19
- **构建**: Vite
- **语言**: TypeScript
- **共享代码**: @aimo/dto

### 共享层

- **DTO 包**: @aimo/dto (认证、用户、笔记、响应)
- **配置**: 共享的 TypeScript、ESLint、Jest 配置
- **打包**: Rollup 用于库构建

## 主要特性

### 后端 API

- ✅ **多账号认证**: 注册、登录（JWT + Cookie）
- ✅ **用户管理**: 获取和更新用户信息
- ✅ **笔记 CRUD**: 创建、读取、更新、删除笔记
- ✅ **向量搜索**: 基于 embedding 的语义搜索
- ✅ **自动 embedding**: 笔记创建/更新时自动生成向量

### 数据存储

- **用户数据**: LanceDB
- **笔记数据**: LanceDB （含 embedding）
- **向量维度**: 1536 (text-embedding-3-small)

## 数据库迁移规范

### 核心原则

**所有数据库表结构的变化都必须通过迁移脚本实现，禁止直接修改表结构。**

<constraint>
任何数据库架构变化（包括但不限于：添加表、添加字段、删除字段、修改字段、创建索引等）都必须：
1. 创建迁移脚本文件 (apps/server/src/migrations/scripts/NNN-description.ts)
2. 实现 Migration 接口
3. 在 scripts/index.ts 中导出并注册
4. 不允许在其他地方直接操作表结构
</constraint>

### 迁移系统架构

**位置**: `apps/server/src/migrations/`

**核心文件**:
- `index.ts` - MigrationManager（主协调器）
- `executor.ts` - MigrationExecutor（执行引擎）
- `types.ts` - 类型定义
- `scripts/` - 迁移脚本存放目录
- `README.md` - 详细使用文档
- `ARCHITECTURE.md` - 系统设计文档
- `QUICK_START.md` - 快速入门指南

### 迁移脚本编写规范

**文件命名**:
```
scripts/NNN-description.ts
# 例如: 001-init.ts, 002-create-indexes.ts, 003-add-tags.ts
```

**必须实现的接口**:
```typescript
export const myMigration: Migration = {
  version: number;              // 版本号 (1, 2, 3, ...)
  tableName: string;            // 受影响的表名
  description?: string;         // 变更描述
  up: async (connection) => {}  // 迁移逻辑
};
```

**注册位置**:
在 `scripts/index.ts` 中导出并添加到 `ALL_MIGRATIONS` 数组

### 迁移执行流程

1. **应用启动** → LanceDbService.init()
2. **运行迁移** → MigrationManager.initialize(connection)
3. **检查元数据** → 读取 table_migrations 表获取当前版本
4. **比较版本** → 对比当前版本与目标版本
5. **执行迁移** → 串行执行所有待迁移脚本
6. **更新元数据** → 记录新的版本号和迁移时间戳

### 常见变更场景

**场景 1: 添加新字段**
```typescript
// 1. 更新 schema (apps/server/src/models/db/schema.ts)
export const memosSchema = new Schema([
  // ... 现有字段 ...
  new Field('newField', new Utf8(), true), // 添加新字段
]);

// 2. 创建迁移脚本
export const addNewFieldMigration: Migration = {
  version: 3,
  tableName: 'memos',
  description: 'Add newField to memos table',
  up: async (connection) => {
    const table = await connection.openTable('memos');
    const records = await table.query().toArray();
    const updated = records.map(r => ({ ...r, newField: 'default_value' }));
    for (const record of records) {
      await table.delete(`memoId = '${record.memoId}'`);
    }
    await table.add(updated);
  },
};
```

**场景 2: 创建新表**
```typescript
export const createNewTableMigration: Migration = {
  version: 4,
  tableName: 'new_table',
  description: 'Create new_table',
  up: async (connection) => {
    const schema = new Schema([
      new Field('id', new Utf8(), false),
      // ... 其他字段 ...
    ]);
    await connection.createEmptyTable('new_table', schema);
  },
};
```

**场景 3: 创建索引**
```typescript
export const createIndexMigration: Migration = {
  version: 5,
  tableName: 'table_name',
  description: 'Create indexes for performance',
  up: async (connection) => {
    const table = await connection.openTable('table_name');
    try {
      await table.createIndex('columnName', { config: lancedb.Index.btree() });
    } catch (error) {
      // 索引可能已存在，忽略
      console.debug('Index already exists');
    }
  },
};
```

### 最佳实践

1. **版本号连续** - 版本号必须连续递增（1, 2, 3, ...）
2. **独立性** - 每个迁移应该是独立的、可重复的
3. **错误处理** - 迁移失败会停止执行，不会更新元数据
4. **大表性能** - 大表操作考虑分批处理
5. **向前迁移** - 迁移只支持向前，不支持回滚
6. **测试验证** - 在开发环境充分测试后再合并

### 元数据表结构

**表名**: `table_migrations`

**字段**:
| 字段 | 类型 | 说明 |
|------|------|------|
| tableName | string | 表名 |
| currentVersion | number | 当前版本号 |
| lastMigratedAt | number | 最后迁移时间戳 |

### 注意事项

⚠️ **LanceDB 限制**:
- 不支持 ALTER TABLE，修改字段需要删除重建
- 不支持复合索引，只能创建单列索引

⚠️ **版本管理**:
- 不允许修改已发布的迁移脚本
- 新需求必须创建新版本
- 版本号全局递增，不能跳过

⚠️ **生产环保**:
- 大量数据迁移提前备份
- 关键迁移先在测试环境验证
- 监控迁移执行日志
