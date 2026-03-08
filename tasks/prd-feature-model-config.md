# PRD: 功能级 LLM 模型配置

## 1. 介绍

目前，回顾模式（ReviewService）、AI 探索（ExploreService）、标签生成（AIService）三个功能均通过 `config.openai.*` 硬编码初始化 LangChain `ChatOpenAI`，无法使用用户在 `user_models` 表中配置的自定义模型。

本需求在系统中新增一张 `user_feature_configs` 配置表，允许用户为每个 AI 功能单独指定使用哪个 `user_models` 中的模型。未配置时回退到系统默认（`config.openai.*`）。同时将三个服务的 LLM 调用改造为通过 `LLMService` 执行，彻底消除硬编码。

---

## 2. 目标

- 允许用户为"回顾模式"、"AI 探索"、"标签生成"三个功能分别指定 LLM 模型
- 未配置时系统自动使用默认模型（`config.openai.*`），不破坏现有行为
- 将 `ReviewService`、`ExploreService`、`AIService` 的 LLM 调用统一走 `LLMService`
- 前端在各功能页面提供模型选择入口

---

## 3. 用户故事

### US-001: 新建 user_feature_configs 数据库表

**描述：** 作为开发者，我需要一张表来持久化每个用户对每个 AI 功能的模型选择。

**Acceptance Criteria:**

- [ ] 在 `apps/server/src/db/schema/` 下新建 `user-feature-configs.ts`，包含以下字段：
  - `id` VARCHAR(191) PRIMARY KEY
  - `userId` VARCHAR(191) NOT NULL（关联 users.uid）
  - `feature` VARCHAR(50) NOT NULL（枚举值：`review` | `explore` | `tag_generation`）
  - `modelId` VARCHAR(191)（关联 user_models.id，允许为 NULL 表示使用系统默认）
  - `createdAt` TIMESTAMP
  - `updatedAt` TIMESTAMP
  - 唯一索引：`(userId, feature)`
- [ ] 从 `schema/index.ts` 导出新 schema
- [ ] `pnpm build` 后 `pnpm migrate:generate` 生成迁移文件，SQL 正确
- [ ] Typecheck 通过

---

### US-002: 新建 UserFeatureConfigService

**描述：** 作为开发者，我需要一个 Service 来读写用户功能配置，并能在没有配置时提供系统默认模型信息。

**Acceptance Criteria:**

- [ ] 在 `apps/server/src/services/user-feature-config.service.ts` 实现 `UserFeatureConfigService`，装饰 `@Service()`
- [ ] 提供 `getConfig(userId, feature)` → 返回 `modelId | null`
- [ ] 提供 `setConfig(userId, feature, modelId | null)` → upsert（有则更新，无则插入）
- [ ] 提供 `getModelForFeature(userId, feature)` → 返回该功能应使用的模型配置对象：
  - 若用户配置了 modelId，从 `UserModelService.getModel()` 获取并返回
  - 若未配置（null），返回基于 `config.openai.*` 构造的默认模型对象（provider: 'openai', apiKey, baseURL, modelName）
- [ ] Typecheck 通过

---

### US-003: 新建 UserFeatureConfig API 端点

**描述：** 作为前端，我需要 REST API 来读取和更新用户的功能模型配置。

**Acceptance Criteria:**

- [ ] 在 `apps/server/src/controllers/v1/` 新建 `user-feature-config.controller.ts`
- [ ] `GET /api/v1/user-feature-configs` → 返回当前用户所有功能的配置列表（三个功能，每个包含 feature、modelId）
- [ ] `PUT /api/v1/user-feature-configs/:feature` → 更新指定功能的 modelId（body: `{ modelId: string | null }`）
- [ ] 所有端点需要认证（`@CurrentUser() user`）
- [ ] feature 参数校验：只接受 `review` | `explore` | `tag_generation`，非法值返回 400
- [ ] Typecheck 通过

---

### US-004: 改造 ReviewService 使用 LLMService

**描述：** 作为用户，我希望回顾模式使用我配置的模型来生成问题和评估答案。

**Acceptance Criteria:**

- [ ] `ReviewService` 移除 `private model: ChatOpenAI` 和构造函数中的硬编码初始化
- [ ] 注入 `LLMService` 和 `UserFeatureConfigService`
- [ ] `generateQuestion(content, userId)` 和 `evaluateAnswer(answer, memoContent, question, userId)` 接收 `userId` 参数
- [ ] 内部调用改为：通过 `UserFeatureConfigService.getModelForFeature(userId, 'review')` 获取模型配置，然后直接使用 `fetch` 调用 OpenAI 兼容 API（与 `LLMService.chatWithModel` 相同逻辑），或直接调用 `LLMService.chat(userId, ...)` 并传入正确模型
- [ ] 若用户未配置模型，回退到系统默认（`config.openai.*`），行为与改造前一致
- [ ] Typecheck 通过

---

### US-005: 改造 ExploreService 使用 LLMService

**描述：** 作为用户，我希望 AI 探索功能使用我配置的模型来分析和生成内容。

**Acceptance Criteria:**

- [ ] `ExploreService` 移除构造函数中的硬编码 `ChatOpenAI` 初始化
- [ ] 注入 `UserFeatureConfigService`
- [ ] `explore()` 方法接收 `userId` 参数（检查现有签名，若已有则直接使用）
- [ ] 在需要调用 LLM 时，通过 `UserFeatureConfigService.getModelForFeature(userId, 'explore')` 动态获取模型配置并构造 `ChatOpenAI` 实例（或等效调用）
- [ ] 若用户未配置模型，回退到 `config.openai.*`
- [ ] Typecheck 通过

