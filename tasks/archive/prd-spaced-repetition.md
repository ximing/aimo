# PRD: 间隔重复推送（Spaced Repetition）

## Introduction

基于 SM-2 算法（Anki 同款遗忘曲线算法），在用户"最容易忘记"的时间点把旧笔记推送回来。用户在独立的回顾页面中逐卡标记掌握程度，系统自动调整下次推送时间。支持飞书/Meow 推送渠道，同时提供站内通知作为备选。

**核心问题：** 用户创建了大量 Memo 后，随时间流逝会逐渐遗忘内容，缺乏有效的主动复习机制。

## Goals

- 通过 SM-2 算法自动计算每张卡片的最优复习时间，减少不必要的重复
- 每日定时（08:00）推送待复习 Memo，每用户最多 5 条，避免信息轰炸
- 提供独立回顾页面，支持逐卡标记 mastered / remembered / fuzzy / forgot，以及跳过
- 支持 include/exclude 过滤规则，让用户控制哪些 Memo 进入复习池
- 支持飞书/Meow 外部推送 + 站内通知双渠道
- Memo 修改 category/tag 时自动重新评估 SR 卡片资格；Memo 删除时级联删除 SR 卡片

## User Stories

### US-001: 数据库 — 创建 SR 卡片表和规则表
**Description:** As a developer, I need to store spaced repetition card state and filter rules in MySQL so the system can track review schedules.

**Acceptance Criteria:**
- [ ] 创建 `spaced_repetition_cards` 表，字段：`cardId` VARCHAR(191) PK、`userId` VARCHAR(191)、`memoId` VARCHAR(191)、`easeFactor` FLOAT DEFAULT 2.5、`interval` INT DEFAULT 1、`repetitions` INT DEFAULT 0、`nextReviewAt` TIMESTAMP、`lastReviewAt` TIMESTAMP NULL、`createdAt` TIMESTAMP
- [ ] 创建 `spaced_repetition_rules` 表，字段：`ruleId` VARCHAR(191) PK、`userId` VARCHAR(191)、`mode` ENUM('include','exclude')、`filterType` ENUM('category','tag')、`filterValue` VARCHAR(255)、`createdAt` TIMESTAMP
- [ ] 在 `schema/index.ts` 中导出两张表
- [ ] `pnpm build` 后执行 `pnpm migrate:generate` 生成迁移文件，迁移文件无报错
- [ ] Typecheck passes

### US-002: 后端 — SM-2 算法服务
**Description:** As a developer, I need a service that implements the SM-2 algorithm to calculate the next review interval based on user feedback.

**Acceptance Criteria:**
- [ ] 创建 `SpacedRepetitionService`，包含方法 `calculateNextReview(card, quality: 1|3|5): { easeFactor, interval, repetitions, nextReviewAt }`
- [ ] SM-2 规则正确实现（quality 映射见下）：
  - quality=5 (mastered，熟练掌握): `easeFactor = max(1.3, EF + 0.15)`, repetitions++, interval 按 EF 增长更快（interval * EF * 1.3）
  - quality=4 (remembered，记住了): `easeFactor = max(1.3, EF + 0.1)`, repetitions++, interval 按 EF 增长
  - quality=3 (fuzzy，模糊): `easeFactor = max(1.3, EF - 0.08)`, repetitions++, interval 按较慢速度增长
  - quality=1 (forgot，忘记了): `easeFactor = max(1.3, EF - 0.2)`, repetitions=0, interval=1
  - interval 计算：repetitions=0 → 1天, repetitions=1 → 6天, repetitions>1 → round(prevInterval * EF)
  - 跳过（skip）：不更新卡片状态，`nextReviewAt` 不变
- [ ] `nextReviewAt` = 当前时间 + interval 天
- [ ] 单元测试覆盖三种 quality 的计算结果
- [ ] Typecheck passes

### US-003: 后端 — 卡片自动创建（Memo 创建时）
**Description:** As a user, I want my new memos to automatically enter the review pool so I don't have to manually manage which notes to review.

