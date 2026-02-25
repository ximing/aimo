# PRD: 历史的今天 (On This Day)

## Introduction

在热力图下方增加一个"历史的今天"横幅，展示用户在往年同一日期（如2月18日）创建的 memos。帮助用户回顾历史记录，发现过去的想法和记忆。

## Goals

- 在首页热力图下方展示"历史的今天"横幅
- 自动筛选并展示往年今日创建的 memos
- 提供横向滚动浏览体验
- 当没有历史记录时，完全隐藏该区块
- 支持点击查看 memo 详情

## User Stories

### US-001: 后端 API - 获取历史的今天 memos

**Description:** 作为开发者，我需要提供一个 API 端点来获取往年今日创建的 memos。

**Acceptance Criteria:**

- [ ] 创建 GET `/api/v1/memos/on-this-day` 端点
- [ ] 根据当前日期（MM-DD）筛选往年同一日期的 memos
- [ ] 按年份倒序排列（最近的年份在前）
- [ ] 最多返回 10 条记录
- [ ] 返回字段：id, content, createdAt, 年份
- [ ] Typecheck passes

### US-002: 前端组件 - 历史的今天横幅

**Description:** 作为用户，我想在热力图下方看到"历史的今天"横幅，浏览往年今日的 memos。

**Acceptance Criteria:**

- [ ] 在热力图下方创建横向滚动横幅组件
- [ ] 显示标题"历史的今天 🕰️"
- [ ] 每个 memo 卡片显示：内容预览（最多2行）、年份标签
- [ ] 横向滚动，支持触摸滑动和鼠标滚轮
- [ ] 当没有历史记录时，整个区块隐藏
- [ ] 最多显示 5 条，超出显示"查看更多"入口
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-003: 点击交互 - 查看 memo 详情

**Description:** 作为用户，我想点击卡片查看完整的 memo 内容。

**Acceptance Criteria:**

- [ ] 点击卡片打开 memo 详情弹窗/页面
- [ ] 复用现有的 memo 详情展示组件
- [ ] 显示完整的 memo 内容、创建时间、年份
- [ ] 支持关闭弹窗返回首页
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-004: 响应式适配

**Description:** 作为用户，我期望在不同设备上都能正常浏览"历史的今天"。

**Acceptance Criteria:**

- [ ] 移动端：卡片宽度适配屏幕，保持横向滚动
- [ ] 桌面端：显示 3-4 个卡片，超出部分可滚动
- [ ] 平板：中间尺寸适配
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: 提供 GET `/api/v1/memos/on-this-day` API，返回往年今日 memos
- FR-2: 仅返回往年记录（排除今年当天）
- FR-3: 按年份倒序排列（2024 → 2023 → 2022）
- FR-4: 前端横幅组件显示在热力图下方
- FR-5: 每个卡片显示内容预览（最多80字符）和年份标签
- FR-6: 空状态时完全隐藏横幅区块
- FR-7: 最多显示 5 条，超出显示"查看更多"按钮
- FR-8: 点击卡片打开 memo 详情（复用现有详情组件）
- FR-9: 支持横向滚动浏览

## Non-Goals

- 不显示今年当天的 memos（避免与主列表重复）
- 不支持在横幅内直接编辑或删除 memos
- 不支持筛选特定年份
- 不需要动画过渡效果（初始版本）
- 不需要分享功能

## Design Considerations

- **位置:** 热力图下方，与主内容区域保持适当间距
- **样式:** 使用与现有 UI 一致的卡片设计
- **标题:** 左侧显示"历史的今天" + 时钟图标
- **卡片:** 固定宽度（移动端 280px，桌面端 240px）
- **年份标签:** 右上角或左上角显示，使用 muted 颜色
- **查看更多:** 最后一个卡片位置，显示"+N 更多"文字

## Technical Considerations

- **后端:** 使用 LanceDB 的日期过滤功能，提取 MM-DD 进行匹配
- **前端:** 使用横向 flex + overflow-x-auto 实现滚动
- **组件复用:** 尽可能复用现有的 MemoCard 或创建 OnThisDayCard 变体
- **性能:** 页面加载时异步获取数据，不阻塞主内容渲染
- **缓存:** 考虑本地缓存当天结果，避免重复请求

## Success Metrics

- API 响应时间 < 200ms
- 横幅在有历史记录时正常显示
- 空状态时横幅完全隐藏，不占用空间
- 用户可顺利点击查看 memo 详情

## Open Questions

- 是否需要显示"N年前的今天"相对时间提示？
- 查看更多点击后跳转到搜索页面还是展开全部？
- 是否需要支持左右箭头按钮切换卡片？
