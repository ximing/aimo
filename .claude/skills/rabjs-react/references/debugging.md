# 调试技巧

## 常见问题诊断

### 组件不更新？

1. **检查是否使用了 `observer` 或 `view`**

   ```typescript
   // ✅ 正确
   const Component = observer(() => {
     return <div>{service.count}</div>;
   });
   ```

2. **检查是否在 render 内部访问 observable**

   ```typescript
   // ❌ 错误：在 render 外部访问
   const count = service.count;
   const Component = observer(() => {
     return <div>{count}</div>; // 不会追踪
   });

   // ✅ 正确：在 render 内部访问
   const Component = observer(() => {
     return <div>{service.count}</div>;
   });
   ```

3. **检查是否解构了 observable**

   ```typescript
   // ❌ 错误：解构破坏响应性
   const { count } = service;
   return <div>{count}</div>;

   // ✅ 正确：直接访问
   return <div>{service.count}</div>;
   ```

### useService 报错？

1. **检查是否在 `bindServices` 内部使用**

   ```typescript
   // ✅ 正确
   const Content = () => {
     const service = useService(MyService);
     return <div />;
   };
   export default bindServices(Content, [MyService]);
   ```

2. **检查服务是否已注册**
   ```typescript
   // ✅ 确保服务在 bindServices 中注册
   bindServices(Component, [MyService]);
   ```

### 异步状态未更新？

1. **检查异步方法是否正确定义**

   ```typescript
   // ✅ 必须是 async 方法
   async fetchData() {
     this.data = await fetch(...);
   }
   ```

2. **检查是否正确访问 $model**
   ```typescript
   // ✅ 正确访问
   service.$model.fetchData.loading;
   service.$model.fetchData.error;
   ```

## 调试工具

### 1. 使用 React DevTools

安装 React DevTools 浏览器扩展，可以查看组件树和 props。

### 2. 打印容器信息

```typescript
const Component = observer(() => {
  const container = useContainer();
  console.log("Container:", container);
  console.log("Services:", container.getStats());
  return <div />;
});
```

### 3. 追踪状态变化

```typescript
export class DebugService extends Service {
  count = 0;

  increment() {
    console.log('Before:', this.count);
    this.count++;
    console.log('After:', this.count);
  }
}
```

### 4. 使用 useReaction 监听变化

```typescript
const Component = observer(() => {
  const service = useService(DataService);

  useReaction(() => {
    console.log("Data changed:", service.data);
  });

  return <div />;
});
```

## 常见陷阱

### 陷阱 1：忘记使用 observer

```typescript
// ❌ 错误：组件不会响应状态变化
const Counter = () => {
  const service = useService(CounterService);
  return <div>{service.count}</div>; // 不更新！
};

// ✅ 正确：使用 observer
const Counter = observer(() => {
  const service = useService(CounterService);
  return <div>{service.count}</div>; // 自动更新
});
```

### 陷阱 2：在 render 外部读取 observable

```typescript
// ❌ 错误：在 render 外部读取
const service = useService(CounterService);
const count = service.count; // 在 render 外部

const Counter = observer(() => {
  return <div>{count}</div>; // 不会追踪！
});

// ✅ 正确：在 render 内部读取
const Counter = observer(() => {
  const service = useService(CounterService);
  return <div>{service.count}</div>; // 正确追踪
});
```

### 陷阱 3：解构破坏响应性

```typescript
// ❌ 错误：解构会丢失响应性
const Counter = observer(() => {
  const service = useService(CounterService);
  const { count } = service; // 解构后不再是 observable
  return <div>{count}</div>; // 不会更新！
});

// ✅ 正确：直接访问
const Counter = observer(() => {
  const service = useService(CounterService);
  return <div>{service.count}</div>; // 保持响应性
});

// ✅ 或者使用 useObserver
const Counter = () => {
  const service = useService(CounterService);
  const count = useObserver(() => service.count);
  return <div>{count}</div>; // 正确追踪
};
```

### 陷阱 4：忘记注册依赖的服务

```typescript
// ❌ 错误：LoggerService 未注册
class UserService extends Service {
  @Inject(LoggerService)
  logger!: LoggerService;
}

bindServices(Component, [UserService]); // 缺少 LoggerService

// ✅ 正确：注册所有依赖
bindServices(Component, [LoggerService, UserService]);
```

## 性能调试

### 1. 检查不必要的重渲染

```typescript
const Component = observer(() => {
  console.log("Rendering Component");
  const service = useService(DataService);
  return <div>{service.data}</div>;
});
```

### 2. 使用 useObserverService 优化

```typescript
// ❌ 整个组件都会重渲染
const Component = observer(() => {
  const service = useService(DataService);
  return <div>{service.data.length}</div>;
});

// ✅ 只在 data.length 变化时重渲染
const Component = () => {
  const [length] = useObserverService(
    DataService,
    (s) => s.data.length
  );
  return <div>{length}</div>;
};
```

### 3. 使用 @Memo 缓存计算

```typescript
export class DataService extends Service {
  data: any[] = [];

  // 使用 @Memo 避免重复计算
  @Memo()
  get expensiveComputation() {
    return this.data.map(/* 昂贵的计算 */);
  }
}
```
