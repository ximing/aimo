# PRD: 回收站功能

## Introduction

为用户提供回收站功能，让误删的 memo 可以被找回。目前 memo 删除已经是软删除（`deletedAt` 字段标记），数据并未真正丢失，但前端没有提供任何界面让用户查看或恢复已删除的 memo。本功能在侧边栏用户弹窗中新增"回收站"入口，点击后进入独立的 `/trash` 页面，用户可以查看、搜索、过滤、还原或永久删除已删除的 memo。

## Goals

- 在用户弹窗中暴露回收站入口，提升可发现性
- 提供独立的回收站页面，展示所有已删除的 memo
- 支持关键词搜索 + 按删除时间排序/过滤
- 支持单条 memo 的还原（恢复到正常状态）
- 支持单条 memo 的永久删除（从数据库彻底移除）
- 回收站中的 memo 永久保留，不自动清理

## User Stories

### US-001: 后端 - 获取回收站 memo 列表接口
**Description:** As a developer, I need a backend API to fetch deleted memos for the current user so that the trash page can display them.

**Acceptance Criteria:**
- [ ] 新增 `GET /api/v1/trash` 接口，返回当前用户所有 `deletedAt > 0` 的 memo 列表
- [ ] 支持 `keyword` 查询参数，对 `content` 字段进行模糊搜索
- [ ] 支持 `sortBy` 查询参数：`deletedAt_desc`（默认，最新删除在前）、`deletedAt_asc`
- [ ] 支持 `startDate` / `endDate` 查询参数，按删除时间范围过滤（Unix 毫秒时间戳）
- [ ] 返回字段包含：`memoId`, `content`, `deletedAt`, `createdAt`, `attachments`, `tagIds`
- [ ] 分页支持：`page`（默认 1）、`pageSize`（默认 20），返回 `total`
- [ ] 只返回当前登录用户自己的已删除 memo
- [ ] Typecheck passes

### US-002: 后端 - 还原 memo 接口
**Description:** As a developer, I need a backend API to restore a deleted memo so that users can undo accidental deletions.

**Acceptance Criteria:**
- [ ] 新增 `POST /api/v1/trash/:memoId/restore` 接口
- [ ] 将指定 memo 的 `deletedAt` 重置为 `0`
- [ ] 同时还原该 memo 关联的 `memo_relations`（将 `deletedAt` 重置为 `0`，仅限双端 memo 都已还原的关系）
- [ ] 同时在 LanceDB 中将该 memo 的 `deletedAt` 重置为 `0`
- [ ] 如果 memo 不存在或不属于当前用户，返回 404 错误
- [ ] 如果 memo 未被删除（`deletedAt = 0`），返回 400 错误
- [ ] Typecheck passes

### US-003: 后端 - 永久删除 memo 接口
**Description:** As a developer, I need a backend API to permanently delete a memo from the database so that users can free up storage and remove sensitive data.

**Acceptance Criteria:**
- [ ] 新增 `DELETE /api/v1/trash/:memoId` 接口（区别于现有的 `DELETE /api/v1/memos/:memoId` 软删除）
- [ ] 从 MySQL `memos` 表中物理删除该行
- [ ] 从 MySQL `memo_relations` 表中物理删除所有涉及该 memo 的关系记录
- [ ] 从 LanceDB 中物理删除该 memo 的向量记录
- [ ] 删除该 memo 相关的附件文件（调用 `AttachmentService` 清理存储）
- [ ] 如果 memo 不存在或不属于当前用户，返回 404 错误
- [ ] 如果 memo 未被删除（`deletedAt = 0`），返回 400 错误（防止误操作永久删除正常 memo）
- [ ] Typecheck passes

### US-004: 前端 - 回收站 API 封装
**Description:** As a developer, I need frontend API functions for the trash feature so that the UI can communicate with the backend.

