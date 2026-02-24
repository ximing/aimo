# PRD: AI Tag Assistant

## Introduction

在 memo 卡片上增加 AI 工具入口，用户可以通过点击 AI 按钮打开工具面板，选择"智能添加标签"功能。AI 会分析笔记内容，生成相关的标签建议，用户可以在弹窗中查看、编辑和选择这些标签，确认后直接添加到 memo 上。该功能旨在帮助用户更高效地组织和分类笔记，同时为未来扩展更多 AI 工具预留架构空间。

## Goals

- 在 memo 卡片上提供清晰的 AI 工具入口
- 通过 AI 分析笔记内容，智能生成相关标签建议
- 允许用户在弹窗中查看、多选和二次编辑标签
- 支持 AI 生成全新的标签（不局限于已有标签）
- 设计可扩展的架构，支持未来添加更多 AI 工具
- 提供流畅的用户体验，从点击到添加标签不超过 3 步

## User Stories

### US-001: 在 memo 卡片添加 AI 按钮
**Description:** 作为用户，我希望在 memo 卡片上快速找到 AI 工具入口，以便使用智能功能。

**Acceptance Criteria:**
- [ ] 在 memo 卡片右上角添加 AI 工具按钮（图标形式，如 Sparkles 或 Wand）
- [ ] 按钮hover 时显示 tooltip "AI 工具"
- [ ] 按钮点击后打开 AI 工具选择弹窗
- [ ] 按钮样式与现有卡片设计协调，不突兀
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-002: 创建 AI 工具选择弹窗
**Description:** 作为用户，我希望在点击 AI 按钮后看到一个工具列表，以便选择需要的 AI 功能。

**Acceptance Criteria:**
- [ ] 弹窗标题为 "AI 工具"
- [ ] 当前只显示一个工具："智能添加标签"（图标 + 名称 + 简短描述）
- [ ] 点击工具后进入该工具的具体界面
- [ ] 弹窗右上角有关闭按钮，点击外部也可关闭
- [ ] 弹窗样式与系统整体设计风格一致
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: 后端 API - AI 生成标签
**Description:** 作为开发者，我需要一个后端接口来调用 AI 分析笔记内容并生成标签建议。

**Acceptance Criteria:**
- [ ] 创建 POST /api/v1/ai/generate-tags 接口
- [ ] 接收参数：memoId 和 memoContent
- [ ] 使用 OpenAI API 分析内容并生成 3-8 个相关标签
- [ ] 返回标签数组，每个标签包含 name 字段
- [ ] 接口需要用户认证（@CurrentUser）
- [ ] API 响应时间控制在 3 秒内
- [ ] Typecheck/lint passes
- [ ] 单元测试覆盖主要逻辑

### US-004: 创建标签建议展示弹窗
**Description:** 作为用户，我希望在选择"智能添加标签"后看到 AI 生成的标签建议，以便决定使用哪些。

**Acceptance Criteria:**
- [ ] 弹窗显示加载状态（"AI 正在分析内容..."）
- [ ] 加载完成后显示生成的标签列表
- [ ] 每个标签显示为可勾选的 chip/checkbox 样式
- [ ] 默认所有标签都被选中
- [ ] 提供输入框允许用户添加自定义标签
- [ ] 底部显示"确认添加"和"取消"按钮
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-005: 标签二次编辑功能
**Description:** 作为用户，我希望能够修改 AI 生成的标签，以便让标签更符合我的需求。

**Acceptance Criteria:**
- [ ] 点击已生成的标签可进入编辑模式
- [ ] 编辑时显示输入框，允许修改标签文本
- [ ] 按 Enter 或失去焦点确认修改
- [ ] 每个标签右侧有删除按钮（X 图标）可移除该标签
- [ ] 输入框支持添加全新标签（输入后按 Enter 添加）
- [ ] 防止添加重复标签（不区分大小写）
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-006: 后端 API - 批量更新 memo 标签
**Description:** 作为开发者，我需要一个接口来将用户确认的标签批量添加到 memo 上。

**Acceptance Criteria:**
- [ ] 创建 PUT /api/v1/memos/:id/tags 接口（或复用现有更新接口）
- [ ] 接收参数：tags 数组（字符串数组）
- [ ] 更新 memo 的标签字段
- [ ] 返回更新后的 memo 数据
- [ ] 检查用户有权限修改该 memo
- [ ] Typecheck/lint passes
- [ ] 单元测试覆盖权限校验和更新逻辑

### US-007: 前端标签确认与提交
**Description:** 作为用户，我希望在选择和编辑完标签后，一键将它们添加到我的笔记上。

**Acceptance Criteria:**
- [ ] 点击"确认添加"后调用 API 保存标签
- [ ] 保存成功后关闭弹窗，显示成功提示（toast）
- [ ] memo 卡片上立即显示新增的标签
- [ ] 点击"取消"关闭弹窗，不保存任何更改
- [ ] 保存过程中按钮显示 loading 状态，防止重复提交
- [ ] 如果 API 失败，显示错误提示，保留用户选择状态
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-008: AI 工具架构扩展支持
**Description:** 作为开发者，我希望架构能支持未来轻松添加更多 AI 工具，以便扩展功能。

