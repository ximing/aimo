---
name: reactive-state-react
description: Quick reference for @rabjs/react (RSJS) - a React reactive state management library. Use this skill when working with @rabjs/react, implementing reactive components, creating Service classes, using dependency injection, or managing observable state in React applications. Covers observer/view patterns, useService/useObserver hooks, bindServices, Service lifecycle, async state tracking, event systems, and domain architecture.
---

# @rabjs/react 快速参考

这是为大模型优化的 `@rabjs/react` (RSJS) 快速参考指南，聚焦最核心的使用模式。

## 🎯 五大核心概念

### 1. 响应式组件：`observer` 和 `view`

**基本规则**：组件必须使用 `observer` 或 `view` 包裹才能自动响应状态变化。

```typescript·
import { observer, view } from "@rabjs/react";

// ✅ 方式 1：observer（推荐用于函数组件）
const Counter = observer(() => {
  const service = useService(CounterService);
  return <div>{service.count}</div>; // 自动追踪 count 变化
});

// ✅ 方式 2：view（支持类组件和函数组件）
class Counter extends React.Component {
  render() {
    const { store } = this.props;
    return <div>{store.count}</div>;
  }
}
export default view(Counter);

// ❌ 错误：忘记使用 observer
const Counter = () => {
  const service = useService(CounterService);
  return <div>{service.count}</div>; // 不会自动更新！
};
```

**关键点**：

- 必须在 `observer` 内部访问 observable 属性
- 不要解构 observable 对象（会破坏响应性）
- `view` 和 `observer` 功能相同，`view` 额外支持类组件

### 2. Service：业务逻辑容器

**基本规则**：所有业务逻辑都应该封装在 Service 类中，包括组件内的操作方法。

```typescript
import { Service } from "@rabjs/react";

export class CounterService extends Service {
  // 属性自动是 observable
  count = 0;

  // 方法自动是 action（批量更新）
  increment() {
    this.count++;
  }

  decrement() {
    this.count--;
  }

  // 计算属性（getter）
  get doubleCount() {
    return this.count * 2;
  }

  // 异步方法自动追踪 loading 和 error
  async fetchData() {
    const response = await fetch("/api/data");
    this.count = await response.json();
  }
}

// 在组件中访问异步状态
const Component = observer(() => {
  const service = useService(CounterService);

  // 自动生成的状态
  if (service.$model.fetchData.loading) return <div>加载中...</div>;
  if (service.$model.fetchData.error) return <div>错误</div>;
  // 可以直接使用，框架会处理好 this指向问题
  return <div onClick={service.fetchData}>{service.count}</div>;
});
```

**关键点**：

- Service 类继承自 `Service` 基类
- 所有属性自动是响应式的（observable）
- 所有方法自动批量更新（action）
- 异步方法自动追踪 `loading` 和 `error` 状态（通过 `$model.methodName`）

### 3. `useService` + `bindServices`：连接组件和 Service

**基本规则**：使用 `bindServices` 注册 Service，使用 `useService` 获取 Service 实例。

```typescript
import { observer, useService, bindServices } from "@rabjs/react";

// 1. 定义组件内容
const CounterContent = observer(() => {
  const service = useService(CounterService);
  return (
    <div>
      <p>{service.count}</p>
      <button onClick={() => service.increment()}>+1</button>
    </div>
  );
});

// 2. 使用 bindServices 注册服务并导出
export default bindServices(CounterContent, [CounterService]);

// 注册多个服务
export default bindServices(PageContent, [
  AuthService,
  UserService,
  DataService,
]);
```

**关键点**：

- `bindServices` 创建一个容器（领域）并注册 Service
- `useService` useService 使用前 对应的 Service 必须已经经过 bindService 或者 register 注册过
- `bindServices` 会自动将组件包裹为 `observer`（如果还没有的话）
- 容器与组件生命周期绑定：组件挂载时创建，卸载时销毁，容器内绑定的 Service 也跟随容器一起创建和销毁
- Service可见性：子组件可以访问父组件及组件树上一直到全局的 Service，比如页面bingServices 后，页面下子组件直接就可以useService

### 4. 组件和 Service 生命周期

**核心原则**：

- **全局单例 Service** → 使用 `register` 注册，**禁止**使用 `bindServices`
- **组件生命周期绑定的 Service** → 使用 `bindServices` 注册

#### 全局单例 Service（应用级）

```typescript
import { register, resolve, Service } from '@rabjs/react';

// 定义全局 Service
export class AppService extends Service {
  appName = 'My App';
  theme = 'light';
}

export class LoggerService extends Service {
  log(message: string) {
    console.log(`[Log] ${message}`);
  }
}

// ✅ 正确：在应用启动时使用 register 注册全局 Service
register(AppService);
register(LoggerService);

// 在任何地方解析全局 Service
const appService = resolve(AppService);
const loggerService = resolve(LoggerService);

// ❌ 错误：全局 Service 禁止使用 bindServices
// export default bindServices(App, [AppService]); // 错误！
```

