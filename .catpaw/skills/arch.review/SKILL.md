---
name: arch-review
description: 面向 Echoe 功能正确性审查技能。只要用户提到“架构评审、流程校验、功能实现是否正常、重复代码治理、权限/跨租户安全检查、将问题转为 GitHub issue”，就应立即启用。若发现可执行且已确认的问题，必须使用 `gh` CLI 按严格模板创建 issue。
---

# Echoe 架构、FSRS 与功能正确性审查技能

使用本技能对代码变更做高置信、可落地的审查，并输出可执行结论。

## 目标（必须达成）

- **架构一致性**：确认实现符合仓库既有约束与分层边界。
- **通用功能正确性**：检查系统中其他功能实现是否正常。
- **可维护性**：识别重复逻辑与长期演进风险，降低后续分叉成本。
- **安全边界**：识别权限校验缺失、跨租户访问、越权写入等风险。

## 约束（必须遵守）

- **证据优先**：所有结论必须有代码路径或条件分支证据，禁止臆测。
- **高置信优先**：宁可少报，也不要低质量、模糊问题。
- **拿不准先确认**：对证据不足或业务语义不明确的问题，先与用户确认，再决定是否创建 issue。
- **变更驱动**：先从改动文件入手，再按依赖链最小化扩展范围。
- **规则对齐**：服务端日志必须符合 `@echoe/logger` 规范，不得接受 `console.*`。
- **输出严格**：
  - 无问题时，必须只返回：`当前架构符合规范`
  - 有问题时，必须给出结构化 findings，并创建 GitHub issue
- **严重问题必留证据**：`P0/P1` 必须包含明确文件与关键逻辑证据。
- **一问题一单**：若发现多个问题，必须一个 finding 对应一个 issue，禁止将多个独立问题合并到同一个 issue。

## 触发条件

当用户提出以下任一诉求时，立即启用本技能：

- 架构一致性检查
- 功能实现是否正常检查
- 重复代码/冗余逻辑检查
- 权限、跨租户、越权相关安全检查
- 将审查结论转成 GitHub issue

## 审查范围策略

1. 从变更集开始（`git status`、已修改模块），仅按依赖关系扩展。
3. 对变更涉及的功能，核对关键输入/输出、边界条件与异常分支。
4. 涉及持久化行为时，必须交叉检查 schema 与测试。
5. 对于整个仓库存量代码做深度的问题挖掘

## 五个强制审查维度

### 1) 架构一致性

检查是否符合仓库约束与既有模式：

- 租户边界：读写是否按 `uid` 等租户标识做隔离
- 日志规范：服务端是否统一使用 `@echoe/logger`
- 流程一致性：同一用户动作是否分叉成冲突实现
- 分层设计：controllers/services/utils 是否保持低耦合与清晰职责

### 3) 通用功能正确性

检查系统中其他业务功能是否实现正常：

- 关键输入/输出是否符合接口与业务预期
- 正常路径、边界条件、异常路径行为是否一致且可解释
- API/Service/DTO/持久化映射是否一致，避免“看似成功但数据错误”

### 4) 冗余代码

识别可维护性风险：

- 可抽取的重复逻辑块
- 多处重复的状态映射逻辑
- 可漂移的复制粘贴分支

### 5) 安全与权限检查

重点排查：

- 引用资源缺少归属校验
- 跨租户数据引用或泄露路径
- 超出权限边界的数据写入操作

## 严重级别定义

- `P0`：安全/数据隔离破坏，或严重功能性问题
- `P1`：显著行为不一致，影响用户结果
- `P2`：可维护性风险或局部行为缺口
- `P3`：次要改进项
- `P4`：低风险优化建议或观察项，不影响当前主要功能正确性

## 输出契约

### 无问题

仅返回：

- `当前架构符合规范`

### 有问题

按 finding 列表输出（简洁但完整）：

- id
- severity
- category
- impacted files
- why this is a problem
- concrete fix recommendation

## GitHub Issue 工作流（发现问题后必做）

当存在至少一个可执行 finding 时，必须创建 GitHub issue。

并遵循以下规则（强制）：

- 一个 finding 创建一个独立 issue（1:1）
- 若存在多个问题，必须创建多个 issue
- 不同根因或不同修复路径的问题不得合并
- 对证据不足或预期不明确的 finding，先与用户确认，再创建 issue

### Preflight

先执行并校验：

1. `gh --version`
2. `gh auth status`
3. `gh repo view --json nameWithOwner,viewerPermission`

仅在认证或权限无效时停止；否则继续。

### Issue 标题格式

使用：

`[arch-review][<P0|P1|P2|P3|P4>][<category>] <short summary>`

category 示例：

- `architecture`
- `redundancy`
- `security`

### Issue 正文模板（严格）

必须使用以下结构，不得改字段名：

```markdown
## Background
Why this review item matters in business/technical terms.

## Current behavior
What the code currently does.

## Problem
Why this is incorrect/risky. Include security impact explicitly if relevant.

## Scope and impact
Who/what is affected.

## Reproduction or evidence
- File paths
- Key logic snippets/conditions
- Optional repro steps

## Expected behavior
What correct behavior should be.

## Suggested fix
Concrete implementation direction, not vague advice.

## Acceptance criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
```

### Labels 与元数据

标签存在时优先添加：

- `bug`
- `arch-review`
- `security` / `tech-debt`（三选一）
- `P0` / `P1` / `P2` / `P3` / `P4`（必须且仅一个，需与 finding severity 一致）

若优先级标签不存在，先尝试创建对应标签；若因权限等原因失败，不得阻塞 issue 创建，但需在最终输出中说明缺失的标签。

### 创建 issue 后的最终输出格式

必须返回：

- Repo: `owner/repo`
- Findings reviewed: 按严重级别统计数量
- Issues created:
  - `#123` title - url
  - `#124` title - url
- Next step: 一个明确可执行的实现建议

## 质量门槛

- 每个 `P0/P1` finding 必须包含代码证据。
- 禁止无证据的猜测性结论。
- 对拿不准的问题，先与用户确认，确认后再建 issue。
- 优先输出少量高置信问题，而非大量低质量问题。