**Acceptance Criteria:**
- [ ] 前端：AI 工具配置使用数组/对象结构，便于添加新工具
- [ ] 前端：弹窗内容根据工具类型动态渲染
- [ ] 后端：AI 相关接口有清晰的路由结构（/api/v1/ai/*）
- [ ] 创建 AIService 类集中管理 AI 相关逻辑
- [ ] 预留其他 AI 工具的接口位置（如 /ai/summarize, /ai/translate）
- [ ] Typecheck/lint passes

## Functional Requirements

- FR-1: 在 memo 卡片右上角添加 AI 工具入口按钮，点击打开 AI 工具选择面板
- FR-2: AI 工具面板显示可用工具列表，当前仅包含"智能添加标签"工具
- FR-3: 点击工具后显示标签生成界面，自动调用后端 API 分析笔记内容
- FR-4: 后端使用 OpenAI API 根据笔记内容生成 3-8 个相关标签建议
- FR-5: AI 生成的标签可以全新创建，不限于用户历史标签
- FR-6: 标签建议以可勾选列表形式展示，默认全部选中
- FR-7: 用户可以取消选择不需要的标签
- FR-8: 用户可以点击标签进行编辑修改
- FR-9: 用户可以删除不需要的标签建议
- FR-10: 提供输入框供用户添加自定义标签（回车确认）
- FR-11: 系统防止添加重复标签（不区分大小写比较）
- FR-12: 用户点击"确认添加"后，将选中的标签批量保存到 memo
- FR-13: 保存成功后 memo 卡片即时更新显示新标签
- FR-14: 整个流程支持取消操作，取消后不保存任何更改
- FR-15: 架构设计预留扩展性，支持后续添加更多 AI 工具

## Non-Goals

- 不支持自动保存标签（必须经过用户确认）
- 不支持 AI 删除或修改 memo 已有标签（只建议新增）
- 不支持批量为多个 memo 同时添加标签
- 不支持 AI 工具的历史记录或撤销功能
- 不实现其他 AI 工具（如总结、翻译等）的具体功能，仅预留扩展架构
- 不需要支持离线状态下的 AI 功能

## Design Considerations

### UI/UX
- AI 按钮使用 Sparkles 或 Wand 图标，hover 时显示微光动效吸引注意
- 工具选择弹窗采用简洁的列表设计，每项显示图标、名称和描述
- 标签建议弹窗使用卡片式布局，标签以 chip 形式展示
- 编辑标签时，chip 变为输入框，保持视觉连贯性
- 添加自定义标签的输入框使用 placeholder: "输入新标签，按回车添加"

### 组件复用
- 复用现有的 memo 卡片组件，在其上添加 AI 按钮
- 复用现有的 Dialog/Modal 组件用于弹窗
- 复用现有的 Tag/Badge 组件展示标签
- 复用现有的 Button 和 Loading 组件

### 状态管理
- 使用 @rabjs/react 管理 AI 弹窗的打开状态
- 临时标签编辑状态在组件本地 state 管理

## Technical Considerations

### 后端架构
- 在 `apps/server/src/controllers/v1/` 创建 `ai.controller.ts`
- 在 `apps/server/src/services/` 创建 `ai.service.ts` 集中处理 AI 调用
- AI 路由以 `/api/v1/ai` 为前缀
- 使用现有的 OpenAI 配置和 EmbeddingService 模式

### API 设计
```typescript
// POST /api/v1/ai/generate-tags
interface GenerateTagsRequest {
  memoId: string;
  content: string;
}

interface GenerateTagsResponse {
  tags: string[];
}

// PUT /api/v1/memos/:id/tags
interface UpdateMemoTagsRequest {
  tags: string[];
}
```

### AI Prompt 设计
- 系统提示词："你是一个笔记标签助手。请分析用户笔记内容，生成 3-8 个简洁、相关的标签。标签应该概括内容主题，便于分类检索。只返回标签数组，不要其他解释。"
- 用户提示词：笔记内容
- 返回格式：JSON 数组 ["tag1", "tag2", "tag3"]

### 错误处理
- AI 调用失败时返回友好错误提示
- 生成超时（>5秒）时显示"生成超时，请重试"
- 用户网络异常时保留编辑状态，允许重试

### 性能考虑
- AI 生成是实时调用，需要显示加载状态
- 标签保存后前端乐观更新，提升感知速度

## Success Metrics

- 用户从点击 AI 按钮到完成标签添加的平均操作时间 < 30 秒
- 用户对 AI 生成标签的采纳率（至少选择一个建议标签）> 60%
- 页面加载 AI 弹窗无感知延迟（< 100ms）
- API 响应时间 < 3 秒（95 百分位）
- 用户可以通过 3 步以内完成整个流程

## Open Questions

- 是否需要限制 AI 生成标签的数量上限？
- 是否需要对 AI 生成的标签进行敏感词过滤？
- 是否需要记录用户采纳/拒绝 AI 建议的数据用于后续优化？
- 当 memo 已有较多标签时，是否还需要显示 AI 建议？
