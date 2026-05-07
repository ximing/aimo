# Hooks API

## useObserver - 细粒度状态追踪

追踪特定值的变化，只在该值变化时重渲染：

```typescript
import { useObserver } from "@rabjs/react";

function Count() {
  // 只在 count 变化时重渲染
  const count = useObserver(() => state.count);
  return <div>{count}</div>;
}
```

## useObserverService - 追踪服务的特定字段

```typescript
import { useObserverService } from "@rabjs/react";

function UserCount() {
  // 只在 users.length 变化时重渲染
  const [count, service] = useObserverService(
    UserService,
    (s) => s.users.length
  );
  return <div>用户数: {count}</div>;
}
```

## useLocalObservable - 组件内部状态

创建组件内部的响应式状态：

```typescript
import { observer, useLocalObservable } from "@rabjs/react";

const Counter = observer(() => {
  const state = useLocalObservable(() => ({
    count: 0,
    increment() {
      this.count++;
    }
  }));

  return (
    <div>
      <p>{state.count}</p>
      <button onClick={state.increment}>+1</button>
    </div>
  );
});
```

## useReaction - 响应式副作用

当依赖的 observable 变化时自动执行副作用：

```typescript
import { observer, useReaction, useLocalObservable } from "@rabjs/react";

const Component = observer(() => {
  const state = useLocalObservable(() => ({ count: 0 }));

  // 当 count 变化时自动执行
  useReaction(() => {
    console.log("Count changed:", state.count);
    document.title = `Count: ${state.count}`;
  });

  return <button onClick={() => state.count++}>{state.count}</button>;
});
```

## useContainer - 获取当前容器

```typescript
import { useContainer } from "@rabjs/react";

const Component = observer(() => {
  const container = useContainer();
  console.log("Container:", container);
  return <div />;
});
```

## useContainerEvents - 获取事件发射器

```typescript
import { useContainerEvents } from "@rabjs/react";

const Component = observer(() => {
  const events = useContainerEvents();

  const sendMessage = () => {
    events.emit("chat:message", { text: "Hello" });
  };

  return <button onClick={sendMessage}>发送消息</button>;
});
```

## Hooks 总结

```typescript
// 响应式组件
observer(Component); // 函数组件 → 响应式组件
view(Component); // 函数/类组件 → 响应式组件

// 服务相关
useService(ServiceClass); // 获取服务实例
useObserverService(ServiceClass, selector); // 获取服务 + 追踪特定字段
useContainer(); // 获取当前容器
useContainerEvents(); // 获取事件发射器

// 状态追踪
useObserver(fn); // 追踪 fn 中访问的 observable
useLocalObservable(initializer); // 创建组件本地 observable

// 副作用
useReaction(effect, options); // 响应式副作用

// 容器绑定
bindServices(Component, services); // 创建容器并注册服务
```
