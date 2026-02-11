# 🚀 生产环境快速启动指南

## 一键部署

### 方式 1：使用部署脚本（推荐）

```bash
# 1. 配置环境
cp .env.example .env
# 编辑 .env，填入 JWT_SECRET 和 OPENAI_API_KEY

# 2. 验证环境
./scripts/verify-production.sh

# 3. 部署应用
./scripts/deploy.sh              # 自动检测
./scripts/deploy.sh docker-run   # 或使用 docker run
./scripts/deploy.sh docker-compose  # 或使用 docker-compose
```

### 方式 2：使用 Make 命令

```bash
# 构建并运行
make build-docker
make docker-run

# 或查看所有命令
make help
```

### 方式 3：手动 Docker 命令

```bash
# 构建镜像
docker build -t aimo:latest .

# 运行容器
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name aimo-app \
  aimo:latest

# 查看日志
docker logs -f aimo-app

# 停止容器
docker stop aimo-app
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `./scripts/verify-production.sh` | 验证生产环境配置 |
| `./scripts/deploy.sh` | 部署应用 |
| `./scripts/deploy.sh logs` | 查看日志 |
| `./scripts/deploy.sh stop` | 停止应用 |
| `make build-docker` | 构建 Docker 镜像 |
| `make docker-run` | 运行 Docker 容器 |
| `make docker-stop` | 停止 Docker 容器 |
| `make help` | 查看所有 Make 命令 |

## 环境变量配置

```bash
# 必需配置
JWT_SECRET=your-production-secret-key-at-least-32-chars
OPENAI_API_KEY=sk-...

# 可选配置
NODE_ENV=production
PORT=3000
```

## 验证部署

部署成功后：

```bash
# 访问应用
curl http://localhost:3000

# 测试 API
curl http://localhost:3000/api/v1/memos

# 查看容器状态
docker ps | grep aimo

# 查看日志
docker logs aimo-app
```

## 文件结构

```
aimo/
├── Dockerfile                    # 镜像定义
├── docker-compose.prod.yml       # 容器编排
├── .dockerignore                 # Docker 构建优化
├── .env.example                  # 环境变量模板
├── Makefile                      # 便捷命令
├── PRODUCTION_DEPLOYMENT.md      # 详细部署文档
├── PRODUCTION_FEATURES.md        # 功能总结
└── scripts/
    ├── verify-production.sh      # 环境验证
    └── deploy.sh                 # 部署脚本
```

## 架构概览

```
                    ┌─────────────────────┐
                    │   Docker Image      │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
         ┌───────▼────────┐         ┌──────▼────────┐
         │ Web Build      │         │ Server Build  │
         │ (Vite)         │         │ (Express)     │
         │                │         │               │
         │ • React 19     │         │ • TypeScript  │
         │ • Tailwind CSS │         │ • LanceDB     │
         │ • Code Split   │         │ • JWT Auth    │
         └────────────────┘         └───────────────┘
                 │                           │
         ┌───────▼────────────────────────────▼───────┐
         │  Unified Container                         │
         │  ├── apps/server/dist/  (Server)           │
         │  ├── apps/server/public/ (Web Static)      │
         │  └── node_modules/       (Runtime)         │
         └────────────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Running App    │
                    │  Port: 3000     │
                    │  Health Check   │
                    └─────────────────┘
```

## CI/CD 工作流

### 自动触发条件

| 工作流 | 触发条件 |
|--------|---------|
| CI | Push to main/master/develop, PR |
| Docker 发布 | Push to branches, 创建标签 (v*.*.*) |
| 部署 | 创建标签 (v*.*.*) |

### 标签策略

```
ghcr.io/your-org/aimo:
  ├── latest              # 主分支最新
  ├── main                # main 分支
  ├── develop             # develop 分支
  ├── v1.0.0              # 版本标签
  ├── v1.0                # 主次版本
  └── v1                  # 主版本
```

## 故障排查

### 容器无法启动

```bash
# 查看错误日志
docker logs aimo-app

# 检查环境变量
docker inspect aimo-app | grep -A 20 Env

# 检查端口占用
lsof -i :3000
```

### 应用返回 404

```bash
# 检查静态文件
docker exec aimo-app ls -la apps/server/public/

# 检查 index.html
docker exec aimo-app cat apps/server/public/index.html | head -20
```

### 构建超时

```bash
# 增加 Docker 构建超时
docker build --timeout 3600 -t aimo:latest .

# 或检查磁盘空间
df -h
```

## 性能提示

✅ **首次启动可能较慢** - 这是正常的，Docker 需要初始化  
✅ **使用健康检查** - 自动重启失败的容器  
✅ **启用缓存** - GitHub Actions 缓存加速构建  
✅ **监控内存** - 监控容器资源占用  

## 下一步

1. 📖 查看详细文档：[PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)
2. 📋 了解功能：[PRODUCTION_FEATURES.md](./PRODUCTION_FEATURES.md)
3. 🔧 自定义配置：编辑 `.env` 和 `Dockerfile`
4. 📊 设置监控：配置日志和性能监控
5. 🔐 增强安全：使用 HTTPS、防火墙规则等

## 获取帮助

- **脚本帮助**: `./scripts/verify-production.sh`
- **Make 命令**: `make help`
- **日志信息**: `docker logs aimo-app`
- **部署命令**: `./scripts/deploy.sh`

---

💡 **提示**: 所有脚本都包含详细的错误信息和使用说明。遇到问题时，查看脚本输出的建议！