#### 组件生命周期绑定的 Service

```typescript
// ✅ 正确：使用 bindServices 绑定到组件生命周期
export class PageService extends Service {
  pageData: any[] = [];

  async loadData() {
    // 页面级数据加载
  }
}

const PageContent = observer(() => {
  const service = useService(PageService);

  useEffect(() => {
    service.loadData();
  }, [service]);

  return <div>{service.pageData.length}</div>;
});

// 使用 bindServices 注册
export default bindServices(PageContent, [PageService]);

// 当组件挂载时：容器创建，Service 实例化
// 当组件卸载时：容器销毁，Service 清理
```

**生命周期对比**：

| 类型         | 注册方式         | 生命周期 | 创建时机 | 销毁时机 | 使用场景                       |
| ------------ | ---------------- | -------- | -------- | -------- | ------------------------------ |
| **全局单例** | `register()`     | 应用级   | 应用启动 | 应用关闭 | 全局配置、主题、用户认证等     |
| **组件绑定** | `bindServices()` | 组件级   | 组件挂载 | 组件卸载 | 页面数据、表单状态、局部功能等 |

### 5. Service 之间的关系

**核心原则**：Service 内部使用其他 Service 时，使用 getter + `resolve()` 获取依赖。

```typescript
import { Service, register } from '@rabjs/react';

// 依赖的 Service
export class LoggerService extends Service {
  log(message: string) {
    console.log(`[Log] ${message}`);
  }
}
// 全局Service
register(LoggerService);

export class ApiService extends Service {
  // ✅ 方式 1：使用 getter + resolve（推荐）
  get loggerService() {
    return this.resolve(LoggerService);
  }

  async fetchUsers() {
    this.loggerService.log('Fetching users...');
    return fetch('/api/users').then((r) => r.json());
  }
}
// 另一个全局Service
register(ApiService);

// 使用依赖的 Service
export class UserService extends Service {
  users: any[] = [];

  // ✅ 方式 1：使用 getter + resolve（推荐）
  get loggerService() {
    return this.resolve(LoggerService);
  }

  get apiService() {
    return this.resolve(ApiService);
  }

  async loadUsers() {
    this.loggerService.log('Loading users...');
    this.users = await this.apiService.fetchUsers();
    this.loggerService.log('Users loaded');
  }
}

// 注册时必须包含所有依赖
export default bindServices(UserPage, [
  UserService, // 主 Service
]);
```

**重要限制**：

- `resolve()` 只能解析**当前组件及其所有父组件树上通过 `bindServices` 注册的 Service**
- `resolve()` 可以解析：
  - ✅ 当前容器注册的 Service
  - ✅ 父组件容器注册的 Service
  - ✅ 全局注册的 Service（通过 `register`）
- `resolve()` 不能解析：
  - ❌ 兄弟组件容器的 Service
  - ❌ 子组件容器的 Service
  - ❌ 未注册的 Service

**作用域链示例**：

```typescript
// 全局 Service
register(GlobalService);
// 全局注册的单例Service可以直接通过 resolve 获取到实例
resolve(GlobalService);
// 应用级
const AppContent = observer(() => {
  return <Page />;
});
export const App = bindServices(AppContent, [AppService]);

// 页面级
const PageContent = observer(() => {
  return <Component />;
});
export const Page = bindServices(PageContent, [PageService]);

// 组件级
export class ComponentService extends Service {
  // ✅ 可以 resolve：
  get globalService() {
    return this.resolve(GlobalService); // 全局注册的
  }

  get appService() {
    return this.resolve(AppService); // 父级容器注册的
  }

  get pageService() {
    return this.resolve(PageService); // 父级容器注册的
  }

  // ❌ 不能 resolve：
  get siblingService() {
    return this.resolve(SiblingService); // 兄弟容器的 Service
  }
}

export default bindServices(ComponentContent, [ComponentService]);
```

**依赖注入的替代方式（使用装饰器）**：

```typescript
import { Service, Inject } from '@rabjs/react';

export class UserService extends Service {
  // 使用 @Inject 装饰器自动注入
  @Inject(LoggerService)
  private logger!: LoggerService;

  @Inject(ApiService)
  private api!: ApiService;

  async loadUsers() {
    this.logger.log('Loading users...');
    this.users = await this.api.fetchUsers();
  }
}

// 注册时仍需包含所有依赖，除了全局注册好的
export default bindServices(UserPage, [UserService]);
```

## 🔍 快速诊断

### 组件不更新？

1. **检查是否使用了 `observer` 或 `view`**

   ```typescript
   const Component = observer(() => { ... }); // ✅
   ```

