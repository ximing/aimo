# Memo 详情弹窗 URL 同步设计

## 目标

在首页点击 memo 卡片时，打开 `MemoDetailModal` 弹窗，同时 URL 变化为 `/home?memo=memo123`。刷新页面时保持弹窗打开状态。从通知等地方点击 memo 也有同样的效果。

## 现有代码分析

### URL 同步模式
`home.tsx` 已有对 `date` 和 `tags` URL 参数的双向同步：
- 页面加载时从 URL 读取参数初始化状态
- 状态变化时更新 URL（replace 模式，不产生历史记录）
- 监听 `popstate` 事件处理浏览器前进/后退

### MemoDetailModal
位于 `apps/web/src/pages/home/components/memo-detail-modal.tsx`，是 controlled 组件：
```typescript
interface MemoDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  memoId: string | null;
}
```
目前仅在 `DailyRecommendations` 中使用。

### 通知跳转
`NotificationCard.tsx` 构造 `/home?memo=<id>` URL。

## 改动清单

### 1. NotificationCard.tsx（第 18 行）

**现状：** `return notification.memoId ? \`/home?memo=${notification.memoId}\` : '/home';`

**改动：** 添加 `encodeURIComponent` 处理特殊字符：
```typescript
return notification.memoId ? `/home?memo=${encodeURIComponent(notification.memoId)}` : '/home';
```

### 2. home.tsx（多处改动）

#### 2.1 添加 state
```typescript
const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
```

#### 2.2 初始化读取 memo 参数
在现有 `useEffect`（读取 date、tags 参数）之后添加：
```typescript
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const memoParam = urlParams.get('memo');
  if (memoParam) {
    setSelectedMemoId(decodeURIComponent(memoParam));
  }
}, []);
```

#### 2.3 同步到 URL
在现有 `useEffect`（同步 date、tags）之后添加：
```typescript
useEffect(() => {
  setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    if (selectedMemoId) {
      next.set('memo', encodeURIComponent(selectedMemoId));
    } else {
      next.delete('memo');
    }
    return next;
  }, { replace: true });
}, [selectedMemoId, setSearchParams]);
```

#### 2.4 popstate 处理
在现有的 `window.addEventListener('popstate', handlePopState)` 处理中添加 memo 参数读取：
```typescript
const handlePopState = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const dateParam = urlParams.get('date');
  const tagParam = urlParams.get('tag');
  const tagsParams = urlParams.getAll('tags');
  const memoParam = urlParams.get('memo');
  // ... existing logic for date/tag/tags ...
  if (memoParam) {
    setSelectedMemoId(decodeURIComponent(memoParam));
  } else {
    setSelectedMemoId(null);
  }
};
```

#### 2.5 渲染 MemoDetailModal
在 JSX 中添加：
```tsx
<MemoDetailModal
  isOpen={!!selectedMemoId}
  onClose={() => setSelectedMemoId(null)}
  memoId={selectedMemoId}
/>
```

### 3. memo-list.tsx

**现状：** `MemoListProps` 只有 `onQuote` prop。

**改动：** 添加 `onMemoClick` 回调：
```typescript
interface MemoListProps {
  onQuote: (memo: Memo) => void;
  onMemoClick: (memoId: string) => void;  // 新增
}
```

在 `MemoCard` 的 `onClick` 处理中调用 `onMemoClick(memo.id)`。

### 4. home.tsx 传递 onMemoClick

```typescript
<MemoList
  onQuote={handleQuote}
  onMemoClick={(memoId) => setSelectedMemoId(memoId)}
/>
```

## 行为总结

| 操作 | URL 变化 | 弹窗 |
|------|---------|------|
| 点击 memo 卡片 | → `/home?memo=xxx` | 打开 MemoDetailModal |
| 关闭弹窗 | → `/home` | 关闭 |
| 刷新页面（有 memo 参数） | 保持 `/home?memo=xxx` | 打开 |
| 点击通知（memo 类型） | → `/home?memo=xxx` | 打开 |
| 浏览器后退 | → `/home` | 关闭 |

## 兼容性

- 保留现有的 RelatedMemosModal 交互（通过卡片菜单按钮）
- 不影响其他页面的 URL 处理
- URL 参数编解码处理特殊字符