**Acceptance Criteria:**
- [ ] 在 `apps/web/src/api/` 新增 `trash.ts` 文件
- [ ] 封装 `getTrashMemos(params)` 函数，调用 `GET /api/v1/trash`
- [ ] 封装 `restoreMemo(memoId)` 函数，调用 `POST /api/v1/trash/:memoId/restore`
- [ ] 封装 `permanentlyDeleteMemo(memoId)` 函数，调用 `DELETE /api/v1/trash/:memoId`
- [ ] 所有函数有正确的 TypeScript 类型
- [ ] Typecheck passes

### US-005: 前端 - TrashService 状态管理
**Description:** As a developer, I need a reactive service to manage trash page state so that components can share and react to data changes.

**Acceptance Criteria:**
- [ ] 在 `apps/web/src/services/` 新增 `trash.service.ts`
- [ ] 使用 `@rabjs/react` 的 `Service` 模式，包含 observable 状态：`memos`、`total`、`loading`、`keyword`、`sortBy`、`startDate`、`endDate`、`currentPage`
- [ ] 实现 `fetchMemos()` 方法，拉取回收站列表
- [ ] 实现 `restore(memoId)` 方法，还原后从本地列表移除该条目
- [ ] 实现 `permanentlyDelete(memoId)` 方法，永久删除后从本地列表移除该条目
- [ ] 实现 `setKeyword(keyword)` / `setSortBy(sortBy)` / `setDateRange(start, end)` 方法，更新过滤条件并重新拉取
- [ ] Typecheck passes

### US-006: 前端 - 在用户弹窗中添加回收站入口
**Description:** As a user, I want to access the trash from the user menu so that I can find and restore deleted memos.

**Acceptance Criteria:**
- [ ] 在 `apps/web/src/pages/home/components/user-menu.tsx` 的用户菜单中，在"退出登录"按钮上方新增"回收站"菜单项
- [ ] 使用 `Trash2` 图标（lucide-react）
- [ ] 点击后导航到 `/trash` 路由
- [ ] 点击后关闭用户弹窗
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-007: 前端 - 回收站页面布局与 memo 列表
**Description:** As a user, I want to see all my deleted memos in the trash page so that I can review what I've deleted.

**Acceptance Criteria:**
- [ ] 新增路由 `/trash`，对应新页面组件 `apps/web/src/pages/trash/`
- [ ] 页面使用与首页一致的 `<Layout>` 组件包裹（保留侧边栏和顶部导航）
- [ ] 页面顶部显示标题"回收站"
- [ ] 以列表形式展示已删除的 memo，每条显示：memo 内容（截断超长文本）、删除时间（相对时间，如"3 天前删除"）、标签
- [ ] 列表为空时显示空状态：垃圾桶图标 + "回收站为空"文案
- [ ] 支持滚动加载（分页，每页 20 条）
- [ ] 页面加载时显示 loading 状态
- [ ] 在 `apps/web/src/App.tsx` 中注册 `/trash` 路由，使用 `ProtectedRoute` 包裹
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008: 前端 - 每条 memo 的还原与永久删除操作
**Description:** As a user, I want to restore or permanently delete individual memos in the trash so that I can manage my deleted content.

**Acceptance Criteria:**
- [ ] 每条 memo 卡片右侧显示两个操作按钮："还原"（RotateCcw 图标）和"永久删除"（Trash2 图标）
- [ ] 点击"还原"后：调用还原接口，成功后从列表中移除该条目，显示成功 toast 提示"已还原"
- [ ] 点击"永久删除"后：弹出确认对话框，确认文案为"此操作不可撤销，memo 将被永久删除。确认删除？"，确认后调用永久删除接口，成功后从列表中移除该条目，显示成功 toast 提示"已永久删除"
- [ ] 操作进行中按钮显示 loading 状态，防止重复点击
- [ ] 操作失败时显示错误 toast 提示
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-009: 前端 - 搜索与过滤功能
**Description:** As a user, I want to search and filter deleted memos so that I can quickly find a specific memo to restore.

