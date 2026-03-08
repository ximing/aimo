# 知识沉淀与回顾功能设计

**日期：** 2026-03-07
**方向：** 知识沉淀与回顾
**核心痛点：** 笔记山积了不知道里面有什么

---

## 功能概览

| #   | 功能           | 优先级 | 新增表                                               | 新增服务         |
| --- | -------------- | ------ | ---------------------------------------------------- | ---------------- |
| 1   | AI 回顾模式    | P0     | `review_sessions`, `review_items`                    | `review.service` |
| 2   | 间隔重复推送   | P1     | `spaced_repetition_cards`, `spaced_repetition_rules` | 扩展 `scheduler` |
| 3   | 周期摘要报告   | P2     | `digest_reports`                                     | `digest.service` |
| 4   | 知识图谱可视化 | P3     | 无                                                   | `graph.service`  |

---

## 功能一：AI 回顾模式（Review Mode）

### 用户体验

用户主动进入 `/review` 页面，选择回顾范围后，AI 从笔记库中选取 5-10 条内容，以苏格拉底式对话逐题提问。用户回答后，AI 对比原笔记给出反馈。完成后展示掌握情况总结，数据写入 DB 供间隔重复使用。

### 用户流程

1. 选择范围（全部 / 某分类 / 某标签 / 最近 N 天）
2. AI 用语义搜索 + 随机采样选出 5-10 条 Memo，为每条生成一个问题
3. 逐题展示，用户输入回答后提交
4. AI 对比原笔记内容给出反馈（"你答对了 / 你遗漏了 X / 补充一点..."）
5. 完成后展示本次掌握情况，mastery 数据写入 DB

### 数据模型

```sql
-- 回顾会话
review_sessions
  sessionId     VARCHAR(191) PK
  userId        VARCHAR(191) FK
  scope         ENUM('all', 'category', 'tag', 'recent')
  scopeValue    VARCHAR(255)   -- categoryId / tagName / 天数
  status        ENUM('active', 'completed', 'abandoned')
  score         INT            -- 0-100，完成后计算
  createdAt     TIMESTAMP
  completedAt   TIMESTAMP

-- 回顾题目
review_items
  itemId        VARCHAR(191) PK
  sessionId     VARCHAR(191) FK
  memoId        VARCHAR(191) FK
  question      TEXT           -- AI 生成的问题
  userAnswer    TEXT
  aiFeedback    TEXT
  mastery       ENUM('remembered', 'fuzzy', 'forgot')
  order         INT
```

### API

```
POST /api/v1/review/sessions              # 创建会话（选题 + 生成问题）
GET  /api/v1/review/sessions/:id          # 获取会话状态和题目列表
POST /api/v1/review/sessions/:id/answer   # 提交某题答案，返回 AI 反馈
POST /api/v1/review/sessions/:id/complete # 结束会话，计算得分
GET  /api/v1/review/history               # 回顾历史记录
```

### 前端

- 新增 `pages/review/` 页面
- 步骤一：范围选择界面
- 步骤二：逐题问答界面（进度条 + 问题 + 输入框）
- 步骤三：完成总结界面（每题掌握情况 + 总分）

### 复用

- `ai.service.ts` — 生成问题 + AI 反馈
- `search.service.ts` — 语义搜索选题
- `ai-conversation.service.ts` — 对话上下文管理

---

## 功能二：间隔重复推送（Spaced Repetition）

### 用户体验

类 Anki 遗忘曲线算法，在用户"最容易忘记"的时间点把旧笔记推送回来。用户在回顾模式中标记掌握程度，系统自动调整下次推送时间。

### SM-2 算法映射

| 用户反馈     | SM-2 评分 | 效果                           |
| ------------ | --------- | ------------------------------ |
| `remembered` | 5         | interval 增长，easeFactor 略升 |
| `fuzzy`      | 3         | interval 增长但较慢            |
| `forgot`     | 1         | interval 重置为 1，明天再推    |

### 数据模型

```sql
-- SM-2 卡片状态
spaced_repetition_cards
  cardId        VARCHAR(191) PK
  userId        VARCHAR(191) FK
  memoId        VARCHAR(191) FK
  easeFactor    FLOAT          -- 初始 2.5
  interval      INT            -- 下次复习间隔天数，初始 1
  repetitions   INT            -- 连续答对次数
  nextReviewAt  TIMESTAMP      -- 下次推送时间
  lastReviewAt  TIMESTAMP
  createdAt     TIMESTAMP

-- 过滤规则
spaced_repetition_rules
  ruleId        VARCHAR(191) PK
  userId        VARCHAR(191) FK
  mode          ENUM('include', 'exclude')
  filterType    ENUM('category', 'tag')
  filterValue   VARCHAR(255)   -- categoryId 或 tagName
  createdAt     TIMESTAMP
```

### 过滤规则逻辑

- `include`：只有匹配的 Memo 才加入间隔重复
- `exclude`：匹配的 Memo 不加入间隔重复
- 优先级：`exclude` > `include`（黑名单优先）
- 无规则时：全部 Memo 自动加入

