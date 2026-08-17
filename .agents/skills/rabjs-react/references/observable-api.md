# Observable API

底层 Observable API，用于更底层的响应式编程。

## 创建 Observable

```typescript
import { observable, raw, isObservable } from '@rabjs/react';

// 创建 observable 对象
const state = observable({ count: 0 });

// 获取原始对象（不会触发响应式追踪）
const rawObj = raw(state);

// 检查是否是 observable
isObservable(state); // true
isObservable(rawObj); // false
```

## 观察者

```typescript
import { observe, unobserve } from '@rabjs/react';

const state = observable({ count: 0 });

// 创建观察者
const reaction = observe(() => {
  console.log('Count:', state.count);
});

// 停止观察
unobserve(reaction);
```

## 完整示例

```typescript
import { observable, observe, unobserve } from '@rabjs/react';

// 创建响应式状态
const state = observable({
  count: 0,
  name: 'Alice',
});

// 创建观察者
const reaction = observe(() => {
  console.log(`${state.name}: ${state.count}`);
});

// 修改状态会自动触发观察者
state.count++; // 输出: Alice: 1
state.name = 'Bob'; // 输出: Bob: 1

// 停止观察
unobserve(reaction);

// 不再触发
state.count++; // 无输出
```

## API 总结

```typescript
// 创建 observable
const state = observable({ count: 0 });

// 获取原始对象
const rawObj = raw(state);

// 检查是否 observable
isObservable(state); // true

// 创建观察者
const reaction = observe(() => {
  console.log(state.count);
});

// 停止观察
unobserve(reaction);
```

## 何时使用

大多数情况下，你应该使用 `Service` 和 `observer`/`view`。只有在以下情况下才需要直接使用 Observable API：

- 需要创建非 Service 的响应式对象
- 需要手动控制观察者的生命周期
- 需要在 React 之外使用响应式系统
