# PRD: SM-2 算法修复 —— 符合艾宾浩斯记忆习惯

## Introduction

当前间隔重复（Spaced Repetition）功能基于 SM-2 算法，但存在多处与艾宾浩斯记忆曲线不符的实现问题，包括：质量评分映射不完整、模糊评分的复利惩罚、缺少 Lapse 遗忘计数机制、无最大间隔上限、时间维度过滤规则未实现、每日限制未应用到 API。本 PRD 描述对上述 6 个问题的完整修复方案。

## Goals

- 将 SM-2 难度因子更新改为使用标准公式，消除硬编码偏移量
- 修复模糊评分（quality=3）的双重惩罚问题
- 引入 `lapseCount` 字段追踪遗忘次数，遗忘后使用渐进式恢复间隔而非完全重置
- 设置合理的最大间隔上限（365 天），防止卡片实际消失
- 实现 `recent_days` 和 `date_range` 时间维度过滤规则
- 将每日限制（`srDailyLimit`）应用到 `/due` API，前端展示剩余可复习数量提示

## User Stories

### US-001: 使用 SM-2 标准公式更新难度因子

**Description:** 作为系统，我需要使用 SM-2 原始公式计算 easeFactor，使卡片难度能平滑适应用户的真实记忆能力。

**Acceptance Criteria:**

- [ ] 移除 `calculateNextReview` 中所有硬编码的 easeFactor 偏移量（+0.15 / +0.1 / -0.08 / -0.2）
- [ ] 改为使用公式：`EF' = max(1.3, EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))`，其中 q 为质量分（0-5）
- [ ] UI 评分到质量分的映射：`mastered→5`、`remembered→4`、`fuzzy→3`、`forgot→1`（保持不变）
- [ ] 质量分 < 3 时（即 forgot），repetitions 重置为 0（保持现有行为，lapse 逻辑在 US-003 处理）
- [ ] 单元测试覆盖：mastered/remembered/fuzzy/forgot 四种评分后的 easeFactor 计算结果正确
- [ ] Typecheck 通过

### US-002: 修复模糊评分的双重惩罚

**Description:** 作为系统，我需要在计算下次复习间隔时使用**旧的** easeFactor，只在计算完间隔后才更新 easeFactor，避免对模糊评分造成复利惩罚。

**Acceptance Criteria:**

- [ ] `calculateNextReview` 中，interval 的计算始终基于**更新前的** easeFactor（`oldEaseFactor`）
- [ ] easeFactor 的更新（使用 US-001 的标准公式）在 interval 计算之后进行
- [ ] 验证：quality=3，easeFactor=2.5，interval=6 时，新 interval = round(6 _ 2.5) = 15（而非当前的 round(6 _ 2.42) = 14）
- [ ] Typecheck 通过

### US-003: 添加 lapseCount 字段并实现渐进式遗忘恢复

**Description:** 作为系统，我需要独立追踪遗忘次数，并在遗忘后使用基于遗忘历史的渐进式恢复间隔，而非直接重置为 1 天。

**Acceptance Criteria:**

- [ ] 在 `spaced_repetition_cards` 表中添加 `lapse_count` INT 字段，默认值 0
- [ ] 生成并运行 Drizzle 迁移，迁移成功
- [ ] 更新 `SpacedRepetitionCardDto`（packages/dto）添加 `lapseCount: number` 字段
- [ ] 遗忘（quality=1）时：`lapseCount += 1`，`repetitions = 0`
- [ ] 遗忘后的恢复间隔逻辑：
  - lapseCount = 1：interval = 1 天（首次遗忘，从头开始）
  - lapseCount = 2：interval = 1 天
  - lapseCount >= 3：interval = 1 天（遗忘多次的卡片保持 1 天，由 easeFactor 自然降低来减慢增长）
  - 注：当前实现遗忘后已是 1 天，此 US 的核心价值在于**记录 lapseCount** 供后续统计和展示使用，不改变间隔行为
- [ ] `/due` API 返回的卡片数据中包含 `lapseCount` 字段
- [ ] Typecheck 通过

### US-004: 设置最大复习间隔上限

**Description:** 作为系统，我需要限制复习间隔不超过 365 天，防止卡片因间隔过长而实际上永远不会再出现。

**Acceptance Criteria:**

- [ ] `calculateNextReview` 计算出的 `interval` 在写入前，执行 `Math.min(interval, 365)`
- [ ] 验证：一张 easeFactor=3.0、interval=200 的卡片，mastered 评分后 interval = min(260, 365) = 260（正常）；interval=300 时，mastered 后 interval = min(390, 365) = 365（被截断）
- [ ] 最大间隔值 365 提取为常量 `MAX_INTERVAL_DAYS = 365`，方便后续调整
- [ ] Typecheck 通过

### US-005: 实现 recent_days 时间维度过滤规则

**Description:** 作为用户，我希望能够设置"只复习最近 N 天内创建的 Memo"，让 SR 池聚焦于近期内容。

**Acceptance Criteria:**

- [ ] `SpacedRepetitionService.isMemoEligible()` 中处理 `filterType === 'recent_days'` 的规则
- [ ] 规则逻辑：查询 memo 的 `createdAt`，若 `createdAt >= now - N days`，则该规则匹配
- [ ] `recent_days` 规则可以与 `mode: 'include'` 或 `mode: 'exclude'` 组合使用
- [ ] 当规则不匹配时（memo 不在时间范围内），根据 mode 决定是否纳入 SR 池（与现有 category/tag 规则逻辑一致）
- [ ] 现有的 `reevaluateCard` 在规则变更时仍然正确执行
- [ ] Typecheck 通过

### US-006: 实现 date_range 时间维度过滤规则

