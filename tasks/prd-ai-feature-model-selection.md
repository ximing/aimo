# PRD: AI 功能模型选择配置

## Introduction

当前 AIMO 的 AI 探索、AI 回顾、智能生成 Tag 三个功能均硬编码使用系统环境变量 `OPENAI_MODEL` 配置的模型。用户在 `settings/models` 页面已可管理多个大模型配置，但这些配置尚未被 AI 功能所使用。

本功能允许用户为每个 AI 功能单独指定使用哪个模型，模型列表来源于 `settings/models` 页面配置的大模型，兜底使用系统环境变量中配置的默认模型。

## Goals

- AI 探索：在输入框区域提供模型切换下拉，用户可在对话中随时切换模型
- AI 回顾：在 Profile 模式设置中增加模型选择字段，每个 Profile 可绑定不同模型
- 智能生成 Tag：在设置页面（`/settings/tags` 或现有入口）增加默认模型选择
- 兜底逻辑：用户未选择时，使用系统环境变量 `OPENAI_MODEL` 配置的模型

## User Stories

### US-001: 后端支持通过 userModelId 调用指定模型
**Description:** As a developer, I need the backend AI services to accept an optional `userModelId` parameter so that each AI feature can use a user-specified model.

**Acceptance Criteria:**
- [ ] `AIService` 新增方法 `getModelClient(userId, userModelId?)` —— 当 `userModelId` 存在时从 `user_models` 表查询对应模型配置并构建 `ChatOpenAI` 实例；否则使用环境变量默认配置
- [ ] `ExploreService.query()` 接受可选 `userModelId` 参数，传入 `getModelClient` 使用
- [ ] `AIService.generateTags()` 接受可选 `userModelId` 参数，传入 `getModelClient` 使用
- [ ] 若指定的 `userModelId` 不存在或不属于当前用户，抛出明确错误（不静默降级）
- [ ] Typecheck 通过

---

### US-002: AI 探索输入框增加模型选择器
**Description:** As a user, I want to select which AI model to use for my exploration query directly in the input area so that I can switch models without leaving the page.

**Acceptance Criteria:**
- [ ] 输入框区域（底部浮动工具栏）新增模型选择下拉按钮，显示当前选中模型名称（或 "默认模型"）
- [ ] 下拉列表展示用户在 `settings/models` 配置的所有模型，顶部有 "默认模型" 选项
- [ ] 选择后状态持久化到 `localStorage`（key: `explore_selected_model_id`），刷新后恢复
- [ ] 发送查询时将选中的 `userModelId` 传递给后端 `/api/v1/explore` 接口
- [ ] 若用户没有配置任何模型，下拉仅显示 "默认模型" 选项
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

---

### US-003: 前端 API 层支持传递 userModelId 给 AI 探索
**Description:** As a developer, I need the explore API call to include an optional `userModelId` field so the backend can use the specified model.

**Acceptance Criteria:**
- [ ] `apps/web/src/api/explore.ts`（或对应文件）的请求体新增可选字段 `userModelId?: string`
- [ ] `ExploreService`（前端）发送查询时携带当前选中的 `userModelId`
- [ ] 后端 `ExploreController` 接收并透传 `userModelId` 给 `ExploreService`
- [ ] Typecheck 通过

---

### US-004: Review Profile 增加模型选择字段（数据库 + DTO）
**Description:** As a developer, I need to store the selected model for each review profile in the database so it persists across sessions.

**Acceptance Criteria:**
- [ ] `review_profiles` 表新增字段 `userModelId VARCHAR(191) NULL`（可为空，空时使用默认模型）
- [ ] 生成并执行数据库迁移，现有 Profile 数据不受影响
- [ ] `ReviewProfileDto` 新增可选字段 `userModelId?: string`
- [ ] `packages/dto` 重新构建后 typecheck 通过

---

### US-005: AI 回顾 Profile 设置面板增加模型选择
**Description:** As a user, I want to assign a specific AI model to each review profile so that different profiles can use different models.

**Acceptance Criteria:**
- [ ] `ProfileDetailPanel` 组件（`/apps/web/src/pages/review/components/`）的设置表单中新增 "AI 模型" 选择字段
- [ ] 下拉列表展示用户配置的所有模型，顶部有 "默认模型" 选项
- [ ] 创建/编辑 Profile 时保存 `userModelId`，读取时回显已选模型
- [ ] AI 回顾生成问题时将 Profile 的 `userModelId` 传给后端
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

---

### US-006: AI 回顾后端使用 Profile 绑定的模型
**Description:** As a developer, I need the review question generation to use the model specified in the profile so that each profile's model setting takes effect.

**Acceptance Criteria:**
- [ ] `ReviewController`（或 `AIService` 中的回顾相关方法）接收 `userModelId` 参数
- [ ] 调用 `AIService.getModelClient(userId, userModelId?)` 获取对应模型实例
- [ ] Typecheck 通过

