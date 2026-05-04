# Notification Center Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated notification center page with time-based grouping, tab filtering (All/Unread/Read), and mark-as-read functionality.

**Architecture:** Full-stack feature with minimal backend change (add read-all endpoint) and new frontend page. Follows existing patterns: `@rabjs/react` service layer, Tailwind CSS, routing-controllers for backend.

**Tech Stack:** React 19, @rabjs/react, Tailwind CSS, Express.js, Drizzle ORM

---

## File Structure

### Backend
- Modify: `apps/server/src/services/notification.service.ts` — add `markAllAsRead()` method
- Modify: `apps/server/src/controllers/v1/notification.controller.ts` — add `POST /read-all` endpoint

### Frontend
- Modify: `apps/web/src/api/notification.ts` — add `markAllAsRead()` API call
- Modify: `apps/web/src/services/notification.service.ts` — add `markAllAsRead()` method
- Create: `apps/web/src/pages/notifications/index.tsx` — NotificationPage
- Create: `apps/web/src/pages/notifications/NotificationTabs.tsx`
- Create: `apps/web/src/pages/notifications/NotificationGroup.tsx`
- Create: `apps/web/src/pages/notifications/NotificationCard.tsx`
- Modify: `apps/web/src/App.tsx` — add `/notifications` route
- Modify: `apps/web/src/components/layout.tsx` — add "View All" link to notification dropdown

---

## Chunk 1: Backend — Read-All API

### Task 1.1: Add markAllAsRead to NotificationService

**Files:**
- Modify: `apps/server/src/services/notification.service.ts`

- [ ] **Step 1: Add markAllAsRead method**

Add to `NotificationService` class (after line 93):

```typescript
/**
 * Mark all notifications as read for a user. Returns the count of updated notifications.
 */
async markAllAsRead(userId: string): Promise<number> {
  const db = getDatabase();

  const result = await db
    .update(inAppNotifications)
    .set({ isRead: true })
    .where(and(eq(inAppNotifications.userId, userId), eq(inAppNotifications.isRead, false)));

  // Drizzle doesn't return affected rows directly; use a separate count query
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(inAppNotifications)
    .where(and(eq(inAppNotifications.userId, userId), eq(inAppNotifications.isRead, true)));

  return Number(countResult[0]?.count ?? 0);
}
```

Note: The `and` import from 'drizzle-orm' is already present at line 2.

- [ ] **Step 2: Run TypeScript check**

Run: `cd /Users/ximing/project/mygithub/aimo/apps/server && pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/services/notification.service.ts
git commit -m "feat(server): add markAllAsRead to NotificationService"
```

---

### Task 1.2: Add read-all endpoint to NotificationController

**Files:**
- Modify: `apps/server/src/controllers/v1/notification.controller.ts`

- [ ] **Step 1: Add POST /read-all endpoint**

Add after line 79 (after markAsRead method):