**Acceptance Criteria:**
- [ ] 在 `MemoService.createMemo()` 完成后，调用 `SpacedRepetitionService.createCardIfEligible(userId, memoId)`
- [ ] `createCardIfEligible` 检查过滤规则：
  - 无规则时：创建卡片
  - 有 include 规则：Memo 的 category/tag 匹配任意 include 规则才创建
  - 有 exclude 规则：Memo 的 category/tag 匹配任意 exclude 规则则不创建
  - exclude 优先级高于 include
- [ ] 卡片初始值：`easeFactor=2.5`, `interval=1`, `repetitions=0`, `nextReviewAt=明天08:00`
- [ ] 同一 memoId 不重复创建卡片（upsert 或先查后建）
- [ ] Typecheck passes

### US-003b: 后端 — Memo 更新时重新评估 SR 卡片资格
**Description:** As a user, I want the system to automatically update my review pool when I change a memo's category or tags, so the filter rules stay accurate.

**Acceptance Criteria:**
- [ ] 在 `MemoService.updateMemo()` 完成后，若 `categoryId` 或 `tags` 发生变化，调用 `SpacedRepetitionService.reevaluateCard(userId, memoId)`
- [ ] `reevaluateCard` 逻辑：
  1. 用更新后的 Memo category/tag 重新执行过滤规则判断
  2. 若判断结果为"应加入"且卡片不存在：创建卡片（同 US-003 初始值）
  3. 若判断结果为"不应加入"且卡片存在：删除该卡片
  4. 若判断结果为"应加入"且卡片已存在：不做任何操作（保留现有 SM-2 状态）
- [ ] Typecheck passes

### US-003c: 后端 — Memo 删除时级联删除 SR 卡片
**Description:** As a user, I want my review cards to be cleaned up when I delete a memo, so there are no orphaned cards in the system.

**Acceptance Criteria:**
- [ ] 在 `MemoService.deleteMemo()` 中，删除 Memo 前（或同一事务中）删除对应的 `spaced_repetition_cards` 记录（按 `memoId` 删除）
- [ ] 删除操作不抛出错误（即使该 Memo 没有对应卡片也安全执行）
- [ ] Typecheck passes

### US-004: 后端 — 回顾 API（获取今日待复习列表）
**Description:** As a user, I want to fetch my due cards for today so the review page can show me what to review.

**Acceptance Criteria:**
- [ ] `GET /api/v1/spaced-repetition/due` 返回当前用户 `nextReviewAt <= now` 的卡片列表，含完整 Memo 信息（title, content 前200字, id）
- [ ] 返回结果按 `nextReviewAt` 升序排列
- [ ] 需要 JWT 认证（`@CurrentUser()`）
- [ ] 返回格式：`{ cards: Array<{ cardId, memoId, memo: { id, title, content }, easeFactor, interval, repetitions, nextReviewAt }> }`
- [ ] Typecheck passes

### US-005: 后端 — 回顾 API（提交掌握程度）
**Description:** As a user, I want to submit my recall quality for a card so the system can update its review schedule.

**Acceptance Criteria:**
- [ ] `POST /api/v1/spaced-repetition/cards/:cardId/review` 接受 body `{ quality: 'mastered' | 'remembered' | 'fuzzy' | 'forgot' | 'skip' }`
- [ ] 映射：`mastered→5`, `remembered→4`, `fuzzy→3`, `forgot→1`；`skip` 不更新卡片，直接返回当前状态
- [ ] 调用 SM-2 算法更新卡片的 `easeFactor`, `interval`, `repetitions`, `nextReviewAt`, `lastReviewAt`
- [ ] 返回更新后的卡片状态
- [ ] 卡片不存在或不属于当前用户时返回 404
- [ ] Typecheck passes

### US-006: 后端 — 定时推送任务
**Description:** As a user, I want to receive daily push notifications for due cards so I'm reminded to review without having to check the app.

