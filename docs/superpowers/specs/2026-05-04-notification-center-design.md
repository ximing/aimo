# 通知中心设计

## 概述

为 AIMO 设计一个独立的通知中心页面，提供通知的分组浏览、筛选、标记已读和跳转功能。

## 需求

- 按时间分组（今天、昨天、本周、更早）
- Tab 筛选：全部 / 未读 / 已读，Tab 显示未读数量 badge
- 卡片式列表布局
- 点击通知跳转到对应页面（备忘录 / AI 对话 / 设置）
- 支持标记单条或全部已读
- 侧边栏铃铛图标保留为快速预览，点击"查看全部"跳转到通知中心页面

## 页面结构

**路由**: `/notifications`

**布局**: 全屏居中卡片列表，最大宽度 720px

```
┌─────────────────────────────────────────┐
│  ← 返回侧边栏     通知中心     [全部已读] │
├─────────────────────────────────────────┤
│  [ 全部 (50) ]  [ 未读 (12) ]  [ 已读 ] │  ← Tab 筛选
├─────────────────────────────────────────┤
│  今天                                    │
│  ┌─────────────────────────────────┐   │
│  │ [类型图标] 通知标题              │   │
│  │ 通知内容摘要...                  │   │
│  │ 10:30                          │   │
│  └─────────────────────────────────┘   │
│  昨天                                    │
│  ...                                    │
│  本周                                    │
│  ...                                    │
│  更早                                    │
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
| `NotificationDropdown` | `components/layout.tsx` | 侧边栏下拉预览（现有组件，保留） |

## 交互设计

| 交互 | 行为 |
|------|------|
| 点击卡片主体 | 标记该通知为已读，然后跳转到来源页面（memo/AI conversation/settings） |
| 悬停卡片 | 显示浅灰背景 |
| 全部已读按钮 | 调用 `POST /api/v1/notifications/read-all` 将当前 Tab 下所有未读通知标记为已读 |

**注意**: 点击卡片即标记为已读，无需单独按钮。"标记已读"按钮从设计中去掉。

## 跳转目标映射

| 通知类型 | 跳转路径 |
|----------|----------|
| `memo_mention` / `memo_comment` | `/home?memo=:id` |
| `ai_recommendation` | `/ai-explore` |
| `system` | `/settings` |
| 无 memoId 的其他类型 | `/review` |
| 未知类型 | `/home` |

## 分页策略

- 保留现有 API 的 50 条限制
- 前端按时间分组展示，不做额外分页
- 若通知数量超过 50 条，后续可扩展 `?before=:timestamp` 分页 API

## Badge 同步

- 进入 `/notifications` 页面时，当前可见的未读通知自动标记为已读
- `NotificationService.unreadCount` 更新，侧边栏 badge 同步减少

## 侧边栏铃铛行为

| 场景 | 行为 |
|------|------|
| 点击铃铛图标 | 展开下拉预览（现有行为不变），显示最近 5 条通知 + "查看全部" 链接 |
| 点击"查看全部" | 跳转到 `/notifications` |
| 点击通知项 | 标记已读 + 跳转 + 关闭下拉 |

## 数据流

```
NotificationService (现有)
    ↓ fetchNotifications()
    ↓ 返回 Notification[]
    ↓ 按时间分组 (client-side)
    ↓ 按 Tab 筛选 (全部/未读/已读)
    → NotificationPage 渲染
    ↓ 点击卡片
    → markAsRead() + router.push()
```

## 技术实现

- **路由**: 在 `App.tsx` 添加 `/notifications` 路由，使用 `ProtectedRoute`
- **样式**: Tailwind CSS，遵循现有深色模式支持
- **状态管理**: 复用现有 `NotificationService`，扩展分组/筛选逻辑
- **API**: 复用现有 `getNotifications()`, `markAsRead()` API
- **新增 API**: `POST /api/v1/notifications/read-all` (标记全部已读)

## 文件变更

- 新增: `apps/web/src/pages/notifications/index.tsx` (NotificationPage)
- 新增: `apps/web/src/pages/notifications/NotificationTabs.tsx`
- 新增: `apps/web/src/pages/notifications/NotificationGroup.tsx`
- 新增: `apps/web/src/pages/notifications/NotificationCard.tsx`
- 修改: `apps/web/src/App.tsx` (添加 `/notifications` 路由)
- 修改: `apps/web/src/components/layout.tsx` (添加"查看全部"链接)
- 后端: `apps/server/src/controllers/v1/notification.controller.ts` (添加 read-all 接口)
- 后端: `apps/server/src/services/notification.service.ts` (添加 markAllAsRead 方法)

## 错误处理

- API 请求失败: 显示 Toast 错误提示
- 空列表: 显示空状态插图 + "暂无通知" 文案
- 加载中: 显示骨架屏 (Skeleton) 占位

## 边界情况

- 无未读通知时，"全部已读"按钮禁用
- 已读 Tab 下，"全部已读"按钮隐藏
- 跳转目标无效时 (memo 被删除等)，fallback 到 `/home`
