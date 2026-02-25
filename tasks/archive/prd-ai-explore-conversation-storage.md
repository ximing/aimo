# PRD: AI探索对话持久化与侧边栏改造

## Introduction

当前AI探索页面的对话数据存储在前端 localStorage 中，存在数据易丢失、无法跨设备同步、无法长期保存的问题。本功能将对话数据迁移到后端 LanceDB 数据库存储，同时改造前端界面：左侧增加对话历史列表边栏，支持点击进入历史对话，移除顶部 header，并将输入框改为悬浮固定在底部，整体交互体验参考 ChatGPT。

## Goals

- 将对话数据从 localStorage 迁移到 LanceDB 持久化存储
- 左侧边栏展示对话历史列表，按最后更新时间排序
- 支持对话的删除、重命名操作
- 移除页面顶部 header，将导航整合到左侧边栏
- 输入框悬浮固定在底部，始终在视口内
- 保持现有AI探索功能不受影响

## User Stories

### US-001: 创建对话数据表结构

**Description:** 作为开发者，我需要在 LanceDB 中创建对话存储结构，以便持久化保存用户对话数据。

**Acceptance Criteria:**

- [ ] 在 LanceDB 中创建 `ai_conversations` 表，包含字段：id, userId, title, createdAt, updatedAt
- [ ] 创建 `ai_messages` 表，包含字段：id, conversationId, role, content, sources, createdAt
- [ ] 创建数据库迁移脚本
- [ ] 运行迁移成功，表结构验证通过
- [ ] Typecheck passes

### US-002: 后端 API - 对话 CRUD

**Description:** 作为开发者，我需要提供后端 API 来管理对话数据。

**Acceptance Criteria:**

- [ ] GET /api/explore/conversations - 获取用户的对话列表（按 updatedAt 倒序）
- [ ] GET /api/explore/conversations/:id - 获取单个对话详情（含消息列表）
- [ ] POST /api/explore/conversations - 创建新对话
- [ ] PUT /api/explore/conversations/:id - 更新对话（重命名标题）
- [ ] DELETE /api/explore/conversations/:id - 删除对话
- [ ] POST /api/explore/conversations/:id/messages - 添加消息到对话
- [ ] Typecheck passes

### US-003: 前端服务层改造

**Description:** 作为开发者，我需要改造前端数据层，从调用 localStorage 改为调用后端 API。

**Acceptance Criteria:**

- [ ] 创建 exploreConversation API 模块，封装所有对话相关接口
- [ ] 更新 ExploreService，使用 API 替代 localStorage
- [ ] 保持现有对话状态的响应式特性
- [ ] 添加错误处理和网络失败降级提示
- [ ] Typecheck passes

### US-004: 左侧对话列表边栏

**Description:** 作为用户，我需要左侧边栏展示历史对话列表，方便快速切换不同对话。

**Acceptance Criteria:**

- [ ] 页面左侧固定宽度边栏（280px）
- [ ] 边栏顶部显示页面标题 "AI 探索" 和新建话题按钮
- [ ] 对话列表按最后更新时间倒序排列
- [ ] 每个对话项显示标题和最后更新时间（相对时间，如"2小时前"）
- [ ] 当前选中的对话高亮显示
- [ ] 点击对话项加载对应对话内容
- [ ] 边栏支持滚动，当对话较多时可滚动查看
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: 对话管理功能

**Description:** 作为用户，我需要对对话进行管理，包括删除和重命名。

**Acceptance Criteria:**

- [ ] 对话项 hover 时显示操作按钮（更多菜单）
- [ ] 点击"重命名"弹出输入框修改对话标题
- [ ] 点击"删除"弹出确认对话框，确认后删除
- [ ] 删除后自动切换到最新的其他对话，若无则显示空状态
- [ ] 重命名后列表实时更新
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-006: 移除 Header 改造页面布局

**Description:** 作为用户，我希望页面布局更简洁，移除顶部 header，将导航整合到左侧边栏。

**Acceptance Criteria:**

- [ ] 移除 AI 探索页面原有的顶部 header
- [ ] 将页面标题 "AI 探索" 移到左侧边栏顶部
- [ ] 主内容区占满剩余宽度，无顶部留白
- [ ] 边栏顶部包含返回首页的返回按钮
- [ ] 整体布局左右结构：左侧边栏 + 右侧主内容区
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-007: 悬浮输入框改造

**Description:** 作为用户，我希望输入框固定在底部，始终可见，类似 ChatGPT 的交互体验。

**Acceptance Criteria:**

- [ ] 输入框固定在视口底部，不随消息滚动
- [ ] 输入框宽度适应主内容区，左右有合适边距
- [ ] 输入框有白色背景和阴影，与消息列表有视觉区分
- [ ] 消息列表区域底部预留输入框高度，避免内容被遮挡
- [ ] 输入框支持多行文本，自动增高
- [ ] 发送按钮在输入框右侧
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008: 新建话题功能迁移

**Description:** 作为用户，我需要在左侧边栏中方便地新建话题。

**Acceptance Criteria:**

