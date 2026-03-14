---
name: fix-issue
description: 用于按优先级串行修复 GitHub issue 的技能。只要用户提到“修 issue / 批量修 bug / 从 P0 开始处理 / 逐个修复问题 / 自动修复 issue 队列”等，都应启用。必须先复用 `gh.issue` 技能获取 issue，上游按 P0->P1->P2->P3->P4 排序，每次只处理一个 issue，并且每个 issue 都用子 Agent 修复；默认自动连续处理，只有遇到功能语义或产品策略需要产品经理确认时才暂停并向用户确认。每个成功修复的 issue 都必须由子 Agent 完成 commit（commit 信息关联 issue）并自动评论“已修复”后关闭。
---

# GitHub Issue 串行修复技能

## 目标

将 GitHub issue 队列转化为可执行的串行修复流程：

- 严格按优先级从高到低处理（`P0` 优先）。
- 每次只领取并修复 1 个 issue。
- 使用子 Agent 执行修复，主 Agent 负责调度与汇报。
- 默认自动连续修复；仅在功能语义需产品确认时暂停。
- 每个修复成功的 issue 必须完成“lint 通过 + tscheck 通过 + 单测通过 + 提交代码（commit 关联 issue）+ 评论说明 + 关闭 issue”。
- 全部结束后给出完整结果反馈。

## 触发条件

当用户表达以下意图时，立即启用本技能：

- “从 P0 开始把 issue 修掉”
- “批量修复 GitHub issue，但一个一个来”
- “每个 issue 用子 Agent 修，修完继续下一个”
- “帮我清理 issue backlog，先高优先级”

## 依赖技能

在执行任何 issue 获取、筛选、更新前，先复用：

- `.catpaw/skills/gh.issue/SKILL.md`

先读取并遵循该技能的 preflight 与命令规范（认证、仓库上下文、权限、非交互参数等）。

## 硬性约束

- 不并行修复多个 issue。
- 不跳过优先级顺序（必须先尝试 `P0`，再 `P1/P2/P3/P4`）。
- 明确可执行的问题直接自动修复，不做无意义等待确认。
- 仅当功能语义或产品策略不明确时才发起确认。
- 每个成功修复的 issue 必须在 lint/tscheck/单测全部通过后，再由子 Agent 完成 commit（message 关联 issue）并执行评论与关闭。
- commit 时禁止使用 `--no-verify`。
- 不在失败后静默跳过；必须记录并反馈。

## 优先级识别规则

按以下优先级标签模式识别（大小写不敏感）：

- `P0` / `p0`
- `priority:P0` / `priority:p0`
- `priority/p0`
- `sev:P0` / `severity:P0`

`P1/P2/P3/P4` 使用同样规则。

如果仓库标签体系不匹配上述格式：

1. 向用户展示当前可见标签样例。
2. 请用户确认“优先级标签映射表”。
3. 在确认后继续执行。

## 执行总流程（串行）

1. **Preflight（通过 `gh.issue` 流程）**
   - `gh --version`
   - `gh auth status`
   - `gh repo view --json nameWithOwner,viewerPermission`

2. **构建优先级循环**
   - 固定顺序：`P0 -> P1 -> P2 -> P3 -> P4`

3. **按优先级每次只取 1 个 issue**
   - 对当前优先级，依次尝试搜索表达式（直到拿到 1 条）：
     - `label:P0 is:open sort:created-asc`
     - `label:"priority:P0" is:open sort:created-asc`
     - `label:"priority/p0" is:open sort:created-asc`
     - `label:"sev:P0" is:open sort:created-asc`
   - 示例命令：
     - `gh issue list --search "label:P0 is:open sort:created-asc" --limit 1 --json number,title,labels,url,updatedAt`

4. **当前优先级没找到时进入下一级**
   - `P0` 无候选 -> 查 `P1`，依次类推。

5. **issue 语义清晰时直接启动 1 个子 Agent 修复**
   - 使用 `task` 工具，`subagent_type=general-agent`。