2. **检查是否在 render 内部访问 observable**

   ```typescript
   // ✅ 在 render 内部
   const Component = observer(() => {
     return <div>{service.count}</div>;
   });
   ```

3. **检查是否解构了 observable**
   ```typescript
   // ❌ 避免解构
   const { count } = service;
   // ✅ 直接访问
   service.count;
   ```

### useService 报错？

1. **检查是否在 `bindServices` 内部使用**

   ```typescript
   export default bindServices(Content, [MyService]); // ✅
   ```

2. **检查 Service 是否已注册**
   ```typescript
   bindServices(Component, [MyService]); // ✅ 确保注册
   ```

### Service 依赖报错？

1. **检查依赖的 Service 是否已注册**

   ```typescript
   // ✅ 必须注册所有依赖
   bindServices(Component, [LoggerService, UserService]);
   ```

2. **检查作用域链**
   ```typescript
   // ❌ 不能访问兄弟组件的 Service
   // ✅ 只能访问父级或全局的 Service
   ```

## 📁 项目结构最佳实践

推荐的目录结构，清晰展示分层架构和 Services 与 Components 的绑定关系：

```
src/
├── services/                    # 全局 Services（使用 register 注册）
│   ├── logger.service.ts        # 日志服务（全局单例）
│   ├── api.service.ts           # API 服务（全局单例）
│   ├── auth.service.ts          # 认证服务（全局单例）
│   └── theme.service.ts         # 主题服务（全局单例）
│
├── pages/                       # 页面级组件（使用 bindServices）
│   ├── home/
│   │   ├── index.tsx            # 页面组件（bindServices + HomeService）
│   │   ├── home.service.ts      # 页面级 Service（页面生命周期）
│   │   └── components/          # 页面内的子组件
│   │       └── banner/
│   │           ├── index.tsx
│   │           └── banner.service.ts
│   │
│   ├── user/
│   │   ├── index.tsx            # 用户页面
│   │   ├── user.service.ts      # 用户页面 Service
│   │   └── components/
│   │       └── profile/
│   │           ├── index.tsx
│   │           └── profile.service.ts
│   │
│   └── todo/
│       ├── index.tsx            # Todo 页面
│       ├── todo.service.ts      # Todo 页面 Service
│       └── components/
│           ├── todo-list/
│           │   ├── index.tsx
│           │   └── todo-list.service.ts
│           └── todo-form/
│               ├── index.tsx
│               └── todo-form.service.ts
│
├── components/                  # 通用组件（使用 bindServices）
│   ├── search-bar/
│   │   ├── index.tsx
│   │   └── search-bar.service.ts  # 组件级 Service（组件生命周期）
│   │
│   └── data-table/
│       ├── index.tsx
│       └── data-table.service.ts  # 组件级 Service（组件生命周期）
│
├── app.tsx                      # 应用根组件
└── main.tsx                     # 应用入口（注册全局 Services）
```

### 代码示例

#### 1. 全局 Services 注册（main.tsx）

```typescript
// main.tsx
import { register } from "@rabjs/react";
import { LoggerService } from "./services/logger.service";
import { ApiService } from "./services/api.service";
import { AuthService } from "./services/auth.service";
import { ThemeService } from "./services/theme.service";

// ✅ 在应用启动时注册全局 Services
register(LoggerService);
register(ApiService);
register(AuthService);
register(ThemeService);

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
```

#### 2. 全局 Service 定义（services/logger.service.ts）

```typescript
// services/logger.service.ts
import { Service } from '@rabjs/react';

export class LoggerService extends Service {
  log(message: string) {
    console.log(`[Log] ${message}`);
  }

  error(message: string) {
    console.error(`[Error] ${message}`);
  }
}
```

#### 3. 页面级组件（pages/home/index.tsx）

```typescript
// pages/home/index.tsx
import { observer, useService, bindServices } from "@rabjs/react";
import { HomeService } from "./home.service";
import { UserInfo } from "@/components/user-info";

const HomeContent = observer(() => {
  const homeService = useService(HomeService);

  return (
    <div>
      <h1>{homeService.title}</h1>
      <UserInfo />
      <button onClick={() => homeService.loadData()}>加载数据</button>
    </div>
  );
});

// ✅ 使用 bindServices 注册页面级 Service
export default bindServices(HomeContent, [HomeService]);
```

#### 4. 页面级 Service（pages/home/home.service.ts）

```typescript
// pages/home/home.service.ts
import { Service } from '@rabjs/react';
import { LoggerService } from '@/services/logger.service';
import { ApiService } from '@/services/api.service';

export class HomeService extends Service {
  title = '首页';
  data: any[] = [];

  // ✅ 使用 getter + resolve 访问全局 Service
  get loggerService() {
    return this.resolve(LoggerService);
  }

  get apiService() {
    return this.resolve(ApiService);
  }

  async loadData() {
    this.loggerService.log('Loading home data...');
    this.data = await this.apiService.fetchHomeData();
    this.loggerService.log('Home data loaded');
  }
}
```

