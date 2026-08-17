# AIMO · AI 时代路线图需求文档 (PRD v1)

> **北极星**：从笔记仓库到 Agent 的私有记忆层——六步基底优先路线图：先把混合检索做厚，再用 MCP 把 AIMO 暴露成"你的 Agent 的私有记忆"，然后在类型化知识图谱上长出夜间园丁与早晨仪式。

## 概述

| # | 特性 | 视角 | 工作量 | 阶段 | 依赖 |
|---|---|---|---|---|---|
| 01 | 混合检索 (BM25 ⊕ 向量, RRF + rerank) + eval 闭环 | 基底 | 中 · 1–2 周 | P1 | — |
| 02 | 开放记忆面: MCP Server + 鉴权 REST + Embedding-BYOM | 壁垒 | 低-中 | P1 | 01 |
| 03 | 类型化知识图谱基底 (relation.type + entities + LLM 抽取) | 基底 | 中-高 | P2 | 01 |
| 04 | Knowledge Gardener Phase 1 (夜间园丁, 可回滚 diff) | 用户价值 | 中 | P2 | 01, 03 |
| 05 | Active Recall / Daily Review (SM-2 仪式 + streaks) | 留存 | 低-中 | P2 | — (基建已有) |
| 06 | Personal Memory Profile (文风/话题/实体注入) | 质量倍增 | 低-中 | P2/P3 | 03 (软) |

三个 Agent 各自的 #1（A=园丁 / B=混合检索 / C=记忆层）实为同一路线的三种排序。Agent B 的代码验证纠正了可行性，由此解开"先建什么"——基底优先序如上。

> **本文档所有 `file:line` 锚点均为一手验证（rg / read），非转述。** 一处纠正：不存在 `search.service.ts`，检索逻辑当前全在 `MemoService.vectorSearch`（`memo.service.ts:1189`）内调用 `LanceDbService`（`lancedb.ts:260`）。

---

## 01 · 混合检索 + 隐式 eval 闭环 ｜ 基底 ｜ 中 ｜ P1

**目标**：把"纯向量检索"升级为"稀疏 ⊕ 稠密混合 + 重排 + 查询改写 + 时间衰减"，并用隐式反馈持续衡量相对基线的质量变化。

### 验收标准

- 同一查询下召回@10 不低于纯向量基线（eval 脚本可对比）。
- 稀疏路走 MySQL FULLTEXT（ngram 分词），稠密路保留 LanceDB；两路 top-K 经 RRF 融合。
- 可选 cross-encoder 重排 top-N（默认关闭，配置后开）。
- LLM 查询改写（同义扩展 / 拆分复合问题）。
- 时间衰减权重可配，新 memo 适度加权，用户可关。
- eval：记录结果被点击 / 采纳 / 否决的隐式反馈，离线计算 nDCG@10 相对基线。

### 技术落点（一手验证）

- `memo.service.ts:1189` — `MemoService.vectorSearch` → 升级为 `hybridSearch`，保留旧方法作回退
- `lancedb.ts:260` — `table.vectorSearch().limit().toArray()` → 稠密路保留
- **无 `search.service.ts`（不存在）** — 检索逻辑当前全在 `MemoService` 内
- 新增 `hybrid-search.service.ts` → FULLTEXT 稀疏路 + RRF 融合
- 新增 `rerank.service.ts` → cross-encoder / LLM-as-judge，复用 BYOM
- 新表 `search_feedback` → `query / resultMemoId / position / action(click|adopt|reject) / ts`

### 依赖

无前置依赖（基底，第一步）。需 `memos` 表加 FULLTEXT 索引迁移。

### 风险 / 待决

- ⚠ MySQL FULLTEXT 中文分词：内建 ngram，需验证 utf8mb4 + ngram 效果，退路是应用层 jieba。
- ◆ cross-encoder 成本：默认关闭，BYOM 配置后开。
- ⚠ 时间衰减系数需可配，避免老 memo 被系统性埋没。

---