6. **子 Agent 在 lint/tscheck/单测全部通过后，先 commit 并关联 issue**
   - commit message 必须包含 issue 编号（如 `Refs #<number>` 或 `Fixes #<number>`）。
   - 任一校验不通过时，不允许进入 commit/comment/close。

7. **完成 commit 后，立即回写 issue 并关闭**
   - 先评论“已修复说明（修复点 + 验证结果 + commit hash）”。
   - 再执行关闭 issue。

8. **仅在功能语义不明确时暂停并请求确认**
   - 见“产品确认点（仅在功能问题不明确时触发）”。

9. **单个 issue 完结后默认自动进入下一个**
   - 不需要逐条等待人工确认。

10. **循环直到所有优先级都没有可处理 issue，或出现待确认功能问题**

11. **输出最终汇总反馈**

## 默认自动修复模式

- 命中 issue 后先判断是否“功能语义清晰且可执行”。
- 清晰：直接子 Agent 修复并通过 lint/tscheck/单测验收，随后 commit（关联 issue）+ 评论 + 关闭，再自动进入下一条。
- 不清晰：标记 `pending confirmation`，向用户请求产品确认。
- 除功能确认外，不因常规技术问题反复停下来问用户。

## 修复通过判定标准（强制）

只有同时满足以下 3 条，才可认定“修复通过”：

1. lint 通过
   - 默认命令：`pnpm lint`
2. tscheck 通过（TypeScript 类型检查）
   - 默认命令：`pnpm -r --if-present typecheck`
3. 单测通过
   - 默认命令：`pnpm -r --if-present test`

任一失败都视为当前 issue 未修复完成，不允许进入 commit/comment/close。

## 子 Agent 执行规范（单 issue）

主 Agent 每次只启动一个子 Agent，Prompt 至少包含：

- 目标 issue 编号、标题、URL、优先级。
- issue 正文与评论中的验收标准（若有）。
- 本仓库必须遵守的规则（日志、迁移、测试、ID 生成等）。
- 任务要求：
  - 只实现当前 issue 所需修复，不额外扩散。
  - 修改代码后执行并通过 lint、tscheck、单测三项校验。
  - 修复通过后，先 commit 并在 commit 信息中关联 issue，再执行 issue 评论与关闭。
  - 输出：改动文件、核心修复点、lint/tscheck/单测结果、commit 信息与 hash、issue 评论内容、关闭结果、剩余风险。

推荐子 Agent 任务描述模板：

```text
Fix GitHub issue #<number> in repo <owner/repo>.

Context:
- Priority: <P0|P1|P2|P3|P4>
- Issue URL: <url>
- Acceptance criteria: <copied from issue>

Requirements:
1) Implement the minimal correct fix for this issue only.
2) Follow repository rules and existing architecture patterns.
3) Run and pass all three gates: lint, tscheck, and unit tests.
4) After verification passes, create commit(s) and include issue reference in commit message.
5) Comment on this issue with fix details and commit hash, then close the issue.
6) Return a concise report: changed files, what was fixed, lint/typecheck/test results, commit message/hash, issue comment details, close result, and any residual risk.
```

## Commit 与 issue 关联规范

子 Agent 在验证通过后必须先完成 commit，再进行 issue 回写：

1. 执行 commit：
   - 命令示例：`git add -A && git commit -m "fix: <short summary>" -m "Refs #<number>"`
   - 允许使用 `Fixes #<number>`，但默认优先 `Refs #<number>`（关闭动作由 `gh issue close` 执行）。
2. 输出 commit 结果：
   - commit hash
   - commit subject
   - issue 关联行（`Refs #<number>` / `Fixes #<number>`）
3. 禁止在 commit 中使用 `--no-verify`。

## Issue 回写与关闭规范

子 Agent 在修复通过并完成 commit 后必须执行以下动作：

1. 发表评论：
   - 命令示例：`gh issue comment <number> --body-file <comment.md>`
   - 评论至少包含：
     - 修复结论（已修复）
     - 关键改动点
     - 验证方式与结果
     - 关联 commit hash（可追溯）
2. 关闭 issue：
   - 命令示例：`gh issue close <number>`

推荐评论模板：