### 推送流程

定时任务（每天 8:00）：

1. 查询所有 `nextReviewAt <= now` 且符合过滤规则的卡片
2. 按用户分组，每用户最多推送 5 条（防止轰炸）
3. 通过用户配置的推送渠道发送（飞书 / Meow）
4. 推送内容：Memo 标题 + 前 100 字 + 站内链接

### 触发机制

- 用户在回顾模式标记 `mastery` → 自动更新对应卡片 SM-2 状态
- 首次创建 Memo 时（符合过滤规则）→ 自动创建卡片（interval=1，明天推送）

### Settings 配置

- 开启 / 关闭间隔重复推送
- 每日最大推送数量（默认 5）
- 过滤规则管理（增删 include/exclude 规则）

### 复用

- `SchedulerService` — 添加每日调度任务
- `ChannelFactory` — 复用推送渠道

---

## 功能三：周期摘要报告（Digest Report）

### 用户体验

每周/月 AI 自动分析新增笔记，生成"知识地图"：这段时间关注了什么主题？有哪些想法值得深化？报告推送到外部渠道，同时在站内 `/insights` 页面可查看历史。

### 数据模型

```sql
digest_reports
  reportId      VARCHAR(191) PK
  userId        VARCHAR(191) FK
  period        ENUM('weekly', 'monthly')
  startDate     DATE
  endDate       DATE
  memoCount     INT
  topTopics     JSON    -- [{topic, count, memoIds[]}]
  topTags       JSON    -- [{tag, count}]
  topCategories JSON    -- [{category, count}]
  highlights    JSON    -- AI 挑选的 3 条 memoId[]
  summary       TEXT    -- AI 生成的 100-200 字总结
  status        ENUM('generating', 'ready', 'failed')
  createdAt     TIMESTAMP
```

### 报告生成流程

定时任务（每周一 9:00 / 每月 1 日 9:00）：

1. 查询该用户上周/上月新增的所有 Memo
2. 统计标签、分类分布
3. 将 Memo 内容批量送给 AI，提取 3-5 个主题（主题聚类）
4. AI 从中挑选 3 条"最有价值"的 Memo（依据：内容丰富度 + 被引用数）
5. AI 生成 100-200 字总结
6. 写入 `digest_reports` 表，status 从 `generating` 改为 `ready`
7. 通过推送渠道发送摘要（标题 + 主题列表 + 站内链接）

### Settings 配置

- 报告周期：weekly / monthly / 关闭
- 是否推送到外部渠道

### 站内展示

扩展现有 `/insights` 页面：

- 历史报告列表（按时间倒序）
- 点击查看完整报告：主题卡片 + 高亮笔记 + AI 总结

### 复用

- `SchedulerService` — 添加周期任务
- `ChannelFactory` — 复用推送渠道
- `insights.controller.ts` — 扩展现有接口

---

## 功能四：知识图谱可视化（Knowledge Graph）

### 用户体验

将所有 Memo 的引用关系 + AI 发现的语义相似关系渲染成交互式知识图谱。节点是 Memo，边是引用或语义相似，可发现"孤岛笔记"和"枢纽笔记"。

### 技术选型

前端：**Cytoscape.js**（比 D3 更适合图数据，API 更友好）

### API

```
GET /api/v1/graph   # 返回图数据（节点 + 边）
```

响应结构：

```typescript
{
  nodes: [{
    id: string,           // memoId
    label: string,        // memo 前 20 字
    category: string,
    tags: string[],
    linkCount: number,    // 被引用次数（决定节点大小）
    createdAt: string
  }],
  edges: [{
    source: string,       // memoId
    target: string,       // memoId
    type: 'reference' | 'semantic',
    weight: number        // semantic 时为相似度分数
  }]
}
```

### 语义边生成策略

- 对每条 Memo 查询 top-3 语义相似笔记
- 相似度 > 0.8 才建边（避免图过于密集）
- 语义边在后台**异步预计算**并缓存，不在请求时实时查询

### 前端交互

- 力导向布局，节点大小 = linkCount，颜色 = 分类
- 点击节点 → 右侧弹出 Memo 预览面板
- 边样式：实线 = 引用关系，虚线 = 语义相似
- 过滤栏：按分类/标签筛选节点
- 一键高亮孤岛笔记（无任何关联）
- 一键高亮枢纽笔记（linkCount 最高前 10）

### 性能策略

- 默认只加载最近 200 条 Memo，可手动扩展
- 语义边异步预计算并缓存，避免请求时实时查询 LanceDB

### 复用

- `memo_relations` 表 — 显式引用关系
- `search.service.ts` / LanceDB — 语义相似关系

---

## 实现顺序建议

1. **功能一（AI 回顾模式）** — 最核心的差异化体验，且产生的 mastery 数据是功能二的基础
2. **功能二（间隔重复推送）** — 依赖功能一的数据，复用现有推送基础设施，复杂度低
3. **功能三（周期摘要报告）** — 独立功能，复用调度器和推送渠道，复杂度低
4. **功能四（知识图谱）** — 前端工作量最大，作为最后实现