**Acceptance Criteria:**
- [ ] 在 `SchedulerService` 中注册每日 08:00 的 cron 任务 `sendSpacedRepetitionPush`
- [ ] 任务流程：
  1. 查询所有用户中 `nextReviewAt <= now` 的卡片，按 userId 分组
  2. 每用户取最多 N 条（N 来自用户设置，默认 5）
  3. 对每个用户：若已配置外部推送渠道（飞书/Meow），通过 `ChannelFactory` 发送；同时写入站内通知表
- [ ] 推送内容格式：`📚 复习提醒：《{memo.title}》\n{memo.content前100字}\n[查看笔记]({站内链接})`
- [ ] 未开启 SR 功能的用户跳过
- [ ] Typecheck passes

### US-007: 后端 — 站内通知存储
**Description:** As a developer, I need to store in-app notifications so users can see review reminders even without external push channels.

**Acceptance Criteria:**
- [ ] 创建 `in_app_notifications` 表：`notificationId` VARCHAR(191) PK、`userId` VARCHAR(191)、`type` VARCHAR(50)（如 `spaced_repetition`）、`title` VARCHAR(255)、`body` TEXT、`memoId` VARCHAR(191) NULL、`isRead` BOOLEAN DEFAULT false、`createdAt` TIMESTAMP
- [ ] 推送任务执行时同步写入该表
- [ ] `GET /api/v1/notifications` 返回当前用户未读通知列表（最近 50 条）
- [ ] `POST /api/v1/notifications/:id/read` 标记单条已读
- [ ] Typecheck passes

### US-008: 后端 — SR 用户设置 API
**Description:** As a user, I want to configure my spaced repetition settings via API so the frontend can persist my preferences.

**Acceptance Criteria:**
- [ ] 在用户设置表（或单独配置表）中增加字段：`srEnabled` BOOLEAN DEFAULT false、`srDailyLimit` INT DEFAULT 5
- [ ] `GET /api/v1/spaced-repetition/settings` 返回当前用户 SR 配置
- [ ] `PUT /api/v1/spaced-repetition/settings` 更新 `srEnabled` 和 `srDailyLimit`
- [ ] `GET /api/v1/spaced-repetition/rules` 返回当前用户过滤规则列表
- [ ] `POST /api/v1/spaced-repetition/rules` 创建规则（body: `{ mode, filterType, filterValue }`）
- [ ] `DELETE /api/v1/spaced-repetition/rules/:ruleId` 删除规则
- [ ] Typecheck passes

### US-008c: 数据库 — 创建 AI 回顾模式表（review_profiles）
**Description:** As a developer, I need to store named AI review profiles with filter conditions so users can save and reuse review configurations.

**Acceptance Criteria:**
- [ ] 在 `apps/server/src/db/schema/` 创建 `reviewProfiles` 表，字段：`profileId` VARCHAR(191) PK、`userId` VARCHAR(191)、`name` VARCHAR(255)、`scope` ENUM('all','category','tag','recent')、`filterValues` JSON（存储分类 ID 或标签名数组，scope=all/recent 时为空数组）、`recentDays` INT NULL（scope=recent 时使用）、`questionCount` INT DEFAULT 10、`createdAt` TIMESTAMP、`updatedAt` TIMESTAMP
- [ ] 从 `apps/server/src/db/schema/index.ts` 导出
- [ ] `pnpm build && pnpm migrate:generate` 执行无报错
- [ ] Typecheck passes

### US-008d: 后端 — AI 回顾模式 CRUD API
**Description:** As a user, I want to create, list, and delete AI review profiles via API so I can manage my saved review configurations.

