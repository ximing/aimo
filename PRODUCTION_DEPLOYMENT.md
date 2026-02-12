# 生产环境部署指南

本文档提供了完整的生产环境部署步骤和最佳实践。

## 目录

- [概述](#概述)
- [前置要求](#前置要求)
- [本地构建](#本地构建)
- [Docker 镜像构建](#docker-镜像构建)
- [环境变量配置](#环境变量配置)
- [部署方式](#部署方式)
- [验证部署](#验证部署)
- [故障排查](#故障排查)

## 概述

AIMO 应用采用整体化的构建和部署策略：

1. **Web 应用（React + Vite）** 构建后直接输出到 `apps/server/public/` 目录
2. **Server 应用（Express + Node.js）** 通过 Static Controller 服务这些静态文件
3. **整个应用** 打包成一个 Docker 镜像，包含完整的运行时环境

### 核心特性

✅ 单一 Docker 镜像包含 Web 和 Server  
✅ 自动化 CI/CD 流程（GitHub Actions）  
✅ 代码分割和优化（Vite 配置）  
✅ 生产级别的静态资源缓存策略  
✅ 健康检查支持

## 前置要求

### 系统要求

- Docker 20.10+ 或 Docker Desktop
- Node.js 20+（用于本地构建）
- pnpm 10.22.0+
- Git

### 环境变量

复制 `.env.example` 到 `.env` 并配置必要的变量：

```bash
cp .env.example .env
```

必需的环境变量：

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-production-secret-key
OPENAI_API_KEY=your-openai-api-key
```

## 本地构建

### 1. 安装依赖

```bash
pnpm install
```

### 2. 构建整个项目

```bash
# 使用 make
make build

# 或直接使用 pnpm
pnpm build
```

这将：

- 构建 `@aimo/dto` 包
- 构建 `@aimo/web`（输出到 `apps/server/public/`）
- 构建 `@aimo/server`（TypeScript → JavaScript）

### 3. 验证构建

```bash
# 使用 make
make verify-build

# 或手动检查
test -f apps/server/dist/index.js && echo "✅ Server built" || echo "❌ Server build failed"
test -f apps/server/public/index.html && echo "✅ Web built" || echo "❌ Web build failed"
```

## Docker 镜像构建

### 构建流程

Dockerfile 采用多阶段构建以优化最终镜像大小：

**构建阶段（Builder）**

```
- 安装 pnpm
- 复制 package.json 和 pnpm-lock.yaml
- 安装所有依赖
- 构建 DTO 包
- 构建 Web 应用（自动输出到 server/public）
- 构建 Server 应用
```

**运行阶段（Production）**

```
- 只安装生产依赖
- 复制构建产物
- 设置环境变量和启动命令
```

### 本地构建

```bash
# 使用 make
make build-docker

# 或直接使用 docker
docker build -t aimo:latest .
```

### 验证镜像

```bash
# 检查镜像是否构建成功
docker images | grep aimo

# 查看镜像信息
docker inspect aimo:latest
```

## 环境变量配置

### 开发环境

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=dev-secret-key
OPENAI_API_KEY=dev-api-key
```

### 生产环境

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-secure-production-secret-key
OPENAI_API_KEY=your-production-api-key
```

生产环境建议：

- 使用强加密的 JWT_SECRET（至少 32 个字符）
- 使用专用的生产 OpenAI 密钥
- 不要在代码中提交实际的密钥
- 使用密钥管理系统（如 AWS Secrets Manager）

## 部署方式

### 方式 1：Docker 容器直接运行

```bash
# 构建镜像
docker build -t aimo:latest .

# 运行容器
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name aimo-app \
  aimo:latest
```

### 方式 2：使用 docker-compose（推荐）

```bash
# 编辑 docker-compose.prod.yml 中的环境变量

# 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 停止服务
docker-compose -f docker-compose.prod.yml down
```

### 方式 3：使用 Make 命令

```bash
# 构建并运行
make docker-run

# 停止
make docker-stop

# 使用 docker-compose
make docker-compose-up

# 查看日志
make docker-compose-logs
```

### 方式 4：GitHub Actions CI/CD（自动化）

项目已配置 GitHub Actions 工作流，支持：

**CI 工作流** (`.github/workflows/ci.yml`)

- 在每个 push 和 pull request 时运行
- 执行 lint 检查
- 构建 Web 和 Server
- 测试 Docker 镜像构建

**Docker 发布工作流** (`.github/workflows/docker-publish.yml`)

- 在 push 到 `main`、`master`、`develop` 分支时自动构建和推送
- 在创建版本标签时自动构建和推送（如 `v1.0.0`）
- 自动标记镜像（latest、版本号、commit SHA 等）
- 推送到 GitHub Container Registry (ghcr.io)

**部署工作流** (`.github/workflows/deploy.yml`)

- 在创建版本标签时触发
- 构建并推送镜像到 GHCR
- 提供部署指导

### 方式 5：云平台部署

#### AWS ECS

```bash
# 1. 推送镜像到 ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REGISTRY
docker tag aimo:latest $ECR_REGISTRY/aimo:latest
docker push $ECR_REGISTRY/aimo:latest

# 2. 创建 ECS 任务定义和服务
# 参考 AWS 文档配置 ECS 任务
```

#### 阿里云容器镜像服务

```bash
# 1. 登录阿里云镜像仓库
docker login -u $ALIYUN_USERNAME -p $ALIYUN_PASSWORD $ALIYUN_REGISTRY

# 2. 推送镜像
docker tag aimo:latest $ALIYUN_REGISTRY/namespace/aimo:latest
docker push $ALIYUN_REGISTRY/namespace/aimo:latest

# 3. 在 ACK（阿里云 Kubernetes）中部署
# 创建 Kubernetes 部署配置
```

#### Kubernetes 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aimo-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: aimo
  template:
    metadata:
      labels:
        app: aimo
    spec:
      containers:
        - name: aimo
          image: ghcr.io/your-org/aimo:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: 'production'
            - name: PORT
              value: '3000'
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: aimo-secrets
                  key: jwt-secret
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: aimo-secrets
                  key: openai-api-key
          livenessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
```

## 验证部署

### 1. 检查容器状态

```bash
# 查看运行中的容器
docker ps | grep aimo

# 查看容器日志
docker logs -f aimo-app

# 查看容器统计
docker stats aimo-app
```

### 2. 测试应用

```bash
# 测试 Web 应用（应返回 HTML）
curl http://localhost:3000

# 测试 API 端点
curl http://localhost:3000/api/v1/health

# 测试搜索 API
curl -X GET "http://localhost:3000/api/v1/memos/search?query=test"
```

### 3. 性能监控

```bash
# 检查健康状态
docker inspect --format='{{.State.Status}}' aimo-app

# 查看内存使用
docker stats --no-stream aimo-app
```

## 故障排查

### 问题 1：镜像构建失败

**症状**：`docker build` 命令失败

**解决方案**：

```bash
# 查看详细错误
docker build -t aimo:latest . --progress=plain

# 检查 Dockerfile 文件
cat Dockerfile

# 确保所有必要的文件存在
ls -la apps/server/package.json
ls -la apps/web/package.json
```

### 问题 2：容器启动失败

**症状**：容器立即退出

**解决方案**：

```bash
# 查看容器日志
docker logs aimo-app

# 检查环境变量
docker inspect -f '{{.Config.Env}}' aimo-app

# 确保 .env 文件存在且格式正确
cat .env
```

### 问题 3：应用返回 404

**症状**：访问 `http://localhost:3000` 返回 404

**解决方案**：

```bash
# 检查静态文件是否正确复制
docker exec aimo-app ls -la apps/server/public/

# 检查 index.html 是否存在
docker exec aimo-app test -f apps/server/public/index.html && echo "✅ Found" || echo "❌ Not found"

# 查看容器内的目录结构
docker exec aimo-app find apps/server/public -type f | head -20
```

### 问题 4：API 请求失败

**症状**：API 调用返回 500 错误

**解决方案**：

```bash
# 查看详细的服务器日志
docker logs -f aimo-app

# 检查是否正确配置了 OpenAI API Key
docker exec aimo-app env | grep OPENAI

# 尝试连接到本地 API
curl -v http://localhost:3000/api/v1/memos
```

### 问题 5：高内存使用

**症状**：容器内存占用很高

**解决方案**：

```bash
# 检查内存使用情况
docker stats aimo-app

# 限制容器内存
docker run -m 2g aimo:latest

# 更新 docker-compose.yml 限制内存
# services:
#   app:
#     ...
#     deploy:
#       resources:
#         limits:
#           memory: 2G
```

## 最佳实践

### 1. 版本管理

使用 Git 标签创建版本：

```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

GitHub Actions 会自动构建和推送 Docker 镜像。

### 2. 日志管理

```bash
# 使用 docker compose 的日志管理
docker-compose -f docker-compose.prod.yml logs --tail=100 -f

# 或导出日志到文件
docker logs aimo-app > app.log 2>&1
```

### 3. 备份策略

```bash
# 备份数据库（如果使用）
docker exec aimo-db pg_dump -U postgres > backup.sql

# 备份数据卷
docker run --rm -v aimo-data:/data -v $(pwd):/backup \
  busybox tar czf /backup/data.tar.gz -C / data
```

### 4. 监控和告警

建议使用以下工具进行监控：

- **Prometheus** + **Grafana**：性能监控
- **ELK Stack**：日志聚合
- **Sentry**：错误追踪
- **DataDog** 或 **New Relic**：应用性能监控

### 5. 安全建议

✅ 使用强加密的 JWT Secret  
✅ 启用 HTTPS/TLS（使用 Nginx 反向代理）  
✅ 定期更新依赖包  
✅ 使用网络隔离（防火墙规则）  
✅ 实施速率限制  
✅ 启用安全头部（已在服务器配置）

## 常用命令速查表

```bash
# 构建
make build              # 构建 Web 和 Server
make build-docker       # 构建 Docker 镜像

# 运行
make docker-run         # 运行 Docker 容器
docker-compose -f docker-compose.prod.yml up -d  # 使用 docker-compose

# 管理
make docker-stop        # 停止 Docker 容器
make docker-compose-down  # 使用 docker-compose 停止
docker logs -f aimo-app   # 查看日志

# 验证
make verify-build       # 验证构建
make verify-docker      # 验证 Docker 镜像

# 清理
make clean              # 清理构建产物
```

## 获取帮助

如需更多帮助，请查看：

- 项目 README.md
- API 文档：`docs/api.md`
- 服务器配置：`apps/server/src/config/`
- Dockerfile：`Dockerfile`

## 更新日志

### v1.0.0

- ✅ 完整的 Docker 化部署
- ✅ GitHub Actions CI/CD 工作流
- ✅ 生产环境优化配置
- ✅ 完整的部署文档