```typescript
/**
 * POST /api/v1/notifications/read-all
 * Marks all notifications as read for the current user
 */
@Post('/read-all')
async markAllAsRead(@CurrentUser() user: UserInfoDto) {
  try {
    if (!user?.uid) {
      return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
    }

    const count = await this.notificationService.markAllAsRead(user.uid);
    return ResponseUtility.success({ count, message: `${count} notifications marked as read` });
  } catch (error) {
    logger.error('Mark all notifications as read error:', error);
    return ResponseUtility.error(ErrorCode.DB_ERROR, 'Failed to mark all notifications as read');
  }
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `cd /Users/ximing/project/mygithub/aimo/apps/server && pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/controllers/v1/notification.controller.ts
git commit -m "feat(server): add POST /api/v1/notifications/read-all endpoint"
```

---

## Chunk 2: Frontend API — Add markAllAsRead

### Task 2.1: Add markAllAsRead to notification API

**Files:**
- Modify: `apps/web/src/api/notification.ts`

- [ ] **Step 1: Add markAllAsRead API function**

Add after line 28 (after markAsRead):

```typescript
export const markAllAsRead = () =>
  request.post<unknown, { code: number; data: { count: number; message: string } }>(
    '/api/v1/notifications/read-all',
    {}
  );
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/api/notification.ts
git commit -m "feat(web): add markAllAsRead API"
```

---

## Chunk 3: Frontend Service — Add markAllAsRead

### Task 3.1: Add markAllAsRead to NotificationService

**Files:**
- Modify: `apps/web/src/services/notification.service.ts`

- [ ] **Step 1: Add markAllAsRead method**

Add after line 55 (after markAsRead method):

```typescript
async markAllAsRead(): Promise<boolean> {
  try {
    const res = await notificationApi.markAllAsRead();
    if (res.code === 0) {
      // Update local state - mark all as read
      this.notifications = this.notifications.map((n) => ({ ...n, isRead: true }));
      this.unreadCount = 0;
      return true;
    }
    return false;
  } catch (e) {
    console.error('Mark all as read error:', e);
    return false;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/services/notification.service.ts
git commit -m "feat(web): add markAllAsRead to NotificationService"
```

---

## Chunk 4: Frontend — Create NotificationPage and Components

### Task 4.1: Create NotificationCard component

**Files:**
- Create: `apps/web/src/pages/notifications/NotificationCard.tsx`

- [ ] **Step 1: Write NotificationCard component**

```tsx
import { useNavigate } from 'react-router';
import { useService } from '@rabjs/react';
import { NotificationService } from '../../services/notification.service';
import type { Notification } from '../../api/notification';

interface NotificationCardProps {
  notification: Notification;
}

const getNotificationIcon = (type: string) => {
  // Placeholder - can be enhanced with type-specific icons
  return '🔔';
};

const getNotificationPath = (notification: Notification): string => {
  if (notification.type === 'memo_mention' || notification.type === 'memo_comment') {
    return notification.memoId ? `/home?memo=${notification.memoId}` : '/home';
  }
  if (notification.type === 'ai_recommendation') {
    return '/ai-explore';
  }
  if (notification.type === 'system') {
    return '/settings';
  }
  return '/home';
};

export const NotificationCard = ({ notification }: NotificationCardProps) => {
  const navigate = useNavigate();
  const notificationService = useService(NotificationService);

  const handleClick = async () => {
    if (!notification.isRead) {
      await notificationService.markAsRead(notification.notificationId);
    }
    const path = getNotificationPath(notification);
    navigate(path);
  };

  const timeStr = new Date(notification.createdAt).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left p-4 rounded-lg border transition-colors hover:bg-gray-50 dark:hover:bg-dark-700 ${
        notification.isRead
          ? 'border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 opacity-60'
          : 'border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.type)}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white line-clamp-1">
            {notification.title}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
            {notification.body}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{timeStr}</p>
        </div>
        {!notification.isRead && (
          <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2" />
        )}
      </div>
    </button>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/notifications/NotificationCard.tsx
git commit -m "feat(web): add NotificationCard component"
```

---

### Task 4.2: Create NotificationGroup component

**Files:**
- Create: `apps/web/src/pages/notifications/NotificationGroup.tsx`

- [ ] **Step 1: Write NotificationGroup component**

```tsx
import { NotificationCard } from './NotificationCard';
import type { Notification } from '../../api/notification';

interface NotificationGroupProps {
  title: string;
  notifications: Notification[];
}

export const NotificationGroup = ({ title, notifications }: NotificationGroupProps) => {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 px-1">
        {title}
      </h2>
      <div className="space-y-3">
        {notifications.map((notification) => (
          <NotificationCard key={notification.notificationId} notification={notification} />
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/notifications/NotificationGroup.tsx
git commit -m "feat(web): add NotificationGroup component"
```

---

### Task 4.3: Create NotificationTabs component

**Files:**
- Create: `apps/web/src/pages/notifications/NotificationTabs.tsx`

- [ ] **Step 1: Write NotificationTabs component**

```tsx
import { useService } from '@rabjs/react';
import { NotificationService } from '../../services/notification.service';

export type NotificationTab = 'all' | 'unread' | 'read';

interface NotificationTabsProps {
  activeTab: NotificationTab;
  onTabChange: (tab: NotificationTab) => void;
}

export const NotificationTabs = ({ activeTab, onTabChange }: NotificationTabsProps) => {
  const notificationService = useService(NotificationService);

  const tabs: { key: NotificationTab; label: string; count?: number }[] = [
    { key: 'all', label: '全部' },
    { key: 'unread', label: '未读', count: notificationService.unreadCount },
    { key: 'read', label: '已读' },
  ];

  return (
    <div className="flex gap-1 bg-gray-100 dark:bg-dark-700 p-1 rounded-lg">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === tab.key
              ? 'bg-white dark:bg-dark-800 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
              {tab.count > 99 ? '99+' : tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/notifications/NotificationTabs.tsx
git commit -m "feat(web): add NotificationTabs component"
```

---

### Task 4.4: Create NotificationPage

**Files:**
- Create: `apps/web/src/pages/notifications/index.tsx`

- [ ] **Step 1: Write NotificationPage**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { view, useService, bindServices } from '@rabjs/react';
import { Layout } from '../../components/layout';
import { NotificationService } from '../../services/notification.service';
import { NotificationTabs, type NotificationTab } from './NotificationTabs';
import { NotificationGroup } from './NotificationGroup';
import { toast } from '../../services/toast.service';
import { Loader2 } from 'lucide-react';
import type { Notification } from '../../api/notification';

const groupNotificationsByTime = (notifications: Notification[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups: { title: string; notifications: Notification[] }[] = [
    { title: '今天', notifications: [] },
    { title: '昨天', notifications: [] },
    { title: '本周', notifications: [] },
    { title: '更早', notifications: [] },
  ];

  notifications.forEach((notification) => {
    const date = new Date(notification.createdAt);
    if (date >= today) {
      groups[0].notifications.push(notification);
    } else if (date >= yesterday) {
      groups[1].notifications.push(notification);
    } else if (date >= thisWeek) {
      groups[2].notifications.push(notification);
    } else {
      groups[3].notifications.push(notification);
    }
  });

  return groups.filter((g) => g.notifications.length > 0);
};

export const NotificationPage = bindServices(() => {
  const navigate = useNavigate();
  const notificationService = useService(NotificationService);
  const [activeTab, setActiveTab] = useState<NotificationTab>('all');
  const [markingAllRead, setMarkingAllRead] = useState(false);

  useEffect(() => {
    notificationService.fetchNotifications();
    notificationService.fetchUnreadCount();
  }, [notificationService]);

  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case 'unread':
        return notificationService.notifications.filter((n) => !n.isRead);
      case 'read':
        return notificationService.notifications.filter((n) => n.isRead);
      default:
        return notificationService.notifications;
    }
  }, [notificationService.notifications, activeTab]);

  const groupedNotifications = useMemo(
    () => groupNotificationsByTime(filteredNotifications),
    [filteredNotifications]
  );

  const hasUnreadInCurrentTab = activeTab !== 'read' && notificationService.unreadCount > 0;

  const handleMarkAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      const success = await notificationService.markAllAsRead();
      if (success) {
        toast.success('已全部标记为已读');
      } else {
        toast.error('操作失败，请重试');
      }
    } finally {
      setMarkingAllRead(false);
    }
  };

  return (
    <Layout>
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-dark-900">
        {/* Header */}
        <div className="flex-shrink-0 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700">
          <div className="max-w-[720px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-gray-600 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">通知中心</h1>
              </div>
              {activeTab !== 'read' && hasUnreadInCurrentTab && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markingAllRead}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 disabled:opacity-50 flex items-center gap-1"
                >
                  {markingAllRead && <Loader2 className="w-4 h-4 animate-spin" />}
                  全部已读
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="mt-4">
              <NotificationTabs activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[720px] mx-auto px-6 py-6">
            {notificationService.loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">暂无通知</p>
              </div>
            ) : (
              groupedNotifications.map((group) => (
                <NotificationGroup
                  key={group.title}
                  title={group.title}
                  notifications={group.notifications}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}, [NotificationService]);

export default NotificationPage;
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/notifications/index.tsx
git commit -m "feat(web): add NotificationPage"
```

---

## Chunk 5: Frontend — Route and Layout

### Task 5.1: Add /notifications route to App.tsx

**Files:**
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Import NotificationPage**

Add after line 19 (after TrashPage import):

```tsx
import NotificationPage from './pages/notifications';
```

- [ ] **Step 2: Add route**

Add after the `/trash` route block (after line 120, before `*` route):

```tsx
<Route
  path="/notifications"
  element={
    <ProtectedRoute>
      <NotificationPage />
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 3: Run TypeScript check**

Run: `cd /Users/ximing/project/mygithub/aimo/apps/web && pnpm typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "feat(web): add /notifications route"
```

---

### Task 5.2: Add "View All" link to notification dropdown

**Files:**
- Modify: `apps/web/src/components/layout.tsx`

- [ ] **Step 1: Add "View All" link to dropdown**

Find the notification dropdown (around line 232-289) and add a "View All" footer after the notification list, before the closing `</div>` of the dropdown.

After line 288 (`))}` closing the notification list map), add:

```tsx
<div className="px-4 py-3 border-t border-gray-200 dark:border-dark-700">
  <button
    onClick={() => {
      setIsNotificationOpen(false);
      navigate('/notifications');
    }}
    className="w-full text-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
  >
    查看全部
  </button>
</div>
```

- [ ] **Step 2: Run TypeScript check**

Run: `cd /Users/ximing/project/mygithub/aimo/apps/web && pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout.tsx
git commit -m "feat(web): add 'View All' link to notification dropdown"
```

---

## Verification

After completing all chunks:

1. Start the dev server: `pnpm dev`
2. Navigate to `/notifications`
3. Verify:
   - [ ] Notifications are grouped by time (今天/昨天/本周/更早)
   - [ ] Tab filtering works (全部/未读/已读)
   - [ ] Unread badge shows correct count
   - [ ] Clicking a notification card marks it as read and navigates
   - [ ] "全部已读" button marks all visible notifications as read
   - [ ] "查看全部" link in dropdown navigates to `/notifications`
4. Test error cases:
   - [ ] API failure shows toast error
   - [ ] Empty state shows "暂无通知"
