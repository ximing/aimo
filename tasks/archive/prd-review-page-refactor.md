# PRD: 知识回顾页面重构

## Introduction

对现有的知识回顾（Review）页面进行重构，将 AI 回顾和间隔重复两种模式通过顶部大 Tab 清晰区分。AI 回顾模式采用左右布局，左侧面板上方展示已保存的回顾模式、下方展示历史记录；间隔重复模式采用艾宾浩斯翻卡片式交互，帮助用户系统化复习笔记。

## Goals

- 通过顶部大 Tab 让两种回顾模式的切换更直观
- AI 回顾模式左侧面板将「已保存模式」与「历史记录」上下分区展示，信息层级清晰
- 支持通过弹窗新建并保存回顾模式，也可直接以某个模式开始回顾
- 间隔重复模式实现翻卡片式交互，接入已有的 `spaced-repetition` API
- 保留现有 AI 回顾的所有功能（问答流程、评分、会话恢复等）

## User Stories

### US-013: 页面顶部 Tab 重构

**Description:** As a user, I want to see a prominent tab bar at the top of the review page so that I can clearly switch between AI Review and Spaced Repetition modes.

**Acceptance Criteria:**

- [ ] 页面顶部有两个大 Tab：「AI 回顾」和「间隔重复」
- [ ] Tab 样式醒目，选中状态与未选中状态有明显视觉区别
- [ ] 切换 Tab 时页面内容区域完全替换（不共用布局）
- [ ] 默认选中「AI 回顾」Tab
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-014: AI 回顾模式 - 左右布局重构

**Description:** As a user, I want the AI review mode to use a left-right layout so that I can manage profiles and history on the left while the review session is on the right.

**Acceptance Criteria:**

- [ ] AI 回顾 Tab 下，页面分为左侧面板（约 280px 固定宽度）和右侧内容区
- [ ] 左侧面板上半部分：「回顾模式」区域，显示已保存的模式列表
- [ ] 左侧面板下半部分：「历史记录」区域，显示过往回顾会话列表
- [ ] 右侧内容区：展示当前回顾的 setup / quiz / summary 步骤（保留现有逻辑）
- [ ] 左侧面板两个区域之间有分隔线
- [ ] 左侧面板在内容过多时可独立滚动
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-015: AI 回顾模式 - 回顾模式列表与操作

**Description:** As a user, I want to see my saved review profiles in the left panel so that I can quickly start a review session or manage my profiles.

**Acceptance Criteria:**

- [ ] 左侧「回顾模式」区域顶部有「新建模式」按钮（带 `+` 图标）
- [ ] 已保存的模式以卡片或列表项形式展示，每项显示：模式名称、范围描述（如「全部笔记」「按分类: 工作」）、题目数量
- [ ] 每个模式项有「开始」按钮（Play 图标），点击后直接以该模式创建并进入回顾会话
- [ ] 每个模式项有「删除」按钮（Trash2 图标），点击后弹出确认提示，确认后删除
- [ ] 当前选中的模式（正在回顾的）高亮显示
- [ ] 若无已保存模式，显示空状态提示文字：「暂无保存的模式，点击新建」
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-016: AI 回顾模式 - 新建模式弹窗

**Description:** As a user, I want a modal dialog to create and save a new review profile so that I can configure and reuse custom review settings.

**Acceptance Criteria:**

- [ ] 点击「新建模式」按钮，弹出对话框（Modal）
- [ ] 弹窗包含以下字段：
  - 模式名称（文本输入，必填）
  - 范围（Select：全部笔记 / 按分类 / 按标签 / 最近 N 天）
  - 当范围为「按分类」时，显示分类多选列表
  - 当范围为「按标签」时，显示标签多选列表
  - 当范围为「最近 N 天」时，显示天数数字输入框
  - 题目数量（数字输入，范围 5–20，默认 10）
- [ ] 弹窗底部有两个按钮：「仅保存」和「保存并开始」
  - 「仅保存」：调用 `POST /api/v1/review/profiles` 保存后关闭弹窗，刷新模式列表
  - 「保存并开始」：保存后立即以该模式创建并进入回顾会话
- [ ] 模式名称为空时，「仅保存」和「保存并开始」按钮禁用
- [ ] 保存成功后弹窗关闭，模式列表刷新显示新模式
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-017: AI 回顾模式 - 历史记录列表

**Description:** As a user, I want to see my past review sessions in the left panel history section so that I can review my progress.

**Acceptance Criteria:**

- [ ] 左侧「历史记录」区域展示过往会话列表（调用 `GET /api/v1/review/history`）
- [ ] 每条历史项显示：日期时间（相对时间格式，如「2小时前」）、得分（如「85分」）、状态（已完成/进行中）
- [ ] 点击某条历史记录，右侧内容区加载该会话详情（已完成的进入 summary 步骤，进行中的恢复 quiz 步骤）
- [ ] 当前选中的历史会话高亮显示
- [ ] 历史记录加载中显示 loading 状态
- [ ] 若无历史记录，显示空状态提示：「暂无回顾历史」
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-018: 间隔重复模式 - 翻卡片式交互

**Description:** As a user, I want to review my due spaced repetition cards with a flip-card interaction so that I can practice recall and let the system schedule my next review.

**Acceptance Criteria:**

