# 最佳实践

## 1. Service 职责分离

将 API 层和业务层分离：

```typescript
// ✅ 好：API 层和业务层分离
class UserApiService extends Service {
  async fetchUsers() {
    return fetch('/api/users').then((r) => r.json());
  }
}

class UserService extends Service {
  @Inject(UserApiService)
  api!: UserApiService;

  users: User[] = [];

  async loadUsers() {
    this.users = await this.api.fetchUsers();
  }
}

// ❌ 不好：混合在一起
class UserService extends Service {
  users: User[] = [];

  async loadUsers() {
    const response = await fetch('/api/users');
    this.users = await response.json();
  }
}
```

## 2. 使用计算属性而不是冗余状态

```typescript
// ❌ 不好：冗余状态
class ListService extends Service {
  items: Item[] = [];
  filteredItems: Item[] = [];

  filter(query: string) {
    this.filteredItems = this.items.filter(...);
  }
}

// ✅ 好：使用计算属性
class ListService extends Service {
  items: Item[] = [];
  query = "";

  get filteredItems() {
    return this.items.filter(item =>
      item.name.includes(this.query)
    );
  }
}
```

## 3. 组件保持简单

组件只负责渲染，所有逻辑在 Service 中：

```typescript
// ✅ 好：组件只负责渲染
const UserList = observer(() => {
  const service = useService(UserService);

  return (
    <ul>
      {service.filteredUsers.map(user => (
        <li key={user.id} onClick={() => service.selectUser(user.id)}>
          {user.name}
        </li>
      ))}
    </ul>
  );
});

// 所有逻辑在 Service 中
class UserService extends Service {
  users: User[] = [];
  selectedId: string | null = null;

  get filteredUsers() { ... }
  selectUser(id: string) { ... }
}

// ❌ 不好：逻辑在组件中
const UserList = observer(() => {
  const service = useService(UserService);
  const [selectedId, setSelectedId] = useState(null);

  const filteredUsers = service.users.filter(...);

  return (
    <ul>
      {filteredUsers.map(user => (
        <li key={user.id} onClick={() => setSelectedId(user.id)}>
          {user.name}
        </li>
      ))}
    </ul>
  );
});
```

## 4. 使用事件而不是紧耦合

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

## 5. 避免在组件外创建 Service 实例

```typescript
// ✅ 正确 - 通过 useService 获取
const MyComponent = observer(() => {
  const service = useService(MyService);
  return <div>{service.count}</div>;
});

// ❌ 错误 - 在组件外创建实例
const service = new MyService();
const MyComponent = () => {
  return <div>{service.count}</div>;
};
```

## 6. 使用 bindServices 注册 Service

```typescript
// ✅ 正确 - 使用 bindServices 导出
export default bindServices(MyComponent, [MyService]);

// ❌ 错误 - 直接导出
export default MyComponent;
```

## 7. 清晰的领域划分

```typescript
// ✅ 好 - 清晰的领域划分
// 应用级
export class AppService extends Service {
  /* 全局状态 */
}

// 页面级
export class TodoPageService extends Service {
  /* 页面状态 */
}

// 模块级
export class TodoListService extends Service {
  /* 模块状态 */
}

// ❌ 不好 - 混乱的领域划分
export class MixedService extends Service {
  /* 混合各种状态 */
}
```

## 8. 避免过度嵌套

```typescript
// ✅ 好 - 合理的嵌套深度
// App
//   └─ Page
//       └─ Module

// ❌ 不好 - 过度嵌套
// App
//   └─ Page1
//       └─ Module1
//           └─ SubModule1
//               └─ Component1
```

## 9. 正确使用全局容器和组件容器

```typescript
// ✅ 全局容器用于真正全局的 Service
register(ThemeService);
register(AuthService);
register(I18nService);

// ✅ bindServices 用于页面/组件级 Service
export const Page = bindServices(PageContent, [PageService]);

// ❌ 不要用 bindServices 注册全局 Service
export const App = bindServices(AppContent, [ThemeService]); // 错误！
```

## 10. 使用 TypeScript 类型

```typescript
// ✅ 好：使用类型
export class UserService extends Service {
  users: User[] = [];
  currentUser: User | null = null;

  async fetchUsers(): Promise<void> {
    this.users = await this.api.fetchUsers();
  }
}

// ❌ 不好：没有类型
export class UserService extends Service {
  users = [];
  currentUser = null;

  async fetchUsers() {
    this.users = await this.api.fetchUsers();
  }
}
```

## 代码组织示例

```
src/
├── services/
│   ├── global/          # 全局 Service
│   │   ├── AppService.ts
│   │   ├── AuthService.ts
│   │   └── ThemeService.ts
│   ├── api/             # API Service
│   │   ├── UserApiService.ts
│   │   └── DataApiService.ts
│   └── pages/           # 页面级 Service
│       ├── HomeService.ts
│       └── TodoService.ts
├── components/
│   ├── Home/
│   │   ├── index.tsx    # 使用 bindServices
│   │   └── HomeService.ts
│   └── TodoList/
│       ├── index.tsx
│       └── TodoListService.ts
└── App.tsx
```
