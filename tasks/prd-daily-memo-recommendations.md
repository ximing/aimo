# PRD: 每日 Memo 推荐功能

## Introduction

在 memo 列表页左侧增加"今日推荐"模块，通过 AI 智能分析从所有 memo 中推荐 3 条用户可能感兴趣的内容，帮助用户回顾和发现已有知识。推荐每天更新一次，以卡片形式展示。

## Goals

- 通过 AI 智能推荐帮助用户回顾历史 memo
- 提高用户与历史内容的互动率
- 增加 memo 列表页的信息密度和价值
- 每日固定时间刷新推荐内容（避免频繁变动）

## User Stories

### US-001: 后端 API - 获取每日推荐
**Description:** 作为开发者，我需要提供一个 API 来获取今日推荐的 3 个 memo，以便前端展示。

**Acceptance Criteria:**
- [ ] 创建 `GET /api/v1/memos/daily-recommendations` 接口
- [ ] 使用 AI 分析所有 memo 内容，智能选择 3 个推荐
- [ ] 推荐结果缓存 24 小时（基于日期），同一用户同一天返回相同结果
- [ ] 返回完整的 memo 数据（包含标题、内容摘要、标签、创建时间）
- [ ] 如果 memo 总数少于 3 个，返回所有 memo
- [ ] Typecheck/lint passes

### US-002: 前端 UI - 左侧推荐区域
**Description:** 作为用户，我需要在 memo 列表页左侧看到今日推荐的 3 个 memo 卡片。

**Acceptance Criteria:**
- [ ] 在 memo 列表页左侧（或合适位置）添加"今日推荐"区域
- [ ] 显示区域标题"今日推荐"和日期
- [ ] 展示 3 个 memo 卡片（标题 + 内容摘要 + 创建日期）
- [ ] 点击卡片可跳转到对应 memo 详情
- [ ] 响应式布局：移动端可隐藏或折叠
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: AI 推荐算法服务
**Description:** 作为开发者，我需要实现一个智能推荐服务，分析 memo 内容并选择最值得推荐的条目。

**Acceptance Criteria:**
- [ ] 创建 `RecommendationService` 服务
- [ ] 使用 OpenAI API 分析所有 memo 的标题和内容
- [ ] 选择标准：内容丰富度、独特性、潜在价值
- [ ] 实现结果缓存机制，按用户 + 日期存储推荐结果
- [ ] 提供手动刷新机制（可选，用于测试）
- [ ] Typecheck/lint passes

### US-004: 推荐结果持久化
**Description:** 作为开发者，我需要持久化每日推荐结果，确保同一天内推荐内容保持一致。

**Acceptance Criteria:**
- [ ] 设计数据结构存储每日推荐（用户ID + 日期 + memoID列表）
- [ ] 实现缓存检查逻辑：如果当天已有推荐，直接返回缓存
- [ ] 缓存过期逻辑：新一天自动重新生成
- [ ] Typecheck/lint passes

### US-005: 空状态和边界处理
**Description:** 作为用户，当系统中 memo 数量不足或推荐服务异常时，我需要看到友好的提示。

**Acceptance Criteria:**
- [ ] memo 数量少于 3 个时，显示"创建更多 memo 来获取推荐"
- [ ] 推荐服务异常时，显示"今日推荐暂时不可用"
- [ ] 新用户首次使用时，显示引导提示
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: 系统每天为每个用户生成 3 个 memo 推荐
- FR-2: 推荐基于 AI 分析 memo 内容的相关性、丰富度和价值
- FR-3: 同一用户在同一天内看到的推荐保持一致
- FR-4: 推荐缓存按 UTC+8 日期计算（或使用用户本地时区）
- FR-5: 推荐卡片显示：标题、内容摘要（前 100 字）、创建日期
- FR-6: 点击推荐卡片跳转至对应 memo 详情页
- FR-7: 如果系统中少于 3 个 memo，显示空状态提示
- FR-8: 推荐服务异常时优雅降级，显示友好错误信息

## Non-Goals (Out of Scope)

- 不基于用户行为数据（如浏览历史、点击率）进行推荐
- 不支持用户手动刷新/换一批推荐
- 不支持"不感兴趣"或屏蔽特定 memo
- 不推荐其他用户的内容（仅推荐当前用户的 memo）
- 不发送推荐通知或邮件
- 不实现复杂的协同过滤算法

## Design Considerations

### UI 设计建议
- 推荐区域位于 memo 列表左侧边栏
- 卡片设计简洁，突出标题和内容摘要
- 使用与现有设计系统一致的卡片样式
- 移动端可折叠或移至页面顶部

### 推荐算法建议
- 使用 OpenAI GPT API 分析 memo 内容
- Prompt 设计考虑：内容独特性、知识价值、回顾意义
- 可选：结合 memo 创建时间，优先推荐较早但重要的内容

## Technical Considerations

- 推荐计算在 API 调用时进行（首次请求）
- 使用 LanceDB 或内存缓存存储每日推荐结果
- 缓存 key 格式：`daily_recommendations:{userId}:{YYYY-MM-DD}`
- AI 调用可能耗时较长，考虑异步生成或前端 loading 状态
- 降级策略：AI 服务异常时随机选择 memo

## Success Metrics

- 用户点击推荐卡片的转化率 > 20%
- 推荐 API 响应时间 < 2s（命中缓存时 < 200ms）
- 每日推荐功能使用率 > 50%（查看过推荐页面的用户比例）

## Open Questions

- 推荐算法是否需要考虑 memo 之间的相似性（避免推荐相似内容）？
- 是否需要记录用户对推荐的点击行为用于后续优化？
- 时区处理：使用服务器时区还是用户本地时区？
