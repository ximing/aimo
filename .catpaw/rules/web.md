---
ruleType: Always
---

## Web 前端技术栈

### 核心框架和构建工具

- **框架**: React 19.2.0 - 用户界面库
- **构建**: Vite 7.3.1 - 现代前端构建工具
- **语言**: TypeScript ~5.9.3 - 类型安全的 JavaScript 超集
- **路由**: react-router 7.13.0 - 声明式路由管理

### UI 框架和样式

- **CSS 框架**: Tailwind CSS 3.4.17 - 实用优先的 CSS 框架
- **PostCSS**: 8.5.6 - CSS 转换工具
- **Autoprefixer**: 10.4.24 - 自动添加浏览器前缀
- **UI 组件库**: @headlessui/react 2.2.9 - 无头 UI 组件

### 状态管理

- **响应式状态管理**: @rabjs/react 9.0.0 - 基于响应式的状态管理方案
  - 用于管理应用全局状态
  - 在 \*.service.ts 中定义状态和逻辑
  - 遵循页面级组件服务管理模式

### HTTP 请求

- **HTTP 客户端**: axios 1.13.5 - Promise 基础的 HTTP 请求库

### 共享代码

- **DTO 包**: @aimo/dto (workspace:\*) - 共享数据传输对象
  - 认证相关 DTO
  - 用户相关 DTO
  - 笔记/备忘录 DTO
  - 响应格式 DTO

### 开发工具

- **代码检查**: ESLint 9.39.1 - 代码质量检查
  - @eslint/js 9.39.1 - ESLint 核心规则
  - typescript-eslint 8.48.0 - TypeScript 支持
  - eslint-plugin-react-hooks 7.0.1 - React Hooks 最佳实践
  - eslint-plugin-react-refresh 0.4.24 - React Refresh 支持
- **Vite 插件**: @vitejs/plugin-react 5.1.1 - React 快速刷新

### 类型定义

- @types/react 19.2.7 - React 类型定义
- @types/react-dom 19.2.3 - React DOM 类型定义
- @types/node 24.10.1 - Node 类型定义
- globals 16.5.0 - 全局类型定义

### 项目结构 (Web)

```
apps/web/
├── src/
│   ├── api/                    # API 请求模块
│   ├── components/             # 可复用组件
│   ├── pages/                  # 页面组件
│   │   ├── auth/
│   │   │   └── components/    # 认证相关子组件
│   │   └── home/
│   │       └── components/    # 首页相关子组件
│   ├── services/              # 业务逻辑服务 (*.service.ts)
│   ├── utils/                 # 工具函数
│   ├── App.tsx                # 主应用组件
│   ├── main.tsx               # 入口文件
│   └── index.css              # 全局样式
├── public/                     # 静态资源
├── vite.config.ts             # Vite 配置
├── tailwind.config.js         # Tailwind 配置
├── postcss.config.js          # PostCSS 配置
├── tsconfig.json              # TypeScript 配置
└── package.json
```

### 开发规范

#### 图标规范

- **图标库**: lucide-react - 所有图标必须使用 lucide-react 库
- 不要使用其他图标库，保持项目图标库统一

#### 主题规范

- **主题支持**: 暗色和亮色两套主题
- 使用 Tailwind CSS 的 `dark:` 前缀实现主题切换
- 在样式中使用 `dark:` 前缀为暗色主题提供对应的样式
- 例如：`bg-white dark:bg-slate-900`

#### 状态管理规范

- 所有使用状态管理的场景必须使用 @rabjs/react
- 在页面级组件中统一注册 Service
- 子组件通过 Domain 机制获取 Service
- 避免在组件内重复注册 Service
- 不要使用其他状态管理方案

#### API 请求规范

- 使用 axios 进行 HTTP 请求
- 在 src/api 目录中定义 API 请求模块
- 请求函数应返回类型化的数据（使用 @aimo/dto 中的 DTO）

#### 开发脚本

- `pnpm dev` - 启动开发服务器
- `pnpm build` - 构建生产版本
- `pnpm lint` - 代码检查
- `pnpm lint:fix` - 自动修复代码
- `pnpm preview` - 预览构建结果

### 配置说明

#### Vite 代理配置

- `/api` 代理到 `http://localhost:3000` - 连接后端服务

#### Tailwind 自定义

- **颜色**: 扩展了 `primary` 颜色系列
- **动画**:
  - `fade-in` - 0.3s 淡入效果
  - `slide-up` - 0.3s 向上滑动效果