**Acceptance Criteria:**
- [ ] `GET /api/v1/review/profiles` 返回当前用户所有回顾模式列表，需 JWT 认证
- [ ] `POST /api/v1/review/profiles` 创建回顾模式，body: `{ name, scope, filterValues: string[], recentDays?, questionCount? }`，需 JWT 认证
- [ ] `DELETE /api/v1/review/profiles/:profileId` 删除回顾模式，不属于当前用户时返回 404，需 JWT 认证
- [ ] `POST /api/v1/review/sessions` 新增支持 `profileId` 参数：传入时从 `review_profiles` 读取配置，原有 `scope/scopeValue` 参数保持兼容
- [ ] `filterValues` 为数组，后端展开为 OR 逻辑（匹配任意一个分类/标签的 Memo 均纳入）
- [ ] Typecheck passes

### US-008e: 前端 — Settings SR 过滤规则改为多选 Select
**Description:** As a user, I want to pick categories and tags from a dropdown list when adding SR filter rules, instead of typing values manually.

**Acceptance Criteria:**
- [ ] 添加规则表单中，选择 `filterType=category` 时，filterValue 输入框改为多选 select，选项来自 `GET /api/v1/categories`（显示分类名称，提交值为 categoryId）
- [ ] 选择 `filterType=tag` 时，改为多选 select，选项来自 `GET /api/v1/tags`（显示标签名，提交值为标签名）
- [ ] 多选后批量提交：每个选中值调用一次 `POST /api/v1/spaced-repetition/rules`，全部完成后列表实时更新
- [ ] 现有规则列表展示不变（每条规则仍显示 `[include/exclude] [category/tag]: value`），支持删除（二次确认）
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-009: 前端 — Settings 页面 SR 配置区块
**Description:** As a user, I want to enable/disable spaced repetition and configure daily limit and filter rules in Settings so I can control the feature.

**Acceptance Criteria:**
- [ ] Settings 页面新增"间隔重复"区块，包含：
  - 开启/关闭开关（toggle）
  - 每日最大推送数量输入框（1-20，默认 5）
  - 过滤规则列表（显示现有规则，支持删除）
  - 添加规则表单（选择 include/exclude、category/tag、具体值）
- [ ] 开关关闭时，其他设置项 disabled
- [ ] 添加规则后列表实时更新
- [ ] 删除规则需二次确认（confirm dialog）
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-010: 前端 — 回顾页面重构为 Tab 切换方案
**Description:** As a user, I want the review page to use a clear Tab layout separating AI review and spaced repetition so I can easily distinguish and access both modes.

**交互结构：**
```
[AI 回顾 🧠]  [间隔重复 🔁]
─────────────────────────────────────────────────────
AI 回顾 Tab（Setup 阶段）:

  已保存的回顾模式                    [+ 新建模式]
  ┌──────────────┐  ┌──────────────┐
  │ 🏷 工作笔记   │  │ 📁 技术学习   │
  │ 标签: 工作   │  │ 分类: 技术   │
  │ 10 题        │  │ 5 题         │
  │ [▶ 开始]     │  │ [▶ 开始]     │
  └──────────────┘  └──────────────┘

  ── 历史记录 ──
  • 昨天 - 工作笔记
  • 3天前 - 全部笔记

  ── 自定义回顾 ──
  范围: ○全部  ○按分类  ○按标签  ○最近N天
  按分类: [▼ 多选分类 select ▼]
  题目数量: [10 ▾]
  [保存为模式...]   [▶ 直接开始]

间隔重复 Tab（Setup 阶段）:
  [▶ 开始复习]
```

