# PRD: 定时推送功能

## Introduction

为 AIMO 添加定时推送功能，允许用户设置定时任务将内容推送到 MeoW（后续可扩展其他渠道）。用户可以创建多条推送规则，每条规则可配置推送时间、推送内容和推送渠道。采用 Adapter 模式设计，方便后续扩展更多推送渠道。

## Goals

- 用户可以在设置页面创建、编辑、删除推送规则
- 支持按整点设置推送时间（0-23 时）
- 支持配置推送内容类型：今日推荐、今天的笔记
- 每条规则支持配置多个推送渠道（目前仅 MeoW）
- 使用 Adapter 模式，便于后续扩展新渠道
- 推送配置持久化到数据库

## User Stories

### US-001: 创建推送规则数据库表
**Description:** 作为开发者，我需要创建数据库表来存储用户的推送规则配置。

**Acceptance Criteria:**
- [ ] 创建 `push_rules` 表，包含字段：id, user_id, name, push_time (hour), content_type, channels (JSON), enabled, created_at, updated_at
- [ ] 创建迁移文件并成功执行
- [ ] TypeScript 类型定义与数据库表结构一致

### US-002: 后端推送规则 CRUD API
**Description:** 作为开发者，我需要提供推送规则的增删改查 API 供前端调用。

**Acceptance Criteria:**
- [ ] POST /api/v1/push-rules - 创建推送规则
- [ ] GET /api/v1/push-rules - 获取当前用户的推送规则列表
- [ ] PUT /api/v1/push-rules/:id - 更新推送规则
- [ ] DELETE /api/v1/push-rules/:id - 删除推送规则
- [ ] 使用 Zod 验证请求参数
- [ ] 认证用户只能操作自己的规则

### US-003: 推送渠道 Adapter 抽象层
**Description:** 作为开发者，我需要设计推送渠道的 Adapter 抽象层，便于后续扩展新渠道。

**Acceptance Criteria:**
- [ ] 创建 PushChannel 接口，定义 send(title, msg, options) 方法
- [ ] 实现 MeoWChannel Adapter
- [ ] 创建 ChannelFactory 根据渠道类型返回对应 Adapter
- [ ] Typecheck 通过

### US-004: 定时任务调度器
**Description:** 作为开发者，我需要实现定时任务调度器，在用户指定时间触发推送。

**Acceptance Criteria:**
- [ ] 每分钟检查一次是否有需要推送的任务
- [ ] 根据用户设置的 push_time (hour) 判断是否触发推送
- [ ] 遍历用户的推送规则，调用对应渠道的发送方法
- [ ] 推送失败时跳过并记录日志
- [ ] 支持多实例部署（使用分布式锁或数据库锁）

### US-005: 推送内容生成器
**Description:** 作为开发者，我需要根据规则配置生成推送内容。

**Acceptance Criteria:**
- [ ] 实现 ContentGenerator 接口
- [ ] 今日推荐：根据用户历史行为推荐一条备忘录
- [ ] 今天的笔记：获取用户当天创建的所有备忘录
- [ ] 返回 title 和 msg（支持 HTML 格式）

### US-006: 前端推送规则列表页面
**Description:** 作为用户，我想在设置页面查看和管理我的推送规则。

**Acceptance Criteria:**
- [ ] 在设置页面添加"推送规则"Tab 或区域
- [ ] 展示推送规则列表，每条显示：名称、推送时间、内容类型、渠道、启用状态
- [ ] 显示添加按钮，点击弹出创建表单
- [ ] 每条规则显示编辑和删除按钮
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

### US-007: 前端创建/编辑推送规则表单
**Description:** 作为用户，我想创建或编辑推送规则。

**Acceptance Criteria:**
- [ ] 规则名称输入框
- [ ] 推送时间选择器（下拉框 0-23 时，仅整点）
- [ ] 内容类型单选（今日推荐、今天的笔记）
- [ ] 渠道多选复选框（目前仅 MeoW）
- [ ] 启用状态开关
- [ ] 表单验证：名称必填、至少选择一个渠道
- [ ] 提交成功后关闭弹窗并刷新列表
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

### US-008: 前端 MeoW 渠道配置
**Description:** 作为用户，我想配置 MeoW 推送渠道的昵称参数。

**Acceptance Criteria:**
- [ ] 当选择 MeoW 渠道时，显示昵称输入框
- [ ] 昵称保存到 channels JSON 中
- [ ] 支持配置 msgType (text/html) 和 htmlHeight
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: 创建 `push_rules` 数据表存储用户推送规则
- FR-2: 提供推送规则 CRUD REST API
- FR-3: 定义 PushChannel 接口规范
- FR-4: 实现 MeoWChannel Adapter，调用 api.chuckfang.com 发送推送
- FR-5: 实现 ChannelFactory 工厂模式
- FR-6: 实现定时任务调度器，每分钟检查并执行推送
- FR-7: 实现内容生成器（今日推荐、今天的笔记）
- FR-8: 前端设置页面添加推送规则管理 UI
- FR-9: 创建/编辑推送规则表单（支持配置时间、内容类型、渠道、昵称）
- FR-10: 推送失败时跳过并记录日志

## Non-Goals

- 不支持按分钟精确推送（仅支持整点）
- 不支持推送失败重试
- 不支持推送历史记录查看
- 第一期仅实现 MeoW 渠道
- 不支持推送内容自定义（仅预设类型）

## Technical Considerations

### 数据库设计

```typescript
// push_rules 表结构
{
  id: string;
  user_id: string;
  name: string;           // 规则名称
  push_time: number;      // 推送小时 (0-23)
  content_type: 'daily_pick' | 'daily_memos';  // 今日推荐 | 今天的笔记
  channels: string;       // JSON: [{type: 'meow', nickname: 'xxx', msgType: 'html', htmlHeight: 350}]
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}
```

### Adapter 模式设计

```typescript
interface PushChannel {
  send(options: PushOptions): Promise<PushResult>;
}

interface PushOptions {
  title: string;
  msg: string;
  url?: string;
  nickname?: string;
  msgType?: 'text' | 'html';
  htmlHeight?: number;
}

class MeoWChannel implements PushChannel {
  async send(options: PushOptions): Promise<PushResult> {
    // 调用 api.chuckfang.com
  }
}
```

### 定时任务

- 使用 node-cron 或 node-schedule
- 每分钟执行一次检查
- 使用数据库分布式锁防止多实例重复执行

## Success Metrics

- 用户能在 1 分钟内完成推送规则配置
- 推送在整点后 5 分钟内完成发送
- 支持用户设置多条规则（至少 10 条）

## Open Questions

- 今日推荐的推荐算法如何实现？（随机？基于标签？基于使用频率？）
- 是否需要推送成功/失败的通知给用户？
- MeoW 渠道是否需要配置 API Key 或其他认证信息？
