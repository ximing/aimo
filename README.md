# 🚀 AIMO - AI Memo 智能笔记系统

[![CI](https://github.com/ximing/aimo/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/ximing/aimo/actions/workflows/ci.yml)
[![Docker Build and Publish](https://github.com/ximing/aimo/actions/workflows/docker-publish.yml/badge.svg?branch=master)](https://github.com/ximing/aimo/actions/workflows/docker-publish.yml)
![Node.js](https://img.shields.io/badge/Node.js-20+-green)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)
![License](https://img.shields.io/badge/License-BSL%201.1-blue)
![GitHub repo size](https://img.shields.io/github/repo-size/ximing/aimo?color=green)
![GitHub last commit](https://img.shields.io/github/last-commit/ximing/aimo?color=blue)

一个现代化的 AI 驱动的笔记和知识管理系统，融合了强大的向量搜索、智能分类、和丰富的交互功能。

## 📋 目录

- [项目简介](#项目简介)
- [核心功能](#核心功能)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [Docker 部署](#docker-部署)
- [项目结构](#项目结构)
- [API 文档](#api-文档)
- [配置指南](#配置指南)
- [常见问题](#常见问题)
- [许可证](#许可证)
- [支持与反馈](#支持与反馈)

## 项目简介

**AIMO** 是一个全栈应用，提供了一个优雅的、高性能的笔记管理平台。它利用 AI 技术为用户提供智能搜索、语义理解和知识管理能力。

### 🎯 使用场景

- 📝 **个人知识库**：管理和搜索个人笔记和资料
- 🔍 **语义搜索**：基于含义而非关键词的搜索
- 📊 **数据分析**：向量化和分类存储结构化数据
- 🎨 **创意工具**：组织灵感和创意内容

## 核心功能

### ✨ 用户功能

#### 认证与用户管理

- ✅ **用户注册/登录** - 支持邮箱或用户名
- ✅ **JWT 认证** - 安全的令牌-based 认证
- ✅ **用户资料** - 头像、昵称、简介等
- ✅ **密码加密** - 使用 bcrypt 安全存储

#### 笔记管理

- ✅ **CRUD 操作** - 完整的创建、读取、更新、删除功能
- ✅ **富文本编辑** - 支持标题、内容、标签
- ✅ **颜色标签** - 10+ 种彩色背景主题
- ✅ **版本控制** - 笔记修改历史追踪
- ✅ **批量操作** - 批量删除、导出、导入

#### 智能搜索 (向量搜索)

- ✅ **语义搜索** - 基于 OpenAI Embedding 的智能搜索
- ✅ **模糊匹配** - 标题和内容的模糊搜索
- ✅ **标签过滤** - 按标签快速筛选
- ✅ **全文搜索** - 强大的全文检索能力
- ✅ **搜索历史** - 记录搜索历史便于快速访问

#### 分类管理

- ✅ **自定义分类** - 创建和管理笔记分类
- ✅ **分类树形结构** - 支持多级分类
- ✅ **快速分类** - 快捷导航和快速分类

#### 关系与推荐

- ✅ **相关笔记推荐** - 基于语义相似度推荐
- ✅ **引用关系** - 笔记之间的关系管理
- ✅ **关联搜索** - 查看相关内容

#### 附件管理

- ✅ **文件上传** - 支持多种文件格式
- ✅ **预览** - 图片和文档预览
- ✅ **CDN 支持** - 使用 S3 存储大型附件
- ✅ **链接分享** - 预签名 URL 分享

#### 数据交换

- ✅ **导出功能** - 导出为 ZIP / JSON / CSV
- ✅ **导入功能** - 支持导入多种格式
- ✅ **备份系统** - 自动和手动备份
- ✅ **S3 备份** - 云端备份支持

#### 可视化功能

- ✅ **图片库** - 笔记中图片的集中展示
- ✅ **AI 探索** - 基于 AI 的内容探索
- ✅ **统计信息** - 笔记数量、大小等统计

### 🛠️ 技术特性

#### 后端特性

- 🏗️ **完整的 REST API** - RESTful API 设计
- 🗄️ **LanceDB 向量数据库** - 高性能向量存储
- 🔐 **JWT 安全认证** - 令牌-based 认证机制
- 📦 **自动 Embedding** - 笔记创建/更新时自动生成向量
- 🔄 **事务支持** - 数据一致性保证
- 📊 **数据库优化** - 自动索引和优化定时任务
- 🌐 **CORS 支持** - 跨域资源共享
- 🛡️ **安全中间件** - Helmet、CSRF 保护等
- 📈 **速率限制** - API 请求限流
- 📝 **日志系统** - Morgan 请求日志记录

#### 前端特性

- ⚡ **React 19** - 最新的 React 版本
- 🎨 **Tailwind CSS** - Utility-first CSS 框架
- 🗂️ **React Router** - 客户端路由
- 📱 **响应式设计** - 完整的响应式布局
- 🎭 **暗黑主题** - 原生暗黑模式支持
- 🔄 **状态管理** - @rabjs/react 响应式状态管理
- 📡 **Axios HTTP 客户端** - Promise-based HTTP 请求
- ⌨️ **快捷键** - Ctrl+K 快速搜索
- 🎯 **组件模块化** - 清晰的组件结构
- ✨ **动画过渡** - 流畅的 UI 交互

## 快速开始

### 前置要求

- **Node.js** >= 20.0 (推荐 20.x LTS)
- **pnpm** >= 10.0 (包管理器)
- **OpenAI API Key** (用于 Embedding)
- **Docker** (可选，用于容器化部署)

### 本地开发

#### 1️⃣ 克隆项目

```bash
git clone https://github.com/your-org/aimo.git
cd aimo
```

#### 2️⃣ 安装依赖

```bash
# 安装所有依赖
pnpm install
```

#### 3️⃣ 配置环境变量

```bash
# 复制示例环境文件
cp .env.example .env

# 编辑 .env 文件，填入必需配置
nano .env
```

**必需的环境变量：**

```env
# JWT 密钥 (至少 32 个字符)
JWT_SECRET=your-super-secret-key-at-least-32-characters-long

# OpenAI API 密钥 (用于 Embedding)
OPENAI_API_KEY=sk-xxx...

# CORS 源
CORS_ORIGIN=http://localhost:3000

# 本地化设置
LOCALE_LANGUAGE=zh-cn
LOCALE_TIMEZONE=Asia/Shanghai
```

#### 4️⃣ 启动开发服务器

```bash
# 同时启动后端和前端
pnpm dev

# 或者分别启动
pnpm dev:server  # 启动后端 (http://localhost:3000)
pnpm dev:web     # 启动前端 (http://localhost:5173)
```

#### 5️⃣ 访问应用

打开浏览器访问：http://localhost:3000

### 常用开发命令

```bash
# 构建应用
pnpm build                # 构建前后端
pnpm build:web            # 只构建前端
pnpm build:server         # 只构建后端

# 代码检查
pnpm lint                 # ESLint 检查
pnpm lint:fix             # 自动修复

# 代码格式化
pnpm format               # Prettier 格式化

# 清理构建产物
pnpm clean                # 清理 dist
pnpm rm                   # 删除所有 node_modules

# 本地开发环境
pnpm dev:env              # 启动 Docker 依赖 (开发用数据库等)
```

## Docker 部署

### 📦 预构建镜像

项目提供了预构建的 Docker 镜像，可以直接使用：

```bash
# 从 GitHub Container Registry 拉取
docker pull ghcr.io/ximing/aimo:stable

# 或使用最新版本
docker pull ghcr.io/ximing/aimo:latest
```

### 🏗️ 快速部署

#### 方式 1: Docker Compose (推荐)

最简单的方式，一条命令即可启动：

```bash
# 1. 克隆项目
git clone https://github.com/your-org/aimo.git
cd aimo

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入 JWT_SECRET 和 OPENAI_API_KEY

# 3. 启动服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f app

# 5. 停止服务
docker-compose down
```

**docker-compose.yml 配置说明：**

```yaml
services:
  app:
    image: ghcr.io/ximing/aimo:stable
    ports:
      - '3000:3000'
    volumes:
      # 数据库持久化
      - ./data/lancedb:/app/lancedb_data
      # 附件存储
      - ./data/attachments:/app/attachments
      # 备份存储
      - ./data/backups:/app/backups
    environment:
      # 必需配置
      - NODE_ENV=production
      - PORT=3000
      - JWT_SECRET=your-secret-key
      - OPENAI_API_KEY=sk-xxx
      # 可选配置参考下面的"环境变量配置"
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000']
      interval: 30s
      timeout: 10s
      retries: 3
```

#### 方式 2: Docker Run

使用原生 Docker 命令运行：

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env

# 2. 运行容器
docker run -d \
  -p 3000:3000 \
  --name aimo-app \
  --env-file .env \
  -v $(pwd)/data/lancedb:/app/lancedb_data \
  -v $(pwd)/data/attachments:/app/attachments \
  -v $(pwd)/data/backups:/app/backups \
  --restart unless-stopped \
  ghcr.io/ximing/aimo:stable

# 3. 查看日志
docker logs -f aimo-app

# 4. 停止容器
docker stop aimo-app
docker rm aimo-app
```

#### 方式 3: 从源码构建

如果需要自定义构建：

```bash
# 1. 克隆项目
git clone https://github.com/your-org/aimo.git
cd aimo

# 2. 构建镜像
docker build -t aimo:latest .

# 3. 运行容器
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name aimo-app \
  aimo:latest

# 4. 查看日志
docker logs -f aimo-app
```

### 🔧 环境变量配置

#### 基础配置

```env
# Node 环境
NODE_ENV=production
PORT=3000

# CORS 配置
CORS_ORIGIN=http://localhost:3000  # 允许的前端源
CORS_CREDENTIALS=true               # 允许携带凭证
```

#### 认证配置

```env
# JWT 密钥 (务必修改，至少 32 个字符)
JWT_SECRET=your-production-secret-key-at-least-32-chars
```

#### LanceDB 配置

```env
# 存储类型: local (本地) 或 s3 (S3 云存储)
LANCEDB_STORAGE_TYPE=local
LANCEDB_PATH=./lancedb_data

# 版本保留天数
LANCEDB_VERSION_RETENTION_DAYS=7

# S3 配置 (可选)
# LANCEDB_S3_BUCKET=your-bucket
# LANCEDB_S3_PREFIX=lancedb
# LANCEDB_S3_ENDPOINT=https://s3.amazonaws.com
```

#### OpenAI 配置

```env
# OpenAI API 密钥
OPENAI_API_KEY=sk-xxx...

# Embedding 模型
OPENAI_MODEL=text-embedding-3-small

# API 基础 URL (可选，用于代理)
OPENAI_BASE_URL=https://api.openai.com/v1

# Embedding 维度
OPENAI_EMBEDDING_DIMENSIONS=1536
```

#### 附件存储配置

```env
# 存储类型: local 或 s3
ATTACHMENT_STORAGE_TYPE=local
ATTACHMENT_LOCAL_PATH=./attachments

# 文件限制
ATTACHMENT_MAX_FILE_SIZE=52428800  # 50MB
ATTACHMENT_PRESIGNED_URL_EXPIRY=3600  # 1小时

# S3 配置 (可选)
# ATTACHMENT_S3_BUCKET=your-bucket
# ATTACHMENT_S3_PREFIX=attachments
# ATTACHMENT_S3_ENDPOINT=https://s3.amazonaws.com
```

#### 备份配置

```env
# 备份功能
BACKUP_ENABLED=false
BACKUP_STORAGE_TYPE=local
BACKUP_LOCAL_PATH=./backups

# 备份策略
BACKUP_THROTTLE_INTERVAL_MS=3600000  # 1小时检查一次
BACKUP_MAX_COUNT=10                  # 保留最多 10 个备份
BACKUP_MAX_DAYS=30                   # 保留最多 30 天

# S3 备份配置 (可选)
# BACKUP_S3_BUCKET=your-bucket
# BACKUP_S3_PREFIX=backups
```

#### AWS 全局配置 (所有 S3 服务)

```env
# AWS 凭证 (所有 S3 服务共用)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

#### 多模态 Embedding 配置 (可选)

```env
# 启用图片/视频 Embedding
MULTIMODAL_EMBEDDING_ENABLED=false

# 阿里云 DashScope 配置
# MULTIMODAL_EMBEDDING_MODEL=qwen3-vl-embedding
# DASHSCOPE_API_KEY=your-key
# MULTIMODAL_EMBEDDING_DIMENSION=1024
```

#### 定时任务配置

```env
# 数据库优化 Cron 表达式 (每天 2 AM)
DB_OPTIMIZATION_CRON=0 2 * * *
```

#### 本地化配置

```env
# 语言
LOCALE_LANGUAGE=zh-cn

# 时区
LOCALE_TIMEZONE=Asia/Shanghai
```

## 📞 支持与反馈

- 📧 邮件：morningxm@hotmail.com
- 🐛 Issue：https://github.com/ximing/aimo/issues
- 💬 讨论：https://github.com/ximing/aimo/discussions

## 📄 许可证

**Business Source License (BSL 1.1)** - 查看 [LICENSE](./LICENSE) 文件详情

### 📋 许可证说明

本项目采用 **Business Source License (BSL 1.1)** 协议，这是一个源代码可用但有商业使用限制的协议。

#### 🟢 允许的使用方式

- ✅ **个人使用** - 个人学习、开发、测试
- ✅ **非商业用途** - 非营利性使用
- ✅ **内部使用** - 企业内部研发和测试
- ✅ **商业评估** - 评估是否购买商业许可证

#### 🔴 禁止的使用方式

- ❌ **商业服务** - 不能作为 SaaS 或托管服务提供
- ❌ **商业产品** - 不能用于构建商业产品或服务
- ❌ **商业集成** - 不能集成到商业应用中获利
- ❌ **其他商业用途** - 任何以商业目的使用的方式

#### 💼 商业许可

如果你需要将本项目用于商业目的，请：

1. **联系我们** 获取商业许可证协议
   - 📋 GitHub Issue：https://github.com/ximing/aimo/issues

2. **商业许可包括**
   - 商业使用权
   - 优先技术支持
   - 自定义功能开发
   - SLA 服务保障

#### ❓ 常见问题

**Q: 我可以在企业内部使用吗？**  
A: 可以。内部非营利性使用是允许的。

**Q: 我可以修改代码吗？**  
A: 可以。您可以修改代码用于非商业目的。修改后的版本遵循相同的许可证。

**Q: 我可以分享修改后的代码吗？**  
A: 可以，但仍需遵循 BSL 协议。商业使用需要获得许可。

**Q: 开源项目可以使用吗？**  
A: 如果是非商业的开源项目，可以。如果项目涉及商业用途或有商业赞助，需要商业许可。
