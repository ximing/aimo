# PRD: AI Tools in Editor

## Introduction

在 memo 新建和编辑界面中添加 AI 工具入口，让用户可以在编辑过程中直接调用 AI 功能处理当前文档。首阶段支持智能标签生成，生成的标签建议通过弹窗展示，用户确认后回写到编辑状态的标签列表中。

## Goals

- 在编辑器附件区域旁添加 AI 工具入口
- 支持可扩展的 AI 功能菜单架构
- 实现智能标签生成功能（不回传服务端，直接回写编辑状态）
- 生成的标签自动去重，与现有标签合并
- 保持与现有 AI 工具一致的用户体验

## User Stories

### US-001: Add AI tools dropdown button in editor

**Description:** As a user, I want to access AI tools directly from the editor so I can enhance my memo while editing.

**Acceptance Criteria:**

- [ ] Sparkles icon button appears next to attachment button in editor
- [ ] Button visible in both create and edit modes
- [ ] Clicking button opens dropdown menu with AI tool options
- [ ] Dropdown currently shows "智能生成标签" option
- [ ] Dropdown positioned correctly below the button
- [ ] Click outside or press Escape closes dropdown
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-002: Create AI tag generation modal for editor

**Description:** As a user, I want to see AI-generated tag suggestions in a modal so I can select which tags to add to my memo.

**Acceptance Criteria:**

- [ ] Modal opens when selecting "智能生成标签" from dropdown
- [ ] Modal shows loading state with "AI 正在分析内容..."
- [ ] Generated tags displayed as selectable pills/chips
- [ ] Each tag can be toggled selected/unselected
- [ ] Shows count of selected tags
- [ ] Has "全选" and "取消全选" buttons
- [ ] Has "添加自定义标签" input field
- [ ] Modal has "取消" and "确认添加" buttons
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-003: Implement tag deduplication logic

**Description:** As a user, I want AI-generated tags to be automatically deduplicated against existing tags so I don't have duplicates.

**Acceptance Criteria:**

- [ ] Generated tags are compared with existing tags (case-insensitive)
- [ ] Tags that already exist are marked/visually indicated as "已存在"
- [ ] Duplicate tags cannot be selected for addition
- [ ] Existing tags are shown separately in the modal (optional view)
- [ ] Typecheck passes

### US-004: Write selected tags back to editor state

**Description:** As a user, I want selected AI-generated tags to be added to my memo's tag list when I confirm.

**Acceptance Criteria:**

- [ ] Clicking "确认添加" adds selected tags to editor's tag state
- [ ] New tags are appended to existing tags (not replacing)
- [ ] Tags are added to the TagInput component in real-time
- [ ] User sees the new tags appear in the editor immediately
- [ ] No API call to server (tags only saved when memo is saved)
- [ ] Canceling modal does not modify editor state
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: Extensible AI tools architecture

**Description:** As a developer, I want the AI tools menu to be easily extensible so we can add more AI features in the future.

**Acceptance Criteria:**

- [ ] Dropdown menu items defined in a configuration array
- [ ] Each menu item has: id, label, icon, handler
- [ ] Easy to add new menu items without modifying core logic
- [ ] Menu supports dividers between groups
- [ ] Typecheck passes

## Functional Requirements

- FR-1: AI tools button (Sparkles icon) appears in editor toolbar next to attachment button
- FR-2: Dropdown menu opens below the button with AI tool options
- FR-3: "智能生成标签" option triggers tag generation for current editor content
- FR-4: Tag generation modal displays AI-suggested tags with selection UI
- FR-5: Existing tags in editor are used for deduplication (case-insensitive)
- FR-6: Selected tags are added to editor's TagInput state on confirmation
- FR-7: AI tools menu is configurable and extensible
- FR-8: Modal behavior matches existing TagGeneratorModal pattern

## Non-Goals

- No direct server API calls from the modal (only local state changes)
- No auto-save of tags (user must save memo)
- No other AI features in this iteration (only tags)
- No AI editing of memo content (only tags)
- No keyboard shortcuts for AI tools

## Design Considerations

### Visual Design

- AI tools button: Sparkles icon, same size as attachment button
- Button styling: Subtle hover state, consistent with toolbar buttons
- Dropdown: White/dark background, shadow, rounded corners
- Menu items: Icon + label, hover highlight
- Selected tags in modal: Purple styling (consistent with existing)
- Duplicate tags: Grayed out with "已存在" label

### UX Patterns

- AI button only visible when editor is in focus/active
- Dropdown closes when clicking outside or pressing Escape
- Modal opens immediately showing loading state
- Tag suggestions appear with smooth fade-in animation
- Selected tags update count in real-time
- Confirmation button disabled when no tags selected

### Component Reuse

- Reuse TagGeneratorModal component with modifications
- Reuse TagInput component for displaying/editing tags
- Use existing AIToolsService for tag generation API
- Use existing Sparkles icon from lucide-react

## Technical Considerations

### State Management

```typescript
// Editor AI tools state
interface EditorAIToolsState {
  isDropdownOpen: boolean;
  isModalOpen: boolean;
  generatedTags: string[];
  selectedTags: string[];
  isLoading: boolean;
  existingTags: string[]; // For deduplication
}
```

### Props Interface

```typescript
interface EditorAIToolsProps {
  content: string; // Current editor content for AI processing
  existingTags: string[]; // Current tags for deduplication
  onTagsGenerated: (tags: string[]) => void; // Callback to add tags
}
```

### Integration Points

- Integrate with MemoEditorForm component
- Access current content from editor state
- Access current tags from TagInput component
- Call existing `/ai/generate-tags` API endpoint

### Deduplication Logic

```typescript
const existingTagSet = new Set(existingTags.map((t) => t.toLowerCase()));
const uniqueGeneratedTags = generatedTags.filter((tag) => !existingTagSet.has(tag.toLowerCase()));
```

## Success Metrics

- Users can access AI tools in editor within 1 click
- Tag generation completes in under 3 seconds
- Generated tags are properly deduplicated
- New tags appear in editor immediately after confirmation
- Code architecture allows adding new AI tools in <30 minutes

## Open Questions

- Should we show existing tags in the modal for reference?
- Maximum number of AI-generated tags to display?
- Should we support regenerating tags if user is not satisfied?
- Should AI tools button be disabled when content is empty?