## 02 · 开放记忆面：MCP Server + 鉴权 REST + Embedding-BYOM ｜ 壁垒 ｜ 低-中 ｜ P1

**目标**：把 AIMO 暴露成"Agent 的私有记忆层"——MCP 工具与鉴权 REST 同源同鉴权，并把 embedding 工厂换成可配置 provider（本地优先）。

### 验收标准

- 外部 MCP 客户端（Claude Desktop / 自建 Agent）经 token 鉴权调用 `memos.search / get / relations / create`。
- REST `/api/v1/memory/*` 与 MCP 工具同源、同鉴权。
- embedding provider 可按用户配置切换（OpenAI / 本地 Ollama / 自建），无需改代码；本地优先时数据不出服务器。
- 检索后端命中 Step 1 的 `hybridSearch`。

### 技术落点（一手验证）

- `embedding.service.ts:3,19-27` — `createOpenAI(...)` 硬编码 → 换为 provider 工厂（仿 `llm.service` 的 `getApiConfig` switch）
- `embedding.service.ts:124,183` — `embed / embedMany` → Vercel AI SDK provider-agnostic，调用点不变
- `user-models.ts` — `provider/apiBaseUrl/apiKey/modelName/isDefault` → LLM-BYOM 已建，可复用或加 `kind=chat|embedding`
- `llm.service.ts:78-95` — provider switch (openai/deepseek/openrouter/custom) → custom apiBaseUrl 已支持 Ollama，参考实现
- `user-tokens.ts` — 已有用户 token 表 → MCP / REST 鉴权复用
- 新增 `src/mcp/` → `@modelcontextprotocol/sdk` 包装现有 service 为 tools
- 新增 `controllers/v1/memory.ts` → 薄包装同 service，`@CurrentUser` 鉴权

### 依赖

Step 1（`hybridSearch` 是 MCP search 的后端；做好检索外部 Agent 才有价值）。

### 风险 / 待决

- ⚠ MCP 传输方式：AIMO 自托管 server，HTTP+SSE 比 stdio 合适，需鉴权设计。
- ◆ 本地 embedding 模型质量：Ollama bge-m3 等，需验证中文效果 vs `text-embedding-3-small`。
- ⚠ 多 embedding provider 共存 → 向量空间不一致：同库只能一个 provider，切换需 reindex。

---

## 03 · 类型化知识图谱基底 ｜ 基底 ｜ 中-高 ｜ P2

**目标**：给当前无类型的关系加类型，并自动抽取实体 / 关系，构成可查的知识图谱基底——园丁、漂移检测、苏格拉底的地基。

### 验收标准

- `memo_relations.type` 枚举（`related / similar / derived-from / contradicts / supports / refines …`）。
- 新增 `entities` 表 + `memo_entities` 关联。
- 写入 memo 时 LLM 异步抽取实体与关系候选，写入 pending 队列。
- 实体消歧：复用 Step 1 检索找相似实体再合并。
- 关系双向查询（复用现有 backlinks）。

### 技术落点（一手验证）

- `memo-relations.ts:7-26` — 无 type 列（仅 `relationId/uid/source/target/deletedAt/createdAt`）→ 加 `type` mysqlEnum
- 新增 schema `entities.ts` → `entityId/name/normalized/type`
- 新增 schema `memo-entities.ts` → `memoId/entityId`
- 新增 `kg.service.ts` → memo 写入钩子触发 LLM 抽取 + 消歧
- `memo-relation.service.ts` — directed + backlinks → 关系承载复用

### 依赖

Step 1（消歧靠检索找相似实体）。

### 风险 / 待决

- ◆ 抽取质量：需 prompt 工程 + 人工抽检。
- ⚠ 抽取成本：每条 memo 一次 LLM 调用 → 批处理 / 增量 / 用户开关。
- ⚠ 实体归一化：同义词、中英文混合需稳健规则。
- ◆ `type` 枚举设计需稳定，避免后续迁移。

---

