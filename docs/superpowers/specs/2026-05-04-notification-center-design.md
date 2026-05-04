# 通知中心设计

## 概述

为 AIMO 设计一个独立的通知中心页面，提供通知的分组浏览、筛选、标记已读和跳转功能。

## 需求

- 按时间分组（今天、昨天、本周、更早）
- Tab 筛选：全部 / 未读 / 已读，Tab 显示未读数量 badge
- 卡片式列表布局
- 点击通知跳转到对应页面（备忘录 / AI 对话 / 设置）
- 支持标记单条或全部已读

## 页面结构

**路由**: `/notifications`

**布局**: 全屏居中卡片列表，最大宽度 720px

```
┌─────────────────────────────────────────┐
│  ← 返回侧边栏     通知中心     [全部已读] │
├─────────────────────────────────────────┤
│  [ 全部 ]  [ 未读 ]  [ 已读 ]           │  ← Tab 筛选
├─────────────────────────────────────────┤
│  今天                                    │
│  ┌─────────────────────────────────┐   │
│  │ [类型图标] 通知标题              │   │
│  │ 通知内容摘要...                  │   │
│  │ 10:30  ·  标记已读              │   │
│  └─────────────────────────────────┘   │
│  昨天                                    │
│  ...                                    │
└─────────────────────────────────────────┘
```

## 组件清单

| 组件 | 文件位置 | 说明 |
|------|----------|------|
| `NotificationPage` | `pages/notifications/` | 页面容器，管理 Tab 状态和通知列表 |
| `NotificationTabs` | `pages/notifications/` | 全部/未读/已读 Tab，支持 badge 显示未读数 |
| `NotificationGroup` | `pages/notifications/` | 时间分组容器（今天/昨天/本周/更早） |
| `NotificationCard` | `pages/notifications/` | 单条通知卡片 |

## 交互设计

| 交互 | 行为 |
|------|------|
| 点击卡片主体 | 跳转到通知来源页面（memo/AI conversation/settings） |
| 点击"标记已读" | 仅标记该条为已读，卡片降低 opacity |
| 悬停 | 显示浅灰背景 |
| 全部已读按钮 | 将当前 Tab 下的所有通知标记为已读 |

## 跳转目标映射

| 通知类型 | 跳转路径 |
|----------|----------|
| `memo_mention` / `memo_comment` | `/home?memo=:id` |
| `ai_recommendation` | `/ai-explore` |
| `system` | `/settings` |
| 未知类型 | `/home` |

## 数据流

```
NotificationService (现有)
    ↓ fetchNotifications()
    ↓ 返回 Notification[]
    ↓ 按时间分组 (client-side)
    ↓ 按 Tab 筛选 (全部/未读/已读)
    → NotificationPage 渲染
```

## 技术实现

- **路由**: 在 `App.tsx` 添加 `/notifications` 路由，使用 `ProtectedRoute`
- **样式**: Tailwind CSS，遵循现有深色模式支持
- **状态管理**: 复用现有 `NotificationService`，扩展分组/筛选逻辑
- **API**: 复用现有 `getNotifications()`, `markAsRead()` API

## 文件变更

- 新增: `apps/web/src/pages/notifications/index.tsx` (NotificationPage)
- 新增: `apps/web/src/pages/notifications/NotificationTabs.tsx`
- 新增: `apps/web/src/pages/notifications/NotificationGroup.tsx`
- 新增: `apps/web/src/pages/notifications/NotificationCard.tsx`
- 修改: `apps/web/src/App.tsx` (添加路由)
- 修改: `apps/web/src/components/layout.tsx` (通知入口改为跳转到 /notifications)