---

### US-007: 智能生成 Tag 的默认模型设置（设置页）
**Description:** As a user, I want to configure which model is used for auto-generating tags so that I can use a preferred model for this feature.

**Acceptance Criteria:**
- [ ] 在设置页面（`/settings/tags` 或现有 Tag 相关设置入口）新增 "智能生成 Tag 模型" 选择项
- [ ] 若该设置入口不存在，在 `/settings` 侧边栏新增 "标签设置" 入口并创建对应页面
- [ ] 下拉列表展示用户配置的所有模型，顶部有 "默认模型" 选项
- [ ] 选择保存后存储到用户偏好（`user_settings` 表或 `localStorage`，优先持久化到后端）
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

---

### US-008: 前端 UserModelService 提供模型列表给各功能使用
**Description:** As a developer, I need a shared way to fetch the user's model list so that all AI feature components can reuse it without duplicate API calls.

**Acceptance Criteria:**
- [ ] `UserModelService`（`apps/web/src/services/user-model.service.ts`）已有 `loadModels()` 方法，确认其在 App 初始化时被调用（或各功能页面按需调用）
- [ ] 各功能组件（AI 探索、Profile 设置、Tag 设置页）通过 `UserModelService.models` observable 获取模型列表，不重复请求
- [ ] Typecheck 通过

---

## Functional Requirements

- **FR-1**: 后端 `AIService` 提供 `getModelClient(userId: string, userModelId?: string): ChatOpenAI` 方法，当 `userModelId` 为空时使用环境变量默认配置
- **FR-2**: AI 探索输入框区域显示模型选择下拉，选择持久化到 `localStorage`
- **FR-3**: 发送 AI 探索查询时，请求体携带可选 `userModelId` 字段
- **FR-4**: `review_profiles` 表新增 `userModelId` 字段，Profile DTO 同步更新
- **FR-5**: AI 回顾 Profile 设置面板包含模型选择字段，保存时持久化
- **FR-6**: AI 回顾生成问题时使用 Profile 绑定的模型（或默认模型）
- **FR-7**: 设置页提供 Tag 智能生成的模型选择，持久化到后端用户设置
- **FR-8**: 智能生成 Tag 时使用用户在设置页配置的模型（或默认模型）
- **FR-9**: 所有功能的兜底逻辑：未选择模型时使用 `OPENAI_MODEL` 环境变量配置的模型

## Non-Goals

- 不修改 Embedding 模型的选择逻辑（Embedding 仍使用 `OPENAI_EMBEDDING_MODEL`）
- 不为单次对话消息级别提供模型切换（AI 探索以会话/查询为粒度，不是消息级别）
- 不实现模型性能对比或 A/B 测试
- 不修改 `settings/models` 页面本身的功能（模型管理已完整）
- 不为 OCR、ASR、多模态 Embedding 等功能添加模型选择

## Design Considerations

- **模型选择 UI 一致性**: 三个功能的下拉组件应使用相同的样式，可提取为 `ModelSelector` 共享组件
- **"默认模型" 选项**: 下拉顶部始终有 "默认模型（系统配置）" 选项，值为 `undefined`/`null`
- **无模型时的提示**: 若用户未配置任何模型，下拉显示 "未配置模型，使用系统默认" 并引导至 `/settings/models`
- **AI 探索模型选择位置**: 放置在输入框左侧或下方工具栏，与发送按钮同行，不遮挡输入区域

## Technical Considerations

- **模型客户端构建**: `getModelClient` 需要从数据库读取 `apiKey`、`apiBaseUrl`、`modelName`，构建 `ChatOpenAI({ apiKey, baseURL, modelName })`
- **安全**: `apiKey` 仅在后端使用，不下发到前端；前端仅传递 `userModelId`
- **Tag 模型设置存储**: 优先使用现有的用户设置机制（如有 `user_settings` 表则复用，否则新增字段到 `users` 表或新建 `user_preferences` 表）
- **数据库迁移**: `review_profiles.userModelId` 为 nullable，确保向后兼容

## Success Metrics

- 用户可在 AI 探索页面不离开当前页面切换模型
- AI 回顾不同 Profile 可使用不同模型
- Tag 智能生成模型可在设置页一次性配置，之后自动生效
- 所有功能在未配置用户模型时正常降级到系统默认模型，无报错

## Open Questions

- Tag 智能生成的模型设置入口：是新增 `/settings/tags` 页面，还是放在现有某个设置页面的某个 section？（建议新增 "标签设置" 页面以便后续扩展）
- 用户偏好（Tag 模型设置）是否需要存入数据库？还是 `localStorage` 足够？（建议存入数据库以支持多端同步）
- AI 探索的模型选择是否应该绑定到具体对话（Conversation），还是全局选择？（当前方案：全局 localStorage，不绑定到具体对话）