**Acceptance Criteria:**
- [ ] 回顾页面顶部改为两个 Tab：「AI 回顾 🧠」和「间隔重复 🔁」，默认选中 AI 回顾
- [ ] AI 回顾 Tab Setup 阶段上方：调用 `GET /api/v1/review/profiles` 展示已保存模式卡片，每张卡片显示名称、scope 描述、题目数量，点击「▶ 开始」以该 profileId 创建会话
- [ ] AI 回顾 Tab Setup 阶段中部：保留现有历史记录列表（点击恢复历史会话，功能不变）
- [ ] AI 回顾 Tab Setup 阶段下方：自定义区域，scope 选分类/标签时显示多选 select（选项来自 categories/tags API），底部有「保存为模式」和「直接开始」两个按钮
- [ ] 「保存为模式」弹出输入模式名称的 dialog，确认后调用 `POST /api/v1/review/profiles`，模式卡片列表刷新
- [ ] 间隔重复 Tab Setup 阶段：仅显示「▶ 开始复习」按钮，点击后调用 `GET /api/v1/spaced-repetition/due` 进入复习流程
- [ ] 间隔重复 Quiz 阶段：逐卡展示 Memo 标题 + 内容前 200 字，底部五个按钮（左→右）：跳过（灰）/ 忘记了（红）/ 模糊（黄）/ 记住了（绿）/ 熟练掌握（深蓝紫）
- [ ] 跳过的卡片移至队列末尾；所有卡片完成后显示「今日复习完成 🎉」；无待复习时显示空状态
- [ ] 显示进度条（第 X 张 / 共 Y 张）
- [ ] AI 回顾 Quiz/Summary 阶段交互逻辑不变
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-011: 前端 — 站内通知入口
**Description:** As a user, I want to see in-app notifications for review reminders so I can access them even without external push channels configured.

**Acceptance Criteria:**
- [ ] 导航栏/顶部新增通知图标，有未读通知时显示红点
- [ ] 点击图标展开通知列表（最近 50 条），显示标题、时间、已读/未读状态
- [ ] 点击通知项跳转到对应 Memo 或回顾页面，并标记为已读
- [ ] 轮询或页面聚焦时刷新未读数量（每 60 秒或 visibilitychange）
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008b: 后端 — 历史 Memo 批量迁移 API
**Description:** As a user, I want to trigger a one-time import of my existing memos into the spaced repetition pool so I don't miss historical notes.

**Acceptance Criteria:**
- [ ] `POST /api/v1/spaced-repetition/import-existing` 触发批量迁移，需 JWT 认证
- [ ] 遍历当前用户所有 Memo，对每条 Memo 执行 `createCardIfEligible`（复用过滤规则逻辑，已有卡片的 Memo 跳过）
- [ ] `nextReviewAt` 设为明天 08:00（与新建 Memo 一致）
- [ ] 返回结果：`{ imported: number, skipped: number }`（imported=新建卡片数，skipped=已有卡片或被规则排除数）
- [ ] Typecheck passes

### US-009b: 前端 — Settings 页面历史 Memo 迁移入口
**Description:** As a user, I want a button in Settings to import my existing memos into the review pool so I can start reviewing historical notes.

**Acceptance Criteria:**
- [ ] Settings SR 区块内新增「导入历史笔记」按钮，仅在 `srEnabled=true` 时可点击
- [ ] 点击后弹出确认 dialog：「将把所有符合过滤规则的现有笔记加入复习池，已在复习池中的笔记不受影响，确认导入？」
- [ ] 确认后调用 `POST /api/v1/spaced-repetition/import-existing`，显示 loading 状态
- [ ] 完成后显示结果提示：「已导入 X 条笔记，跳过 Y 条（已在复习池或被规则排除）」
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- **FR-1:** 新建 Memo 时，系统自动检查过滤规则，符合条件则创建 SR 卡片（`interval=1`，`nextReviewAt=明天08:00`）
- **FR-2:** SM-2 算法根据 quality（1/3/5）更新卡片的 `easeFactor`、`interval`、`repetitions`、`nextReviewAt`
- **FR-3:** 每日 08:00 定时任务查询 `nextReviewAt <= now` 的卡片，按用户分组，每用户最多推送 `srDailyLimit` 条
- **FR-4:** 推送通过 `ChannelFactory`（飞书/Meow）发送，同时写入站内通知表
- **FR-5:** 过滤规则：exclude 优先于 include；无规则时全部 Memo 自动加入
- **FR-6:** 回顾页面 `/review` 展示当日到期卡片，支持逐卡标记 mastered/remembered/fuzzy/forgot 或跳过；跳过的卡片移至队列末尾
- **FR-7:** Settings 页面提供 SR 开关、每日上限、过滤规则的增删管理
- **FR-8:** 未开启 SR（`srEnabled=false`）的用户，定时任务跳过，不创建推送
- **FR-9:** 站内通知支持未读标记，导航栏显示未读红点；通知永久保存（不自动清理）
- **FR-10:** Memo 修改 category/tag 时，系统重新评估该 Memo 的 SR 卡片资格（新增/删除卡片，不修改已有卡片的 SM-2 状态）
- **FR-11:** Memo 删除时，对应 SR 卡片同步删除
- **FR-12:** 提供 `POST /api/v1/spaced-repetition/import-existing` 接口，将用户所有现有 Memo 按过滤规则批量加入复习池（已有卡片的 Memo 跳过），返回导入/跳过数量
- **FR-13:** Settings 页面提供「导入历史笔记」按钮，触发批量迁移并展示结果