- [ ] 左侧边栏顶部有"新建话题"按钮（+ 图标或文字按钮）
- [ ] 点击后创建新对话，标题默认为"新对话"或基于第一条消息生成
- [ ] 新建后自动切换到新对话
- [ ] 新对话出现在列表顶部
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-009: 空状态和加载状态

**Description:** 作为用户，我希望在无对话或加载时有清晰的反馈。

**Acceptance Criteria:**

- [ ] 无对话时，左侧列表显示"暂无对话"提示
- [ ] 首次进入页面无选中对话时，主区域显示欢迎界面（引导新建话题）
- [ ] 加载对话列表时显示骨架屏或 loading 状态
- [ ] 切换对话时主区域显示 loading 状态
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

### 数据库设计

- FR-1: 使用 LanceDB 存储对话数据，表名 `ai_conversations` 和 `ai_messages`
- FR-2: `ai_conversations` 字段：id (string), userId (string), title (string), createdAt (timestamp), updatedAt (timestamp)
- FR-3: `ai_messages` 字段：id (string), conversationId (string), role ('user'|'assistant'), content (string), sources (JSON array), createdAt (timestamp)
- FR-4: 按 userId 隔离数据，用户只能访问自己的对话

### API 接口

- FR-5: GET /api/explore/conversations 返回当前用户的对话列表，按 updatedAt 倒序
- FR-6: GET /api/explore/conversations/:id 返回对话详情和消息列表
- FR-7: POST /api/explore/conversations 创建新对话，可选传入初始标题
- FR-8: PUT /api/explore/conversations/:id 更新对话标题
- FR-9: DELETE /api/explore/conversations/:id 删除对话及其所有消息
- FR-10: POST /api/explore/conversations/:id/messages 添加新消息到指定对话

### 前端布局

- FR-11: 左侧边栏固定宽度 280px，包含页面标题、新建按钮、对话列表
- FR-12: 对话列表项显示标题（单行截断）和相对时间（如"2小时前"）
- FR-13: 移除原有顶部 header，页面标题整合到左侧边栏
- FR-14: 输入框固定在底部，position: fixed 或 sticky，高度自适应
- FR-15: 消息列表区域可滚动，底部预留输入框高度 + 间距

### 交互逻辑

- FR-16: 对话列表实时更新，新建/重命名/删除后立即反映
- FR-17: 删除对话需要二次确认
- FR-18: 当前对话在 URL 中体现（如 /ai-explore/:conversationId），支持直接访问
- FR-19: 无 conversationId 时自动重定向到最新对话或显示欢迎页

## Non-Goals (Out of Scope)

- 不支持对话搜索功能
- 不支持对话分组或标签
- 不支持批量删除对话
- 不支持对话导出功能
- 不支持跨用户对话共享
- 不支持离线使用（仍需网络访问后端）
- 不支持消息编辑和删除（仅支持整对话删除）

## Design Considerations

### 布局结构

```
+----------------------------------------------------------+
|  AI 探索    [+]                    |                     |
|  ← 返回首页                        |   消息历史区域      |
|                                    |   （可滚动）        |
|  ┌────────────────────────────┐   |                     |
|  │  产品思路讨论          2h前 │   |                     |
|  └────────────────────────────┘   |                     |
|  ┌────────────────────────────┐   |   +--------------+  |
|  │  周总结想法           昨天 │   |   | 悬浮输入框   |  |
|  └────────────────────────────┘   |   +--------------+  |
|                                   |                     |
|  ┌────────────────────────────┐   |                     |
|  │  新对话               3天前 │   |                     |
|  └────────────────────────────┘   |                     |
|                                   |                     |
+-----------------------------------+---------------------+
```

### 边栏样式参考

- 背景色：slate-50 或 gray-50（比主区域略暗）
- 选中项：白色背景 + 左边框高亮
- 边栏宽度：280px，可折叠（未来版本）
- 新建按钮：主色调按钮，位于标题右侧

### 输入框样式

- 白色背景，圆角，阴影
- 最大高度：200px，超出滚动
- 发送按钮在右侧，主色调
- 与消息列表间距：16px

## Technical Considerations

### LanceDB 表结构

```typescript
// ai_conversations schema
interface AIConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
}

// ai_messages schema
interface AIMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ memoId: string; title: string; score: number }>;
  createdAt: number;
}
```

### 路由设计

- `/ai-explore` - 重定向到最新对话或显示欢迎页
- `/ai-explore/:conversationId` - 具体对话页面

### 状态管理

- 使用现有 @rabjs/react 状态管理
- 对话列表全局缓存
- 当前对话消息按需加载

### 性能考虑

- 对话列表分页加载（初始20条，滚动加载更多）
- 消息列表虚拟滚动（当消息很多时）
- 创建/更新操作乐观更新UI

## Success Metrics

- 对话数据100%持久化到后端，刷新不丢失
- 页面加载后对话列表显示时间 < 500ms
- 切换对话的加载时间 < 300ms
- 用户可以在2次点击内创建新对话
- 用户可以在3次点击内删除或重命名对话

## Open Questions

1. 是否需要支持对话草稿（未发送的消息暂存）？
2. 单个对话的消息数量是否有限制？
3. 是否需要支持对话置顶功能？
4. 对话标题是用户手动输入还是AI自动生成？
