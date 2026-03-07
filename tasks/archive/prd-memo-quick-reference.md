# PRD: Memo 快速引用功能

## Introduction

在 Memo 列表的卡片上增加一个"快速引用"入口，用户悬浮卡片时可见引用按钮，点击后自动将该 Memo 作为关联笔记添加到创建表单的 `selectedRelations` 中，并将页面滚动至输入框并聚焦，方便用户快速创建一条与当前笔记相关联的新笔记。

整个功能复用现有的 `memo_relations` 关系系统，不新增后端接口，只是为已有的"添加关联笔记"操作提供一个更快捷的入口。

## Goals

- 让用户可以从任意 Memo 卡片一键触发"创建关联笔记"流程
- 复用现有 `selectedRelations` 状态和 `relationIds` 提交逻辑，零后端改动
- 点击引用后自动聚焦输入框，减少操作步骤
- 不破坏现有卡片交互和关系展示逻辑

## User Stories

### US-001: 卡片悬浮显示引用按钮

**Description:** 作为用户，我希望在悬浮 Memo 卡片时能看到一个引用按钮，以便我知道可以快速创建关联笔记。

**Acceptance Criteria:**

- [ ] 鼠标悬浮在 Memo 卡片上时，操作区域出现一个"引用"按钮（使用 `Quote` 或 `Link` 图标，与现有操作按钮风格一致）
- [ ] 引用按钮仅在悬浮时显示（`group-hover` 控制），不占用常驻空间
- [ ] 按钮有 tooltip 提示文字"引用此笔记"
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-002: 点击引用按钮将 Memo 添加到创建表单的关联列表

**Description:** 作为用户，我希望点击引用按钮后，该 Memo 自动出现在创建表单的"已选关联"区域，这样我无需手动搜索就能建立关联。

**Acceptance Criteria:**

- [ ] 点击引用按钮后，该 Memo 被添加到 `MemoEditorForm` 的 `selectedRelations` 状态中
- [ ] 若该 Memo 已在 `selectedRelations` 中，则不重复添加（幂等）
- [ ] 添加后创建表单的关联标签区域（pill 样式）正确显示该 Memo 的摘要内容
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: 点击引用后页面滚动至输入框并聚焦

**Description:** 作为用户，我希望点击引用按钮后页面自动滚动到创建区域并聚焦输入框，这样我可以立即开始输入新笔记内容。

**Acceptance Criteria:**

- [ ] 点击引用按钮后，页面平滑滚动至 `MemoEditorForm` 所在位置
- [ ] 输入框（textarea）获得焦点，光标出现在文本末尾
- [ ] 滚动和聚焦在添加关联操作完成后执行
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: 提交新笔记时包含引用关系

**Description:** 作为用户，我希望通过快速引用创建的笔记在提交后，能在 memo_relations 表中正确建立与被引用笔记的关联关系。

**Acceptance Criteria:**

- [ ] 通过快速引用添加的 Memo ID 出现在提交时的 `relationIds` 数组中
- [ ] 提交后新建 Memo 的卡片上显示对应的关联笔记（复用现有 `memo.relations` 展示逻辑）
- [ ] 被引用 Memo 的 backlinks 中能查到新建的 Memo
- [ ] Typecheck/lint passes

## Functional Requirements

- FR-1: `memo-card.tsx` 中在现有操作按钮区域（`group-hover` 显示区）新增一个引用按钮，图标使用 `Quote` 或 `Link2`，样式与现有编辑/删除按钮一致
- FR-2: 引用按钮的 `onClick` 调用一个从父组件传入的回调 `onQuote?: (memo: MemoDto) => void`，将当前卡片的 Memo 对象向上传递
- FR-3: 在 Home 页面（`apps/web/src/pages/home/`）中实现 `handleQuoteMemo(memo: MemoDto)` 函数，该函数：
  1. 调用 `MemoEditorForm` 暴露的方法（通过 ref 或全局状态）将 memo 添加到 `selectedRelations`
  2. 滚动到编辑表单并聚焦 textarea
- FR-4: `MemoEditorForm` 需要支持外部调用 `addRelation(memo: MemoListItemDto)` 的方式，可通过以下任一方案实现：
  - 方案A：使用 `useImperativeHandle` 暴露 `addRelation` 方法（推荐，侵入性小）
  - 方案B：通过全局状态（如现有的 service 层）传递待添加的关联
- FR-5: 添加关联时检查重复：若 `selectedRelations` 中已包含该 `memoId`，跳过添加
- FR-6: 现有的 `selectedRelations` → `relationIds` → API 提交链路保持不变，无需修改

## Non-Goals

- 不新增后端 API 接口
- 不修改 `memo_relations` 数据结构或 DTO
- 不实现"引用时自动插入文本内容"（如 `[[标题]]` 格式）
- 不在编辑已有 Memo 时提供快速引用入口（仅针对创建新 Memo 的场景）
- 不实现批量引用多个 Memo

## Design Considerations

- **引用按钮位置**: 放在卡片右上角操作区（与现有的编辑、删除、更多按钮同区域），悬浮显示
- **图标选择**: 优先使用 `lucide-react` 的 `Quote` 图标；若视觉上不协调可使用 `Link2`
- **关联标签展示**: 复用现有 `selectedRelations` pill 样式，显示 Memo 内容的前 30 字符作为摘要
- **滚动行为**: 使用 `element.scrollIntoView({ behavior: 'smooth', block: 'start' })` 滚动到编辑区

## Technical Considerations

- **关键文件**:
  - `apps/web/src/pages/home/components/memo-card.tsx` — 新增引用按钮
  - `apps/web/src/components/memo-editor-form.tsx` — 暴露 `addRelation` 方法
  - `apps/web/src/pages/home/index.tsx`（或 Home 页面入口）— 实现 `handleQuoteMemo` 并串联两者
- **Ref 方案**: `MemoEditorForm` 使用 `forwardRef` + `useImperativeHandle` 暴露 `{ addRelation, focusTextarea }` 方法，Home 页面持有该 ref
- **现有状态**: `selectedRelations` 已在 `MemoEditorForm` 内部管理，通过暴露方法修改即可，无需提升状态
- **类型复用**: `onQuote` 回调参数类型直接使用现有的 `MemoDto` 或 `MemoListItemDto`（均来自 `@aimo/dto`）

## Success Metrics

- 用户从点击引用按钮到输入框聚焦的操作步骤 ≤ 1 次点击
- 快速引用创建的笔记在关系图谱中正确显示关联关系
- 不引入任何现有功能的回归问题

## Open Questions

- `MemoEditorForm` 当前是否已使用 `forwardRef`？若否，需确认改造是否影响其他调用方
- Home 页面的 `MemoEditorForm` 是否始终渲染在 DOM 中（非条件渲染），以确保 ref 始终可用