## Non-Goals

- 不支持自动将历史 Memo 批量加入复习池（需用户在 Settings 中手动触发导入）
- 不支持过滤规则变更后批量溯及既往（即修改规则不会影响已有卡片，仅影响后续 Memo 创建/更新）
- 不支持自定义 SM-2 参数（easeFactor 初始值、interval 增长系数固定）
- 不支持多设备推送去重
- 不支持推送历史记录查询
- 不实现 Web Push / APNs 等原生推送，仅飞书/Meow + 站内通知
- 不支持卡片手动删除或暂停（用过滤规则排除即可）

## Design Considerations

- 回顾页面参考 Anki 卡片翻转交互风格，但简化为直接展示内容 + 五档操作
- 按钮颜色建议：「忘记了」红色、「模糊」黄色、「记住了」绿色、「熟练掌握」深蓝/紫色、「跳过」灰色
- 五个按钮建议排列：跳过（左侧次要）| 忘记了 / 模糊 / 记住了 / 熟练掌握（右侧主要，从左到右掌握程度递增）
- 进度条使用线性进度条，显示在页面顶部
- Settings 中过滤规则以 tag 形式展示，每条规则显示 `[include/exclude] category: xxx`

## Technical Considerations

- **SM-2 算法** 实现在独立的 `SpacedRepetitionService` 中，不依赖外部库
- **SchedulerService** 已有 cron 基础设施，新增任务时注意时区（使用服务器本地时间或 UTC+8）
- **ChannelFactory** 已有飞书/Meow 推送实现，复用即可
- **用户设置存储**：优先扩展现有 `users` 表或 `user_settings` 表，避免新建表
- **VARCHAR(191)** 限制：所有主键和外键遵循此限制（MySQL utf8mb4 索引限制）
- **站内通知轮询**：前端每 60 秒或 `visibilitychange` 时拉取未读数，避免 WebSocket 复杂度

## Success Metrics

- 用户在回顾页面完成一轮复习（标记所有到期卡片）的操作步骤 ≤ 卡片数 × 1 次点击
- 定时任务执行时间 < 30 秒（针对 1000 用户规模）
- Settings 页面配置完成后，下次 Memo 创建时卡片正确按规则创建/跳过

## Decisions Log

以下问题已确认决策，已纳入正式需求：

| 问题 | 决策 |
|------|------|
| Memo 修改 category/tag 后是否重新评估 SR 卡片？ | 是。检查新 category/tag 是否满足过滤规则：满足则保留/新建卡片；不满足则删除卡片（FR-10, US-003b） |
| Memo 删除时 SR 卡片是否级联删除？ | 是，在 `deleteMemo` 中同步删除（FR-11, US-003c） |
| 站内通知保留时长？ | 永久保存，不自动清理（FR-9） |
| 回顾页面是否支持跳过和熟练掌握？ | 支持。共五档：忘记了 / 模糊 / 记住了 / 熟练掌握 / 跳过；跳过移至队列末尾（FR-6, US-010） |
