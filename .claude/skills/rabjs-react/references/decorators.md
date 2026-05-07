# 装饰器

RSJS 提供了多个装饰器来简化常见模式。

## @Inject - 依赖注入

```typescript
import { Service, Inject } from '@rabjs/react';

export class LoggerService extends Service {
  log(message: string) {
    console.log(`[Log] ${message}`);
  }
}

export class UserService extends Service {
  // 使用 @Inject 自动注入依赖
  @Inject(LoggerService)
  private logger!: LoggerService;

  async fetchUsers() {
    this.logger.log('Fetching users');
    // ...
  }
}

// 注册时包含依赖
bindServices(Component, [LoggerService, UserService]);
```

## @Debounce - 防抖

```typescript
import { Service, Debounce } from '@rabjs/react';

export class SearchService extends Service {
  query = '';
  results: any[] = [];

  setQuery(q: string) {
    this.query = q;
    this.search();
  }

  // 防抖 300ms
  @Debounce(300)
  async search() {
    if (!this.query) {
      this.results = [];
      return;
    }
    const response = await fetch(`/api/search?q=${this.query}`);
    this.results = await response.json();
  }
}
```

## @Throttle - 节流

```typescript
import { Service, Throttle } from '@rabjs/react';

export class ScrollService extends Service {
  scrollPosition = 0;

  // 节流 100ms
  @Throttle(100)
  handleScroll(event: Event) {
    this.scrollPosition = window.scrollY;
  }
}
```

## @Memo - 缓存计算属性

```typescript
import { Service, Memo } from "@rabjs/react";

export class DataService extends Service {
  data: any[] = [];

  // 缓存昂贵的计算结果
  @Memo()
  get expensiveComputation() {
    console.log("Computing...");
    return this.data
      .map(item => /* 复杂计算 */)
      .filter(/* 复杂过滤 */)
      .sort(/* 复杂排序 */);
  }
}
```

## @On - 自动监听事件

```typescript
import { Service, On } from '@rabjs/react';

export class NotificationService extends Service {
  notifications: string[] = [];

  // 自动监听容器事件
  @On('chat:message')
  handleMessage(data: { text: string }) {
    this.notifications.push(data.text);
  }

  // 自动监听全局事件
  @On('app:notification', 'global')
  handleGlobalNotification(data: { text: string }) {
    this.notifications.push(data.text);
  }
}
```

## 完整示例

```typescript
import { Service, Inject, Debounce, Throttle, Memo, On } from '@rabjs/react';

export class CompleteService extends Service {
  // 依赖注入
  @Inject(LoggerService)
  private logger!: LoggerService;

  data: any[] = [];
  query = '';

  // 防抖搜索
  @Debounce(300)
  async search(q: string) {
    this.logger.log(`Searching for: ${q}`);
    const response = await fetch(`/api/search?q=${q}`);
    this.data = await response.json();
  }

  // 节流滚动
  @Throttle(100)
  handleScroll() {
    this.logger.log('Scrolling...');
  }

  // 缓存计算
  @Memo()
  get filteredData() {
    return this.data.filter((item) => item.name.includes(this.query));
  }

  // 监听事件
  @On('data:refresh')
  handleRefresh() {
    this.search(this.query);
  }
}
```
