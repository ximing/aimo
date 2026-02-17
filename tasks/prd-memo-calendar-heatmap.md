# PRD: Memo 列表页日历热力图

## Introduction

在 Memo 列表页左侧增加一列可收起的热力图区域，展示用户最近 3 个月的 memo 创建/更新频率。该功能兼具视觉装饰、记录习惯分析和快速日期导航三重价值。

## Goals

- 以 GitHub 风格日历热力图展示 memo 活跃度
- 支持完全收起/展开左侧热力图列
- 点击热力图日期可筛选该日期的 memo
- 收起状态记忆用户偏好

## User Stories

### US-001: 创建热力图组件
**Description:** 作为开发者，我需要创建一个可复用的日历热力图组件，用于展示 memo 活跃度数据。

**Acceptance Criteria:**
- [ ] 实现类似 GitHub 的方块网格热力图（7行 x ~13周）
- [ ] 支持 4 个颜色等级：无数据、低、中、高活跃
- [ ] 显示月份标签在顶部
- - [ ] 鼠标悬停显示具体日期和 memo 数量 tooltip
- [ ] 组件接受 `data: Array<{date: string, count: number}>` 作为输入
- [ ] 点击日期触发 `onDateSelect` 回调
- [ ] Typecheck/lint passes

### US-002: 左侧热力图列布局
**Description:** 作为用户，我希望在 memo 列表左侧看到热力图，且可以收起它以获得更多空间。

**Acceptance Criteria:**
- [ ] 在现有 memo 列表左侧新增固定宽度列（默认展开，宽度约 200px）
- [ ] 列顶部放置热力图组件
- [ ] 下方区域留白（为后续功能预留）
- [ ] 列右侧有收起/展开按钮
- [ ] 收起时列完全隐藏，只显示悬浮展开按钮
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: 热力图数据接口
**Description:** 作为开发者，我需要后端 API 提供 memo 活跃度统计数据。

**Acceptance Criteria:**
- [ ] 创建 GET `/api/v1/memos/stats/activity` 接口
- [ ] 返回最近 90 天的每日 memo 数量统计
- [ ] 数据格式：`{ date: '2025-11-20', count: 5, hasUpdate: boolean }`
- [ ] 只需统计当前登录用户的 memo
- [ ] 支持前端缓存（返回适当 Cache-Control 头）
- [ ] 添加对应前端 API 调用方法
- [ ] Typecheck/lint passes

### US-004: 点击日期筛选 memo
**Description:** 作为用户，我想点击热力图的某一天，只查看那天的 memo。

**Acceptance Criteria:**
- [ ] 点击热力图日期，memo 列表筛选为该日期
- [ ] URL 参数更新为 `?date=2025-11-20`
- [ ] 筛选状态在 UI 中清晰显示（如："2025年11月20日的 Memo"）
- [ ] 提供清除筛选按钮，返回全部 memo
- [ ] 再次点击同一日期取消筛选
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-005: 记住收起状态
**Description:** 作为用户，我希望系统记住我是否收起了热力图列，下次打开还是这个状态。

**Acceptance Criteria:**
- [ ] 收起状态保存到 localStorage
- [ ] key: `aimo:heatmap:collapsed`
- [ ] 页面加载时读取该设置
- [ ] 切换状态时实时保存
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: 热力图显示最近 90 天（约 13 周）的 memo 活跃度
- FR-2: 颜色等级根据当日 memo 数量划分：0（透明/灰色）、1-2（浅绿）、3-5（中绿）、6+（深绿）
- FR-3: 热力图列为固定宽度（200px），位于 memo 列表左侧
- FR-4: 收起按钮在列右侧边缘，悬浮或固定显示
- FR-5: 收起状态下，显示悬浮展开按钮（位于左侧边缘）
- FR-6: 日期筛选与现有筛选器共存，显示为标签形式
- FR-7: 热力图数据每天自动刷新，或页面重新打开时刷新

## Non-Goals

- 不支持滑动/拖拽查看其他时间范围（固定最近 3 个月）
- 不支持在热力图上直接预览 memo 内容
- 不显示连续记录天数（streak）统计
- 不与其他用户对比数据

## Design Considerations

- 热力图风格参考 GitHub Contributions 图表
- 使用绿色系颜色方案（与主题协调可调整）
- 收起按钮使用 ChevronLeft/Right 图标
- 方块大小约 10-12px，间距 2-3px
- 列背景色与主内容区有轻微区分（可选）

## Technical Considerations

- 热力图数据可以前端聚合现有 memo 列表数据（如果已有全量数据），或单独请求
- 考虑 memo 量大时的性能，建议后端聚合接口
- 列收起/展开使用 CSS transform 或 width transition 实现平滑动画
- 响应式：小屏幕（<768px）默认收起热力图列

## Success Metrics

- 热力图加载时间 < 500ms
- 收起/展开动画流畅（60fps）
- 用户可以通过热力图在 2 次点击内跳转到特定日期

## Open Questions

- 是否需要显示星期标签（Mon-Sun）？
- 深色模式下热力图颜色是否需要调整？
- 收起按钮的具体位置：固定在顶部还是跟随滚动？