**Acceptance Criteria:**
- [ ] 页面顶部提供关键词搜索框，placeholder 为"搜索回收站..."
- [ ] 输入关键词后 debounce 500ms 触发搜索，重新拉取列表
- [ ] 提供排序下拉选择器，选项：最新删除（默认）、最早删除
- [ ] 提供删除时间范围选择器（开始日期 ~ 结束日期），使用日期选择器组件
- [ ] 清除过滤条件按钮（当有任何过滤条件时显示），点击后重置所有过滤并重新拉取
- [ ] 所有过滤条件变化时，重置到第一页
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: `GET /api/v1/trash` — 返回当前用户所有 `deletedAt > 0` 的 memo，支持 `keyword`、`sortBy`、`startDate`、`endDate`、`page`、`pageSize` 参数
- FR-2: `POST /api/v1/trash/:memoId/restore` — 将指定已删除 memo 的 `deletedAt` 重置为 0，同步更新 LanceDB，还原关联 memo_relations
- FR-3: `DELETE /api/v1/trash/:memoId` — 从 MySQL 和 LanceDB 中物理删除指定已删除的 memo，同时清理附件和关联关系
- FR-4: 永久删除接口只能操作 `deletedAt > 0` 的 memo，防止误删正常 memo
- FR-5: 用户弹窗（user-menu）新增"回收站"菜单项，点击导航至 `/trash`
- FR-6: `/trash` 为受保护路由，未登录用户重定向到 `/auth`
- FR-7: 回收站页面支持关键词搜索（模糊匹配 content）
- FR-8: 回收站页面支持按删除时间排序（升序/降序）
- FR-9: 回收站页面支持按删除时间范围过滤
- FR-10: 每条 memo 支持单独还原或永久删除操作
- FR-11: 永久删除操作需要二次确认弹窗

## Non-Goals

- 不支持批量选择、批量还原、批量永久删除
- 不支持"清空回收站"功能
- 不支持自动清理（回收站 memo 永久保留）
- 不支持在回收站中编辑 memo 内容
- 不支持回收站 memo 的预览展开（只显示截断内容）
- 不支持按标签/分类过滤回收站（仅关键词 + 时间范围）

## Design Considerations

- 整体风格与首页保持一致，使用相同的 `<Layout>` 组件
- memo 卡片使用简化版本（不需要编辑功能），可参考 `memo-card.tsx` 的展示部分
- 操作按钮使用 lucide-react 图标：`RotateCcw`（还原）、`Trash2`（永久删除）
- 确认对话框可复用项目中已有的 Dialog/Modal 组件（如有）
- Toast 通知使用项目中已有的 toast 组件（如有）
- 空状态设计：居中显示 `Trash2` 大图标 + "回收站为空" + 灰色说明文字

## Technical Considerations

- **软删除已就绪**：`memos.deletedAt` 字段已存在，无需数据库迁移
- **LanceDB 同步**：还原和永久删除都需要同步操作 LanceDB，参考现有 `deleteMemo` 方法中的 LanceDB 操作模式
- **永久删除的附件清理**：调用 `AttachmentService` 删除存储中的附件文件，防止孤立文件
- **memo_relations 还原逻辑**：还原 memo 时，只还原双端 memo 都未被删除（或都已还原）的关系；如果关联的另一端 memo 仍在回收站，则该关系暂不还原
- **路由注册**：在 `apps/web/src/App.tsx` 中添加 `/trash` 路由
- **TrashService 注册**：在 `apps/web/src/main.tsx` 中通过 `register(TrashService)` 全局注册
- **分页**：前端使用"加载更多"按钮分页（非无限滚动），避免复杂的虚拟列表

## Success Metrics

- 用户能在 2 次点击内从侧边栏进入回收站页面
- 还原操作完成后，memo 立即在首页列表中可见
- 永久删除操作有二次确认，防止误操作

## Open Questions

- 还原 memo 时，如果该 memo 原来所属的 category 已被删除，是否需要处理？（建议：category 设为 null，memo 正常还原）
- 附件文件是否需要在永久删除时同步清理？（建议：是，调用 AttachmentService）