---

### US-006: 改造 AIService（标签生成）使用 LLMService

**描述：** 作为用户，我希望标签生成功能使用我配置的模型。

**Acceptance Criteria:**

- [ ] `AIService` 移除构造函数中的硬编码 `ChatOpenAI` 初始化
- [ ] 注入 `UserFeatureConfigService`
- [ ] `generateTags(content, userId)` 接收 `userId` 参数
- [ ] 内部通过 `UserFeatureConfigService.getModelForFeature(userId, 'tag_generation')` 获取模型配置
- [ ] 调用 `AIService.generateTags` 的上游代码（controller 或其他 service）需同步传入 userId
- [ ] 若用户未配置模型，回退到 `config.openai.*`
- [ ] Typecheck 通过

---

### US-007: 前端回顾页面添加模型选择

**描述：** 作为用户，我希望在回顾功能页面能选择使用哪个模型。

**Acceptance Criteria:**

- [ ] 在回顾页面（`apps/web/src/pages/` 中回顾相关页面）的设置/配置区域，添加"AI 模型"下拉选择器
- [ ] 下拉列表从 `GET /api/v1/user-models` 获取用户配置的模型列表，加上"系统默认"选项
- [ ] 当前选中值从 `GET /api/v1/user-feature-configs` 读取
- [ ] 选择后调用 `PUT /api/v1/user-feature-configs/review` 保存
- [ ] Typecheck 通过
- [ ] 在浏览器中验证：下拉正常显示，选择后刷新页面仍保持选中状态

---

### US-008: 前端 AI 探索页面添加模型选择

**描述：** 作为用户，我希望在 AI 探索页面能选择使用哪个模型。

**Acceptance Criteria:**

- [ ] 在 AI 探索页面（`apps/web/src/pages/ai-explore/`）的设置/配置区域，添加"AI 模型"下拉选择器
- [ ] 同 US-007，从 user-models 获取列表，读写 `explore` 功能配置
- [ ] Typecheck 通过
- [ ] 在浏览器中验证：下拉正常显示，选择后刷新页面仍保持选中状态

---

## 4. 功能需求

- **FR-1:** 新建 `user_feature_configs` 表，唯一约束 `(userId, feature)`，支持 upsert
- **FR-2:** feature 枚举值：`review`、`explore`、`tag_generation`
- **FR-3:** `modelId` 为 NULL 表示使用系统默认（`config.openai.*`），非 NULL 时从 `user_models` 表读取配置
- **FR-4:** `ReviewService`、`ExploreService`、`AIService` 不再在构造函数中硬编码 `ChatOpenAI`，改为按需动态获取模型配置
- **FR-5:** 系统默认回退逻辑：当 modelId 为 null 时，使用 `config.openai.apiKey`、`config.openai.baseURL`、`config.openai.model || 'gpt-4o-mini'`
- **FR-6:** 前端回顾页和探索页各提供一个模型选择下拉，选项包含"系统默认"和用户配置的所有模型
- **FR-7:** API 端点 `PUT /api/v1/user-feature-configs/:feature` 传入 `{ modelId: null }` 表示重置为系统默认

---

## 5. 非目标（Out of Scope）

- 不修改 `recommendation.service.ts`（每日推荐功能）的 LLM 调用方式
- 不为每个 ReviewProfile 单独配置模型（profile 级别的模型配置）
- 不提供全局"所有功能统一使用此模型"的一键配置
- 不在设置页（Settings）新增模型配置入口（仅在功能页内配置）
- 不修改 embedding 相关服务的配置方式

---

## 6. 技术考量

### 服务改造模式

`UserFeatureConfigService.getModelForFeature()` 返回统一的模型描述对象：

```typescript
interface FeatureModelConfig {
  apiKey: string;
  baseURL: string;
  modelName: string;
  provider: string;
}
```

各服务用此对象动态构造 `ChatOpenAI`（LangChain）或直接 `fetch` 调用，替换原来的硬编码初始化。

### ExploreService 特殊性

`ExploreService` 使用 LangGraph 工作流，`ChatOpenAI` 实例在 `initializeWorkflow()` 中被多个节点共享。改造时需在 `explore()` 调用时按 userId 动态初始化，避免实例复用导致跨用户污染。

### 数据库约束

`user_feature_configs` 的 `(userId, feature)` 唯一约束确保每个用户每个功能只有一条配置记录，使用 MySQL `INSERT ... ON DUPLICATE KEY UPDATE` 实现 upsert（Drizzle ORM 的 `.onDuplicateKeyUpdate()`）。

---

## 7. 成功指标

- 用户在回顾页选择自定义模型后，生成的问题和评估反馈使用该模型
- 用户在探索页选择自定义模型后，探索结果使用该模型
- 未配置模型的用户行为与改造前完全一致（无回归）
- 所有 Typecheck 和 Lint 通过

---

## 8. 开放问题

- `ExploreService` 的 `explore()` 方法当前签名是否已包含 `userId`？需在实现时确认，若无需添加。
- 标签生成的调用链（controller → service）需确认所有调用方是否都有 userId 可传入。
