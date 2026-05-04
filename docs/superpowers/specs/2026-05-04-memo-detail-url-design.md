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
`NotificationCard.tsx` 已构造 `/home?memo=<id>` URL，但 `home.tsx` 未处理 `memo` 参数。

## 改动方案

### 1. home.tsx 添加 memo 参数同步

```typescript
// 状态
const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);

// 初始化：从 URL 读取 memo 参数
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const memoParam = urlParams.get('memo');
  if (memoParam) {
    setSelectedMemoId(memoParam);
  }
}, []);

// 状态 → URL
useEffect(() => {
  setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    if (selectedMemoId) {
      next.set('memo', selectedMemoId);
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
    setSelectedMemoId(memoParam);
  };
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, []);
```

### 2. MemoDetailModal 渲染

```tsx
<MemoDetailModal
  isOpen={!!selectedMemoId}
  onClose={() => setSelectedMemoId(null)}
  memoId={selectedMemoId}
/>
```

### 3. MemoCard 点击行为

现有 `MemoCard` 的点击事件已通过 `onClick` 打开 RelatedMemosModal。保持该行为不变，在 `home.tsx` 中额外处理 memo 详情：

- 在 memo 列表的容器层面统一处理点击，或
- 在 `MemoCard` 上新增 `onMemoClick` 回调（如果需要更精细控制）

具体实现需查看 `MemoCard` 和 `MemoList` 的当前实现后确定。核心思路是：点击任意 memo 卡片时设置 `selectedMemoId`。

### 4. 相关文件

- `apps/web/src/pages/home/home.tsx` — 添加 memo 参数同步
- `apps/web/src/pages/home/components/memo-detail-modal.tsx` — 确认 props 接口
- `apps/web/src/pages/home/components/memo-list.tsx` 或 `memo-card.tsx` — 确认点击处理方式

## 行为总结

| 操作 | URL 变化 | 弹窗 |
|------|---------|------|
| 点击 memo 卡片 | → `/home?memo=xxx` | 打开 |
| 关闭弹窗 | → `/home` | 关闭 |
| 刷新页面（有 memo 参数） | 保持 `/home?memo=xxx` | 打开 |
| 点击通知（memo 类型） | → `/home?memo=xxx` | 打开 |
| 浏览器后退 | → `/home` | 关闭 |

## 兼容性

- 通知等已有 URL 构造逻辑无需改动
- 保留现有的 RelatedMemosModal 交互
- 不影响其他页面的 URL 处理