## 04 · The Knowledge Gardener · Phase 1 ｜ 用户价值 ｜ 中 ｜ P2

**目标**：夜间 AI 园丁巡检，产出"建链 / 打标 / 合并 / 漂移"候选，以可回滚 diff 形式供早晨一键审阅——用户能感知的复利日常产品。

### 验收标准

- scheduler 夜间任务跑 Gardener agent，产出 diff（新关系 / 新标签 / 合并 pair / 漂移 flag）。
- diff 存为"待审"草稿，不直接改库；用户在"早晨审阅"UI 一键 accept / reject / 编辑。
- accept 才落库；完成 push 通知（复用现有 channels）。
- 所有操作可回滚（diff 记录 before / after）。
- **Phase 2（暂缓）**：memo 版本化 + 漂移对比 + 每次编辑重嵌入。

### 技术落点（一手验证）

- `explore.service.ts:2,32-35,133` — `StateGraph`（`@langchain/langgraph`），已有 retrieve/analyze/analyzeRelations 节点模式 → 照此新建 `gardener.workflow.ts`
- 新图 `gardener.workflow.ts` → `retrieve-cluster / candidate-link / candidate-merge / drift-detect / emit-diff`
- `scheduler.service.ts` — 已有 cron → 加一个夜间任务
- 新表 `garden_diffs` → `diffId/userId/kind/payload(before|after)/status(pending|accepted|rejected)`
- `memos.ts` — 无 version 列 → Phase 2 版本化的硬阻塞点，Phase 1 不依赖

### 依赖

Step 1（检索找候选）、Step 3（类型化关系承载 diff 落地）。

### 风险 / 待决

- ⚠ diff 噪声：需置信度阈值 + 每夜限 N 条。
- ◆ LLM 幻觉建链：必须人工 accept 关。
- ⚠ 合并误删：diff 可回滚兜底，但合并语义需谨慎。
- ◆ 与 Step 3 抽取去重：Gardener 可消费 KG 抽取的 pending 候选，避免重复跑。

---

## 05 · Active Recall / Daily Review ｜ 留存 ｜ 低-中 ｜ P2

**目标**：把已存在的 SM-2 间隔重复基建产品化成"早晨仪式"UI + 连击 streaks——后端近乎免费，是园丁 diff 的同一道"早晨审阅"前门。

### 验收标准

- 用户可把任意 memo / 标签加入复习（复用 `spaced-repetition-rules` 的 include/exclude）。
- 每日早晨推荐待复习卡片（按 `nextReviewAt`）。
- 复习交互：记得 / 模糊 / 忘了 → SM-2 更新 `easeFactor / interval / nextReviewAt`。
- 连续复习 streaks；与 Step 4 Gardener diff 共享"早晨审阅"入口。

### 技术落点（一手验证）

- `spaced-repetition-cards.ts:12-16` — `easeFactor(2.5) / interval(1) / repetitions(0) / lapseCount / nextReviewAt` → SM-2 全字段已就绪
- `spaced-repetition-rules.ts:11-18` — `mode(include|exclude) + filterType` 枚举 → 复习范围过滤已就绪
- `review-items.ts · review-profiles.ts · review-sessions.ts` — 均已存在 → 复习会话基建已建
- 新增 `review.service.ts` → 取今日 due cards + 提交评分→SM-2 计算
- 新增前端 `pages/morning/` → 仪式页 + streak 组件，合并 Gardener 审阅

### 依赖

无强依赖（基建已存在）；可与 Step 4 共享"早晨"入口。

### 风险 / 待决

- ◆ SM-2 评分映射：记得=good / 模糊=fair / 忘了=bad。
- ⚠ 与现有 `daily-recommendations` 的关系：整合还是并存需定。
- ⚠ 复习疲劳：需 streaks 激励 + 每日上限。

---

## 06 · Personal Memory Profile ｜ 质量倍增 ｜ 低-中 ｜ P2/P3

**目标**：为每用户沉淀一份"记忆画像"（文风、常写话题、关键人 / 项目实体），注入所有 AI 调用与记忆层——"你的 Agent 认识你的人"。

