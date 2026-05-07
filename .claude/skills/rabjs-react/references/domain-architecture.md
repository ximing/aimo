# 领域架构

## 什么是领域（Domain）？

领域是通过 `bindServices` 创建的一个独立的 Service 容器，与组件的生命周期绑定。

**关键特性**：

- ✅ **聚合根** - 每个领域有一个聚合根组件
- ✅ **作用域链** - 支持嵌套领域，自动向上查找 Service
- ✅ **隔离性** - 不同领域的 Service 相互隔离
- ✅ **简化代码** - 避免 props 层层透传

## 多级嵌套示例

```typescript
// 全局 Service（应用启动时注册）
register(GlobalService);
register(LoggerService);

// 应用级（第一级）
const AppContent = observer(() => {
  const global = useService(GlobalService);
  return (
    <div>
      <h1>{global.appName}</h1>
      <Page />
    </div>
  );
});
export const App = bindServices(AppContent, [AppService]);

// 页面级（第二级）
const PageContent = observer(() => {
  const global = useService(GlobalService);  // ✅ 可访问全局
  const app = useService(AppService);        // ✅ 可访问父级
  const page = useService(PageService);      // ✅ 可访问当前级
  return (
    <div>
      <h2>{page.title}</h2>
      <ComponentA />
      <ComponentB />
    </div>
  );
});
export const Page = bindServices(PageContent, [PageService]);

// 组件级（第三级）
const ComponentAContent = observer(() => {
  const global = useService(GlobalService);  // ✅ 可访问全局
  const app = useService(AppService);        // ✅ 可访问应用级
  const page = useService(PageService);      // ✅ 可访问页面级
  const comp = useService(ComponentService); // ✅ 可访问当前级
  return <div>组件 A</div>;
});
export const ComponentA = bindServices(ComponentAContent, [ComponentService]);

// 组件 B（独立领域）
const ComponentBContent = observer(() => {
  const global = useService(GlobalService);  // ✅ 可访问全局
  const app = useService(AppService);        // ✅ 可访问应用级
  const page = useService(PageService);      // ✅ 可访问页面级
  // ❌ 无法访问 ComponentA 的 ComponentService（不同的领域）
  return <div>组件 B</div>;
});
export const ComponentB = bindServices(ComponentBContent, [ComponentService]);
```

## 作用域链查找流程

当 `useService` 查找 Service 时：

1. 先在当前容器查找
2. 找不到则向上查找父容器
3. 继续向上直到找到或到达全局容器
4. 如果都找不到则报错

## 跨领域通信

使用全局事件在不同领域之间通信：

```typescript
// 领域 A
export class PageAService extends Service {
  sendMessage(message: string) {
    this.emit('app:message', { from: 'PageA', text: message }, 'global');
  }
}

// 领域 B
export class PageBService extends Service {
  receivedMessages: string[] = [];

  constructor() {
    super();
    this.on(
      'app:message',
      (data: { from: string; text: string }) => {
        this.receivedMessages.push(`${data.from}: ${data.text}`);
      },
      'global'
    );
  }
}
```

## 对比：有无领域

### 没有领域（Props 层层透传）

```typescript
// ❌ 需要层层透传 props
function App() {
  const [todos, setTodos] = useState([]);
  return <Page todos={todos} setTodos={setTodos} />;
}

function Page({ todos, setTodos }) {
  return <TodoList todos={todos} setTodos={setTodos} />;
}

function TodoList({ todos, setTodos }) {
  return <TodoItem todos={todos} setTodos={setTodos} />;
}

function TodoItem({ todos, setTodos }) {
  return <div>{todos.length}</div>;
}
```

### 使用领域（直接访问）

```typescript
// ✅ 使用领域，无需 props 透传
export class TodoService extends Service {
  todos: any[] = [];
}

const PageContent = observer(() => {
  return <TodoList />;
});
export const Page = bindServices(PageContent, [TodoService]);

const TodoList = observer(() => {
  const todoService = useService(TodoService);
  return <TodoItem />;
});

const TodoItem = observer(() => {
  const todoService = useService(TodoService);
  return <div>{todoService.todos.length}</div>;
});
```

## 最佳实践

### 1. 清晰的领域划分

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
```

### 2. 避免过度嵌套

```typescript
// ✅ 好 - 合理的嵌套深度
// App → Page → Module

// ❌ 不好 - 过度嵌套
// App → Page1 → Module1 → SubModule1 → Component1
```

### 3. 合理使用全局容器

```typescript
// ✅ 全局容器用于真正全局的 Service
register(ThemeService);
register(AuthService);
register(I18nService);

// ✅ bindServices 用于页面/组件级 Service
export const Page = bindServices(PageContent, [PageService]);
```
