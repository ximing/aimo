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
`NotificationCard.tsx` 构造 `/home?memo=<id>` URL（需要用 `encodeURIComponent` 编码 memoId）。

## 改动方案

### 1. NotificationCard URL 编码修复

`apps/web/src/pages/notifications/NotificationCard.tsx` 第 18 行需要修复：

```typescript
// 修复前
return notification.memoId ? `/home?memo=${notification.memoId}` : '/home';

// 修复后
return notification.memoId ? `/home?memo=${encodeURIComponent(notification.memoId)}` : '/home';
```

### 2. home.tsx 添加 memo 参数同步

```typescript
// 状态
const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);

// 初始化：从 URL 读取 memo 参数
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const memoParam = urlParams.get('memo');
  if (memoParam) {
    setSelectedMemoId(decodeURIComponent(memoParam));
  }
}, []);

// 状态 → URL（保留其他参数如 date、tags）
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

// 监听浏览器前进/后退
useEffect(() => {
  const handlePopState = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const memoParam = urlParams.get('memo');
    setSelectedMemoId(memoParam ? decodeURIComponent(memoParam) : null);
  };
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, []);
```

### 3. MemoDetailModal 渲染

```tsx
<MemoDetailModal
  isOpen={!!selectedMemoId}
  onClose={() => setSelectedMemoId(null)}
  memoId={selectedMemoId}
/>
```

### 4. MemoCard 点击行为

**点击行为：**
- 点击 memo 卡片 → 打开 `MemoDetailModal`，同时 URL 变为 `/home?memo=xxx`
- 保留原有的 RelatedMemosModal 功能（通过卡片上的菜单按钮触发）

实现方式：在 `MemoList` 组件中添加 `onMemoClick` 回调，点击卡片时调用 `setSelectedMemoId`。

### 5. 无效 memoId 处理

当 memoId 对应的 memo 不存在时：
- `MemoDetailModal` 内部会显示错误状态
- 关闭弹窗时 URL 自动清除 memo 参数
- 不需要额外处理

## 行为总结

| 操作 | URL 变化 | 弹窗 |
|------|---------|------|
| 点击 memo 卡片 | → `/home?memo=xxx` | 打开 MemoDetailModal |
| 关闭弹窗 | → `/home` | 关闭 |
| 刷新页面（有 memo 参数） | 保持 `/home?memo=xxx` | 打开 |
| 点击通知（memo 类型） | → `/home?memo=xxx` | 打开 |
| 浏览器后退 | → `/home` | 关闭 |

## 改动文件清单

- `apps/web/src/pages/notifications/NotificationCard.tsx` — 添加 `encodeURIComponent`
- `apps/web/src/pages/home/home.tsx` — 添加 memo 参数同步逻辑
- `apps/web/src/pages/home/components/memo-list.tsx` — 添加 `onMemoClick` 回调处理

## 兼容性

- 保留现有的 RelatedMemosModal 交互（通过卡片菜单按钮）
- 不影响其他页面的 URL 处理
- URL 参数编解码处理特殊字符
