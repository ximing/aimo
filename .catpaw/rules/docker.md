---
ruleType: Model Request 
description: 构建docker镜像时使用
---

## AIMO Docker 镜像构建注意事项

- 构建顺序必须先打包 workspace 依赖：先 `@aimo/logger`、再 `@aimo/dto`，最后 `@aimo/web` 和 `@aimo/server`。
- 生产镜像要拷贝 workspace 包的 `package.json`，否则 `pnpm install --prod` 无法正确解析本地包依赖。
- 新增 `packages/*` 包时同步更新 Dockerfile：构建阶段加上 `pnpm --filter <package> build`，生产阶段拷贝该包的 `package.json` 和构建产物目录。
- 生产镜像需要拷贝 workspace 包的构建产物，例如 `packages/logger/lib` 与 `packages/dto/dist`。
- 生产镜像使用 `pnpm install --prod --frozen-lockfile`，避免安装 devDependencies。
- GitHub Actions 里要包含 `pnpm install`、`pnpm --filter @aimo/logger build`、`pnpm --filter @aimo/dto build`、`pnpm --filter @aimo/web build`、`pnpm --filter @aimo/server build`，再执行 `docker build`/`docker push`，确保构建产物和依赖完整。
- 新增 `packages/*` 包时，GitHub Actions 需同步更新：在 `pnpm --filter` 列表中加入该包，确保构建顺序正确（依赖包先于应用包）。
- 启动命令建议使用 `node apps/server/dist/index.js`，与构建目录保持一致。

