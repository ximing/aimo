# PRD: 类别筛选与管理功能

## Introduction

完善笔记类别管理功能，在memo列表页支持类别筛选，并允许用户创建和管理类别。类别数据存储在后端，用户选择的筛选状态保存在本地。

## Goals

- 在memo列表页搜索框旁添加类别筛选器，支持单选
- 筛选器支持"全部类别"选项，显示所有memo
- 用户选择的类别筛选状态本地持久化，刷新不丢失
- 创建/编辑memo时支持选择类别，无合适类别可直接创建
- 如果用户已选择某个筛选类别，创建memo时默认选中该类别
- 支持类别的基础管理（创建、编辑、删除）

## User Stories

### US-001: 获取类别列表API
**Description:** 作为开发者，我需要后端提供获取类别列表的API，以便前端展示类别筛选器。

**Acceptance Criteria:**
- [ ] GET /categories 返回所有类别列表
- [ ] 包含字段：id, name, createdAt, updatedAt
- [ ] 按名称字母顺序排序
- [ ] Typecheck/lint passes

### US-002: 创建类别API
**Description:** 作为开发者，我需要后端提供创建类别的API，支持用户在筛选器或创建memo时创建新类别。

**Acceptance Criteria:**
- [ ] POST /categories 创建新类别
- [ ] 请求体包含：name（必填，唯一）
- [ ] 返回创建的类别对象
- [ ] 重复名称返回409错误
- [ ] Typecheck/lint passes

### US-003: 更新/删除类别API
**Description:** 作为开发者，我需要支持类别的编辑和删除功能。

**Acceptance Criteria:**
- [ ] PUT /categories/:id 更新类别名称
- [ ] DELETE /categories/:id 删除类别
- [ ] 删除类别时，关联的memo的categoryId设为null
- [ ] 提供迁移脚本处理现有数据
- [ ] Typecheck/lint passes

### US-004: 类别筛选器组件
**Description:** 作为用户，我需要在memo列表页通过类别筛选快速找到相关笔记。

**Acceptance Criteria:**
- [ ] 筛选器位于搜索框旁边
- [ ] 下拉形式，单选
- [ ] 首选项为"全部类别"，显示所有memo
- [ ] 列出所有现有类别选项
- [ ] 选中项高亮显示
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: 本地持久化筛选状态
**Description:** 作为用户，我希望刷新页面后仍保持之前的类别筛选选择。

**Acceptance Criteria:**
- [ ] 使用localStorage存储当前选中的类别ID
- [ ] 页面加载时自动恢复上次选择的类别
- [ ] "全部类别"状态也被记忆
- [ ] 清除浏览器数据后恢复默认（全部类别）
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-006: 筛选器创建新类别
**Description:** 作为用户，当没有合适的类别时，我希望能直接在筛选器中创建新类别。

**Acceptance Criteria:**
- [ ] 筛选器下拉底部有"+ 新建类别"按钮
- [ ] 点击弹出创建类别对话框
- [ ] 输入类别名称，点击确认创建
- [ ] 创建成功后自动选中新类别并刷新列表
- [ ] 类别名称不能为空，最多50字符
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-007: 创建memo时选择类别
**Description:** 作为用户，我创建笔记时希望能为其指定类别。

**Acceptance Criteria:**
- [ ] 创建memo对话框/表单中增加类别选择器
- [ ] 类别选择器位于内容输入区域附近
- [ ] 显示所有现有类别，支持单选
- [ ] 支持选择"无类别"
- [ ] 保存时categoryId与memo关联
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008: 创建memo时快捷创建类别
**Description:** 作为用户，如果在创建memo时发现没有合适的类别，我希望能够直接创建。

**Acceptance Criteria:**
- [ ] 类别选择器中有"+ 新建类别"选项
- [ ] 点击后弹出创建类别对话框
- [ ] 创建成功后新类别自动被选中
- [ ] 不需要关闭创建memo对话框
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-009: 根据筛选状态默认选中类别
**Description:** 作为用户，如果我已经筛选了某个类别，创建新memo时应该自动默认选中该类别。

**Acceptance Criteria:**
- [ ] 读取本地存储的当前筛选类别
- [ ] 打开创建memo对话框时，自动选中该类别
- [ ] 如果筛选是"全部类别"，则默认"无类别"
- [ ] 用户可以手动更改选择
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-010: 显示memo的类别标签
**Description:** 作为用户，我希望在memo列表中能看到每个笔记的类别。

**Acceptance Criteria:**
- [ ] memo卡片上显示类别名称（如果有）
- [ ] 类别标签样式简洁，不喧宾夺主
- [ ] 无类别的memo不显示标签
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-011: 编辑memo时修改类别
**Description:** 作为用户，我希望能够修改已有memo的类别。

**Acceptance Criteria:**
- [ ] 编辑memo时显示当前类别
- [ ] 可以更改类别选择
- [ ] 可以移除类别（设为无类别）
- [ ] 同样支持快捷创建新类别
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: 后端提供完整的类别CRUD API（GET /categories, POST /categories, PUT /categories/:id, DELETE /categories/:id）
- FR-2: memo列表页搜索框旁显示类别筛选下拉框
- FR-3: 筛选器首选项为"全部类别"，选中时显示所有memo
- FR-4: 筛选器支持单选，选中后memo列表实时过滤
- FR-5: 当前筛选类别ID存储在localStorage中，key为`memo_category_filter`
- FR-6: 筛选器下拉底部提供"+ 新建类别"按钮，点击弹出对话框
- FR-7: 创建memo表单包含类别选择器，支持选择已有类别或"无类别"
- FR-8: 类别选择器旁提供快捷创建类别入口
- FR-9: 打开创建memo对话框时，自动选中当前筛选的类别（如不是"全部类别"）
- FR-10: memo卡片显示其类别标签（仅当有类别时）
- FR-11: 编辑memo支持修改类别
- FR-12: 删除类别时，所有关联memo的categoryId自动设为null

## Non-Goals

- 不支持多类别标签（一个memo只能有一个类别）
- 不支持类别颜色或图标
- 不支持类别排序（按字母顺序）
- 不支持子类别或层级结构
- 后端暂不做分页（假设类别数量不多）

## Design Considerations

- 筛选器使用与现有UI一致的下拉组件
- 类别标签使用次要文本样式，避免视觉干扰
- 创建类别对话框使用Modal组件，简洁表单
- 考虑空状态：当某类别下无memo时的友好提示

## Technical Considerations

- 复用现有的categoryId字段（已存在）
- 前端localStorage key：`aimo_memo_category_filter`
- 需要创建CategoryService处理类别相关API调用
- 需要创建CategoryStore管理类别列表和当前选中状态
- 创建类别成功后需要刷新类别列表缓存

## API Schema

### Category DTO
```typescript
interface Category {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// POST /categories
interface CreateCategoryDto {
  name: string; // 必填，1-50字符，唯一
}

// PUT /categories/:id
interface UpdateCategoryDto {
  name: string; // 必填，1-50字符，唯一
}
```

## Success Metrics

- 用户可以在2步内完成类别筛选
- 创建新类别不超过3次点击
- 类别筛选状态在页面刷新后100%恢复
- memo列表加载类别筛选器不超过500ms

## Open Questions

- 是否需要限制每个用户的类别数量上限？
- 类别名称是否需要支持emoji或特殊字符？