#### 5. 通用组件（components/user-info/index.tsx）

```typescript
// components/user-info/index.tsx
import { observer, useService, bindServices } from "@rabjs/react";
import { UserInfoService } from "./user-info.service";

const UserInfoContent = observer(() => {
  const service = useService(UserInfoService);

  return (
    <div>
      <p>用户名: {service.userName}</p>
      <p>邮箱: {service.email}</p>
    </div>
  );
});

// ✅ 使用 bindServices 注册组件级 Service
export const UserInfo = bindServices(UserInfoContent, [UserInfoService]);
```

#### 6. 组件级 Service（components/user-info/user-info.service.ts）

```typescript
// components/user-info/user-info.service.ts
import { Service } from '@rabjs/react';
import { AuthService } from '@/services/auth.service';

export class UserInfoService extends Service {
  userName = '';
  email = '';

  // ✅ 访问全局 AuthService
  get authService() {
    return this.resolve(AuthService);
  }

  constructor() {
    super();
    // 初始化时从 AuthService 获取用户信息
    const user = this.authService.currentUser;
    this.userName = user?.name || '';
    this.email = user?.email || '';
  }
}
```

### 架构层次关系

```
┌─────────────────────────────────────────────────────────┐
│  全局层（Global Layer）                                  │
│  - register() 注册                                       │
│  - 应用级生命周期                                        │
│  - LoggerService, ApiService, AuthService, ThemeService │
└─────────────────────────────────────────────────────────┘
                          ↓ 可访问
┌─────────────────────────────────────────────────────────┐
│  页面层（Page Layer）                                    │
│  - bindServices() 注册                                   │
│  - 页面级生命周期                                        │
│  - HomeService, UserService, TodoService                │
└─────────────────────────────────────────────────────────┘
                          ↓ 可访问
┌─────────────────────────────────────────────────────────┐
│  组件层（Component Layer）                               │
│  - bindServices() 注册                                   │
│  - 组件级生命周期                                        │
│  - UserInfoService, SearchBarService, DataTableService  │
└─────────────────────────────────────────────────────────┘
```

### 关键原则

1. **全局 Services**（services/）
   - ✅ 使用 `register()` 注册
   - ✅ 在 `main.tsx` 中注册
   - ✅ 应用级生命周期
   - ❌ 禁止使用 `bindServices`

2. **页面级 Services**（pages/\*/）
   - ✅ 使用 `bindServices()` 注册
   - ✅ 页面组件生命周期
   - ✅ 可访问全局 Services
   - ✅ Service 文件与组件文件同目录

3. **组件级 Services**（components/\*/）
   - ✅ 使用 `bindServices()` 注册
   - ✅ 组件生命周期
   - ✅ 可访问全局和父级 Services
   - ✅ Service 文件与组件文件同目录

4. **命名约定**
   - Service 文件：`xxx.service.ts`
   - 组件文件：`index.tsx`
   - 目录名：kebab-case（user-info, search-bar）

## 📖 进阶主题

更多高级功能和详细说明，请参考以下文档：

- **[异步操作和状态追踪](references/async-operations.md)** - `$model`、loading、error 状态详解
- **[计算属性和缓存](references/computed-properties.md)** - getter、`@Memo` 装饰器
- **[事件系统](references/event-system.md)** - 容器级事件、全局事件、`emit`/`on`/`off`
- **[装饰器](references/decorators.md)** - `@Inject`、`@Debounce`、`@Throttle`、`@On` 等
- **[Hooks API](references/hooks-api.md)** - `useObserver`、`useLocalObservable`、`useReaction` 等
- **[领域架构](references/domain-architecture.md)** - 多级嵌套、作用域链、跨领域通信
- **[Observable API](references/observable-api.md)** - `observable`、`raw`、`observe`、`unobserve`
- **[SSR 支持](references/ssr.md)** - `enableStaticRendering`
- **[调试技巧](references/debugging.md)** - 常见问题和解决方案
- **[最佳实践](references/best-practices.md)** - 代码组织、性能优化

## 💡 核心模式总结

```typescript
// 1. 定义 Service
export class CounterService extends Service {
  count = 0;
  increment() {
    this.count++;
  }
}

// 2. 创建响应式组件
const CounterContent = observer(() => {
  const service = useService(CounterService);
  return (
    <div>
      <p>{service.count}</p>
      <button onClick={() => service.increment()}>+1</button>
    </div>
  );
});

// 3. 使用 bindServices 导出
export default bindServices(CounterContent, [CounterService]);
```

**记住这三步，就掌握了 RSJS 的核心用法！**