**Description:** 作为用户，我希望能够设置"只复习指定日期范围内创建的 Memo"，精确控制 SR 池内容。

**Acceptance Criteria:**

- [ ] `SpacedRepetitionService.isMemoEligible()` 中处理 `filterType === 'date_range'` 的规则
- [ ] `filterValue` 格式为 `"startISO,endISO"`（如 `"2024-01-01T00:00:00Z,2024-03-31T23:59:59Z"`）
- [ ] 规则逻辑：查询 memo 的 `createdAt`，若 `startISO <= createdAt <= endISO`，则该规则匹配
- [ ] `date_range` 规则可以与 `mode: 'include'` 或 `mode: 'exclude'` 组合使用
- [ ] Typecheck 通过

### US-007: 将每日限制应用到 /due API

**Description:** 作为用户，我希望 /due 接口返回的卡片数量不超过我设置的每日上限，避免一次性看到过多卡片造成压力。

**Acceptance Criteria:**

- [ ] `SpacedRepetitionController` 的 `getDueCards` 方法在返回前，将结果截断为 `srDailyLimit` 条
- [ ] 截断逻辑：取到期时间最早的前 N 张（已按 `nextReviewAt` 升序排序，直接 slice 即可）
- [ ] API 响应中添加元数据字段：`{ cards: [...], totalDue: number, dailyLimit: number }`，其中 `totalDue` 为未截断前的总数量
- [ ] 更新 `apps/web/src/api/spaced-repetition.ts` 中的响应类型，添加 `totalDue` 和 `dailyLimit` 字段
- [ ] Typecheck 通过

### US-008: 前端展示每日限制提示

**Description:** 作为用户，我希望在复习页看到"今日还有 X 张卡片待复习（已达每日上限）"的提示，了解全部到期情况。

**Acceptance Criteria:**

- [ ] 复习页（`apps/web/src/pages/review/index.tsx`）在 SR 模式下，当 `totalDue > dailyLimit` 时，展示提示信息："今日已加载 {dailyLimit} 张，还有 {totalDue - dailyLimit} 张待复习"
- [ ] 提示信息位于卡片列表上方或复习完成页面
- [ ] 当 `totalDue <= dailyLimit` 时，不展示该提示
- [ ] Typecheck 通过
- [ ] 在浏览器中验证提示展示正确（使用 dev-browser skill）

## Functional Requirements

- FR-1: `calculateNextReview` 使用 SM-2 标准公式更新 easeFactor：`EF' = max(1.3, EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02)))`
- FR-2: interval 计算始终基于更新前的 easeFactor（先算间隔，再更新因子）
- FR-3: `spaced_repetition_cards` 表新增 `lapse_count` INT 字段（默认 0），遗忘时递增
- FR-4: 复习间隔上限为 `MAX_INTERVAL_DAYS = 365` 天
- FR-5: `isMemoEligible` 支持 `filterType === 'recent_days'`，比较 memo.createdAt 与 now - N days
- FR-6: `isMemoEligible` 支持 `filterType === 'date_range'`，比较 memo.createdAt 与 filterValue 中的日期范围
- FR-7: `/api/v1/spaced-repetition/due` 返回结果截断为 `srDailyLimit` 条，并在响应中包含 `totalDue` 和 `dailyLimit`
- FR-8: 前端在 `totalDue > dailyLimit` 时展示超出提示

## Non-Goals

- 不实现 quality 0 和 quality 2 的 UI 评分选项（保持现有四档评分：掌握/记得/模糊/忘了）
- 不实现自适应算法（基于用户历史数据动态调整参数）
- 不追踪每日已复习数量（不做"今天已复习 X 张"的计数，只做上限截断）
- 不修改 AI 回顾（ReviewService）的任何逻辑
- 不修改推送通知中的每日限制逻辑（已有实现保持不变）
- lapseCount 仅用于记录和展示，不改变遗忘后的间隔行为（保持 1 天）

## Technical Considerations

- **数据库迁移**：US-003 需要添加 `lapse_count` 字段，需先 `pnpm build` 再 `pnpm migrate:generate`
- **DTO 更新**：修改 `packages/dto/src/review.ts` 后需重新构建 `@aimo/dto`
- **向后兼容**：`lapse_count` 字段默认值为 0，现有卡片数据无需迁移
- **算法变更影响**：US-001/002 会改变现有卡片的 easeFactor 更新行为，但不会改变现有卡片的当前状态，只影响下次复习后的结果
- **关键文件**：
  - `apps/server/src/services/spaced-repetition.service.ts`（US-001~006 主要修改位置）
  - `apps/server/src/db/schema/spaced-repetition-cards.ts`（US-003 DB 变更）
  - `apps/server/src/controllers/v1/spaced-repetition.controller.ts`（US-007）
  - `apps/web/src/api/spaced-repetition.ts`（US-007 类型更新）
  - `apps/web/src/pages/review/index.tsx`（US-008）
  - `packages/dto/src/review.ts`（US-003 DTO 更新）

## Success Metrics

- SM-2 公式计算结果与标准实现一致（可与 Anki 公式对比验证）
- 模糊评分后的间隔不再小于使用旧 easeFactor 计算的结果
- 遗忘次数在卡片数据中可查
- 没有卡片的间隔超过 365 天
- 时间维度过滤规则在 `isMemoEligible` 中正确执行
- `/due` 接口返回条数不超过 `srDailyLimit`

## Open Questions

- 是否需要在设置页展示 `lapseCount` 统计（如"累计遗忘次数最多的卡片"）？当前 PRD 不包含此功能。
- 最大间隔 365 天是否合理？可后续通过调整 `MAX_INTERVAL_DAYS` 常量修改。
- 前端提示文案是否需要国际化支持？当前按中文处理。