### 验收标准

- 新增 memory-profile 存储（或复用 `user-feature-configs`），字段 `style / interests / entities / summary / version`。
- 画像由 LLM 周期性从近 N 条 memos 抽取 / 更新。
- AI 调用（chat / explore / gardener）自动注入画像上下文。
- MCP Memory API 暴露画像给外部 Agent。

### 技术落点（一手验证）

- 新增或扩展 `memory-profile.ts` → 或扩 `user-feature-configs.ts`
- `scheduler.service.ts` — 已有 cron → 加周期画像抽取任务，复用 BYOM + Step 3 实体
- `ai.service.ts · explore.service.ts` — prompt 组装处 → 注入 profile 片段

### 依赖

Step 3（实体）软依赖；可独立做最小版。

### 风险 / 待决

- ⚠ 隐私：画像含敏感内容 → 本地优先，BYOM 配合。
- ◆ 画像时效：需定期重算。
- ⚠ 注入长度：需压缩 / 检索式注入而非全量塞 prompt。

---

## 砍掉 / 推迟（三方一致）

- **自托管团队知识库 + RBAC + 审计** — 不同产品，红海（撞 Notion/Confluence），稀释"个人主权"楔子。作为后期商业化再考虑。
- **时间感知版本化嵌入 / Opinion Drift** — 成本高（每次编辑重嵌入），需 memo versioning 先行。等 Phase 2 验证漂移是核心价值后再做。
- **Ambient 多模态采集** — 被移动端卡住，AIMO 是 web 应用，需 PWA/native 承诺。
- **中文生态深度采集（飞书 / 微信 / 钉钉入站）** — 作为采集适配器，不作为旗舰支柱。
- **Composer / Socratic / 检索 eval 仪表盘** — 折进上面各项当零件；检索 eval 尤其要藏在 Active Recall 排序背后，用户无需看到它。

---

## 方法论与综合依据

- **三方 #1 实为同一路线的三种排序。** A（产品/UX）= Knowledge Gardener；B（技术/AI）= 混合检索基底 + MCP；C（竞争）= 自托管个人记忆层。
- **B 的代码验证是解开"先建什么"的关键。** 它纠正了 A 与 C 的乐观假设：SM-2 间隔重复已存在（Daily Review = 产品化非新建）；LLM-BYOM 已建（仅 embedding 工厂硬编码于 `embedding.service.ts`）；MCP 是低成本协议包装；Knowledge Gardener 被低估——"可回滚合并"依赖 memo 版本化，而 `memos` 表无 version 列，故它不能先建。
- **基底优先序由此确定**：检索（01）→ 记忆面（02，C 的壁垒且命中有好检索才有意义）→ 类型化 KG（03）→ 园丁（04，A 的北极星）+ Review（05，近免费）→ 画像（06）。这条顺序同时满足：最便宜最高杠杆（B）、用户能感知的复利日常产品（A）、对手无法跟随的结构性壁垒（C）。
- **锚点一手验证**：本 PRD 所有 `file:line` 均经 rg/read 验证。一处纠正：不存在 `search.service.ts`，检索逻辑当前全在 `MemoService.vectorSearch`（`memo.service.ts:1189`）内调用 `LanceDbService`（`lancedb.ts:260`）。

---

## 待审阅决策点

1. **Phase 划分** — P1（01+02）作为第一个交付批次，是否太大/太小？
2. **MCP 传输** — 走 HTTP+SSE（自托管友好）还是 stdio（本地优先）？这影响 02 的鉴权设计。
3. **Gardener Phase 1 是否值得先于 Phase 2 的 versioning** — 即"建链/打标/合并 diff"不带版本化能否站得住，还是漂移检测才是园丁的真正卖点？
4. **Step 5 与现有 `daily-recommendations` 的关系** — 整合还是并存？

审阅通过后，建议从 **Step 1（混合检索 + eval 闭环）** 起一个 TDD 实现计划。