```markdown
已完成修复 ✅

## What was fixed
- ...

## Verification
- ...

## Commit
- <commit-hash> (`Refs #<number>`)

## Notes
- ...
```

## 产品确认点（仅在功能问题不明确时触发）

### #1 功能语义或验收标准不明确

以下任一场景才需要确认：

- issue 描述与现有行为冲突，且存在多种合理实现。
- issue 缺少验收标准，无法确定哪个功能结果才算修复完成。
- issue 正文与评论中的需求存在冲突。

### #2 涉及产品策略选择

以下场景需要产品经理确认后再改：

- 用户可见功能行为需要在多个产品方案中二选一。
- 权限策略、业务规则、状态流转语义需要产品决策。
- 变更会影响既有交互约定，但 issue 未明确目标策略。

### #3 子 Agent 卡住且根因为需求不清

当子 Agent 失败且失败原因是“需求语义不明确”时，输出：

- 当前 issue 与卡点说明
- 已尝试过的可选方案
- 建议用户/产品经理补充的最小信息

## 验收与状态更新

每个 issue 修复完成后，主 Agent 应完成：

1. 校验子 Agent 报告与实际改动是否一致。
2. 校验并记录 lint、tscheck、单测三项结果（必要时主 Agent 复跑）。
3. 输出单 issue 结果卡片：
   - issue 信息
   - 修复摘要
   - 验证结果
   - 风险与后续建议
4. 仅当 lint/tscheck/单测全部通过时，校验子 Agent 已完成 commit 且 commit message 已关联 issue。
5. 校验子 Agent 已执行 issue 评论并成功关闭 issue。
6. 若 lint/tscheck/单测/commit/评论/关闭任一失败，主 Agent 补偿重试 1 次；仍失败则记入 `failed` 并继续下一条。
7. 若无 `pending confirmation`，自动进入下一个 issue。

## 失败处理策略

- 无法获取 issue：按 `gh.issue` 错误处理流程给出修复命令。
- 连续失败且需求明确：自动重试 1 次，仍失败则记入 `failed` 并继续下一条。
- lint/tscheck/单测任一失败：主 Agent 补偿重试 1 次；仍失败则记入 `failed`（质量门禁未通过）并继续下一条。
- commit 失败或 commit message 未关联 issue：主 Agent 补偿重试 1 次；仍失败则记入 `failed`（commit 阶段失败）并继续下一条。
- 评论或关闭失败：主 Agent 补偿重试 1 次；仍失败则记入 `failed`（状态回写失败）并继续下一条。
- 需求歧义导致失败：加入 `pending confirmation` 并请求产品确认。
- 无权限：停止并说明缺少的权限。

## 最终反馈格式

全部结束后，使用以下结构汇报：

- Repo: `owner/repo`
- Execution mode: `serial / one-issue-at-a-time / subagent-driven`
- Processed summary:
  - fixed, committed & closed: `#123`, `#128`
  - skipped: `#130`（原因）
  - failed: `#131`（原因）
  - commit failed: `#136`（原因）
  - pending confirmation: `#135`（需要产品确认的功能问题）
- Commits:
  - `#123 -> <hash>`
  - `#128 -> <hash>`
- Priority coverage:
  - P0: `x/y`
  - P1: `x/y`
  - P2: `x/y`
  - P3: `x/y`
  - P4: `x/y`
- Key changes: 3-5 条高价值修复点
- Suggested next step: 一个明确可执行动作

## 无 issue 时的输出

当 `P0/P1/P2/P3/P4` 都没有 open issue 时，返回：

- `未发现可处理的 P0-P4 open issue，当前队列已清空。`

## 质量门槛

- 每个 issue 都有可追溯修复证据。
- 串行顺序清晰，不越级并发。
- 每个成功修复 issue 都满足“lint 通过 + tscheck 通过 + 单测通过 + commit 关联 issue + 评论说明 + 关闭 issue”。
- commit 信息必须可追溯到对应 issue。
- 只有功能/产品确认点才需要用户确认，其余自动执行。
- 结论简洁、可执行、可复盘。
