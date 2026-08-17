# 计算属性和缓存

## 使用 Getter 创建计算属性

计算属性会自动追踪依赖并在依赖变化时重新计算：

```typescript
import { Service } from '@rabjs/react';

export class ShoppingCartService extends Service {
  items: Array<{ id: string; price: number; quantity: number }> = [];

  // 计算总价
  get total() {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  // 计算商品数量
  get itemCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  // 计算是否为空
  get isEmpty() {
    return this.items.length === 0;
  }

  addItem(id: string, price: number) {
    const item = this.items.find((i) => i.id === id);
    if (item) {
      item.quantity++;
    } else {
      this.items.push({ id, price, quantity: 1 });
    }
  }

  removeItem(id: string) {
    this.items = this.items.filter((i) => i.id !== id);
  }
}
```

## 使用 @Memo 装饰器缓存计算结果

对于计算成本高的属性，可以使用 `@Memo` 装饰器缓存结果：

```typescript
import { Service, Memo } from "@rabjs/react";

export class DataService extends Service {
  data: any[] = [];

  // 使用 @Memo 缓存昂贵的计算
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

## 最佳实践

### ✅ 使用计算属性而不是冗余状态

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

### ✅ 在 Service 中定义计算属性而不是在组件中计算

```typescript
// ❌ 不够优雅 - 在组件中计算
const MyComponent = observer(() => {
  const service = useService(TodoService);
  const activeTodos = service.todos.filter((t) => !t.done);
  return <div>{activeTodos.length}</div>;
});

// ✅ 正确 - 在 Service 中定义计算属性
export class TodoService extends Service {
  todos: any[] = [];

  get activeTodos() {
    return this.todos.filter((t) => !t.done);
  }
}

const MyComponent = observer(() => {
  const service = useService(TodoService);
  return <div>{service.activeTodos.length}</div>;
});
```