- [ ] 切换到「间隔重复」Tab 后，调用 `GET /api/v1/spaced-repetition/due` 获取今日到期卡片
- [ ] 若今日无到期卡片，显示空状态页面：「今日无需复习，继续保持！」并显示下次复习时间（如果可获取）
- [ ] 若有到期卡片，显示进度指示器：「第 X / Y 张」
- [ ] 卡片正面显示笔记标题和内容（正面为「问题面」）
- [ ] 卡片底部有「显示答案」按钮，点击后翻转卡片（CSS 翻转动画）显示笔记完整内容
- [ ] 翻转后，底部显示四个自评按钮：「完全记住」「记住了」「模糊」「忘记了」，对应 quality 值：`mastered` / `remembered` / `fuzzy` / `forgot`
- [ ] 点击任意自评按钮后，调用 `POST /api/v1/spaced-repetition/cards/:cardId/review` 提交评分，然后自动进入下一张卡片
- [ ] 所有卡片完成后，显示本次复习总结：复习数量、各评分分布
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-019: 间隔重复模式 - 无卡片时的引导

**Description:** As a user, when there are no due cards today, I want to see helpful information and an option to import existing memos so that I can get started with spaced repetition.

**Acceptance Criteria:**

- [ ] 无到期卡片时，显示空状态界面（不显示卡片区域）
- [ ] 若用户从未导入笔记（卡片总数为 0），显示「导入现有笔记」按钮，点击后调用 `POST /api/v1/spaced-repetition/import-existing`，导入完成后显示导入数量提示
- [ ] 若已有卡片但今日无到期，显示鼓励文案和今日完成复习的提示
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: 页面顶部 Tab 组件，选项为「AI 回顾」和「间隔重复」，默认选中「AI 回顾」
- FR-2: AI 回顾模式下，页面采用左右两栏布局（左侧 280px，右侧自适应）
- FR-3: 左侧面板上半区「回顾模式」展示已保存 profiles，支持「开始」和「删除」操作
- FR-4: 左侧面板上半区顶部有「新建模式」按钮，触发弹窗
- FR-5: 新建模式弹窗支持配置名称、范围（all/category/tag/recent）、题目数量，提供「仅保存」和「保存并开始」两个操作
- FR-6: 左侧面板下半区「历史记录」展示过往会话，点击可在右侧加载详情
- FR-7: 右侧内容区保留现有 AI 回顾的三步流程（setup → quiz → summary）
- FR-8: 间隔重复模式下，展示今日到期卡片的翻卡片交互
- FR-9: 卡片翻转使用 CSS 3D transform 动画（`rotateY(180deg)`）
- FR-10: 间隔重复自评后调用 `reviewCard(cardId, quality)` API，quality 映射：完全记住=`mastered`，记住了=`remembered`，模糊=`fuzzy`，忘记了=`forgot`
- FR-11: 间隔重复完成所有卡片后显示本次复习总结页

## Non-Goals

- 不实现间隔重复的设置页面（规则配置已在 Settings 页面中）
- 不修改后端 API（所有后端接口已存在）
- 不添加间隔重复的历史记录侧边栏（SR 模式不需要左侧面板）
- 不实现卡片内容编辑功能
- 不支持间隔重复模式下跳过卡片后的重新排队（skip 逻辑已有，保留即可）

## Design Considerations

### 顶部 Tab 样式

- 使用较大的 Tab 按钮（不是小型 pill tabs），类似页面级导航
- 选中状态：深色背景或底部粗下划线
- 图标：AI 回顾用 `BrainCircuit`，间隔重复用 `Clock`

### AI 回顾左侧面板

- 左侧面板背景色略深于右侧（如 `bg-gray-50` vs `bg-white`）
- 「回顾模式」区域固定高度约 40%，超出时内部滚动
- 「历史记录」区域占剩余高度，超出时内部滚动

### 间隔重复翻卡片

- 卡片居中显示，宽度约 600px，高度约 400px
- 正面：白色背景，显示笔记标题（大字）+ 内容摘要
- 背面：浅蓝色背景，显示完整内容
- 翻转动画：0.4s ease-in-out

### 现有组件复用

- 复用现有的 `formatRelativeTime` 工具函数
- 复用现有的 `scopeLabels` 映射
- 复用现有的 mastery 图标逻辑（CheckCircle / Circle / XCircle）

## Technical Considerations

- 重构后的 `ReviewPage` 建议拆分为子组件：
  - `ReviewTabBar` — 顶部 Tab
  - `AIReviewPanel` — AI 回顾完整模块（含左侧面板 + 右侧内容）
  - `AIReviewSidebar` — 左侧面板（模式列表 + 历史记录）
  - `NewProfileModal` — 新建模式弹窗
  - `SpacedRepetitionPanel` — 间隔重复完整模块
  - `FlipCard` — 翻卡片组件
- 所有子组件放在 `apps/web/src/pages/review/components/` 目录下
- 现有的 AI 回顾三步流程（setup/quiz/summary）的 state 和逻辑保持不变，仅迁移到 `AIReviewPanel` 中
- Tab 切换时重置各模式的内部状态（防止状态污染）
- 间隔重复卡片翻转状态用 `useState<boolean>` 管理，每次切换下一张卡片时重置为 `false`

## Success Metrics

- 用户可在 1 次点击内从已保存模式开始回顾（点击模式卡片上的「开始」按钮）
- 间隔重复翻卡片交互流畅，无明显卡顿
- 页面重构后不引入任何现有功能的回归问题

## Open Questions

- 间隔重复完成总结页是否需要显示「下次复习时间」？（当前 API 返回的 `SRCard` 包含 `nextReviewAt`，可在总结中展示）
- 左侧「回顾模式」区域是否需要支持编辑已有模式（修改名称/范围）？（当前 PRD 中仅支持删除，编辑功能留作后续迭代）
