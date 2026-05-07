# 事件系统

RSJS 提供了强大的事件系统用于 Service 之间的通信，支持容器级别事件和全局事件。

## 容器级别事件 vs 全局事件

| 特性         | 容器级别事件              | 全局事件          |
| ------------ | ------------------------- | ----------------- |
| **作用域**   | 仅在当前容器内            | 跨所有容器        |
| **使用场景** | 同一领域内的 Service 通信 | 跨领域通信        |
| **性能**     | 更好（范围小）            | 稍差（范围大）    |
| **隔离性**   | 强（不同容器隔离）        | 弱（全局共享）    |
| **默认值**   | `scope: 'container'`      | `scope: 'global'` |

## 基本用法

### 容器级别事件（默认）

```typescript
import { Service } from '@rabjs/react';

// 发送方
export class ChatService extends Service {
  sendMessage(text: string) {
    // 发送容器级别事件（默认）
    this.emit('chat:message', { text });
  }
}

// 接收方
export class NotificationService extends Service {
  notifications: string[] = [];

  constructor() {
    super();

    // 监听容器级别事件（默认）
    this.on('chat:message', (data) => {
      this.notifications.push(data.text);
    });
  }
}

// 注册在同一个容器中
export default bindServices(ChatPage, [ChatService, NotificationService]);
```

### 全局事件

```typescript
// 发送方（领域 A）
export class PageAService extends Service {
  sendMessage(message: string) {
    // 发送全局事件
    this.emit('app:message', { from: 'PageA', text: message }, 'global');
  }
}

// 接收方（领域 B）
export class PageBService extends Service {
  receivedMessages: string[] = [];

  constructor() {
    super();

    // 监听全局事件
    this.on(
      'app:message',
      (data: { from: string; text: string }) => {
        this.receivedMessages.push(`${data.from}: ${data.text}`);
      },
      'global'
    );
  }
}

// PageA 和 PageB 在不同的容器中
export const PageA = bindServices(PageAContent, [PageAService]);
export const PageB = bindServices(PageBContent, [PageBService]);
```

## 事件 API

```typescript
class MyService extends Service {
  constructor() {
    super();

    // 监听容器事件
    this.on('event', handler);

    // 监听一次（自动移除）
    this.once('event', handler);

    // 监听全局事件
    this.on('event', handler, 'global');
  }

  sendEvent() {
    // 发送容器事件
    this.emit('event', data);

    // 发送全局事件
    this.emit('event', data, 'global');

    // 移除监听器
    this.off('event', handler);
  }
}
```

## 使用 @On 装饰器

```typescript
import { Service, On } from '@rabjs/react';

export class NotificationService extends Service {
  notifications: string[] = [];

  // 使用装饰器自动监听事件
  @On('chat:message')
  handleMessage(data: { text: string }) {
    this.notifications.push(data.text);
  }

  // 监听全局事件
  @On('app:message', 'global')
  handleGlobalMessage(data: { text: string }) {
    this.notifications.push(data.text);
  }
}
```

## 事件驱动的领域协作

```typescript
// 用户领域
export class UserDomainService extends Service {
  currentUser: any = null;

  login(user: any) {
    this.currentUser = user;
    // 发送全局事件通知其他领域
    this.emit('user:logged-in', user, 'global');
  }

  logout() {
    this.currentUser = null;
    this.emit('user:logged-out', undefined, 'global');
  }
}

// 购物车领域
export class CartDomainService extends Service {
  items: any[] = [];

  constructor() {
    super();

    // 监听用户登录事件
    this.on(
      'user:logged-in',
      (user: any) => {
        this.loadCartForUser(user.id);
      },
      'global'
    );

    // 监听用户登出事件
    this.on(
      'user:logged-out',
      () => {
        this.clearCart();
      },
      'global'
    );
  }

  private async loadCartForUser(userId: number) {
    // 加载用户购物车
  }

  private clearCart() {
    this.items = [];
  }
}

// 通知领域
export class NotificationDomainService extends Service {
  notifications: string[] = [];

  constructor() {
    super();

    this.on(
      'user:logged-in',
      (user: any) => {
        this.notifications.push(`欢迎回来，${user.name}！`);
      },
      'global'
    );

    this.on(
      'user:logged-out',
      () => {
        this.notifications.push('您已安全退出');
      },
      'global'
    );
  }
}
```

## 最佳实践

### ✅ 使用事件而不是紧耦合

```typescript
// ✅ 好：使用事件解耦
class AuthService extends Service {
  login() {
    // ...
    this.emit('auth:login-success', user);
  }
}

class AnalyticsService extends Service {
  constructor() {
    super();
    this.on('auth:login-success', (user) => {
      this.track('user_login', { userId: user.id });
    });
  }
}

// ❌ 不好：紧耦合
class AuthService extends Service {
  @Inject(AnalyticsService)
  analytics!: AnalyticsService;

  login() {
    // ...
    this.analytics.track('user_login', { userId: user.id });
  }
}
```

### 事件命名约定

- 使用 `domain:action` 格式：`user:logged-in`, `cart:item-added`
- 容器事件使用具体的名称：`chat:message`, `form:submit`
- 全局事件使用通用的名称：`app:notification`, `global:error`
