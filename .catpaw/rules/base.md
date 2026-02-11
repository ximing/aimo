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
