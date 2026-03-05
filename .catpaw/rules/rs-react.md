---
ruleType: Model Request
description: "@rabjs/react" 的核心使用说明。所有使用状态管理的场景均需要加载此规则，提供了基于响应式的状态管理方案，如 *.service.ts，.tsx等。
globs: *.service.ts, *.tsx
---

# @rabjs/react 核心用法

## 特性

- 🚀 **响应式组件** - 使用 `observer` / `view` HOC 自动追踪 observable 变化
- 🎣 **Hooks 支持** - `useObserver`、`useLocalObservable`、`useService`
- 💉 **依赖注入** - 内置 IOC 容器，支持 Service 模式和依赖注入
- ⚡️ **并发模式** - 完全支持 React 18+ 的并发特性
- 🛡 **严格模式** - 正确处理 StrictMode 的双重渲染
- 🧹 **内存管理** - 自动清理资源，防止内存泄漏
- 📝 **TypeScript** - 完整的类型支持

## 核心 API

### 1. observer / view

将组件转换为响应式组件，自动追踪 observable 变化并重新渲染。

```tsx
import { observer, view } from '@rabjs/react';

// observer 用于函数组件
const ProductList = observer(() => {
  return <div>{productService.filteredProducts.length}</div>;
});

// view 支持函数和类组件
const Header = view(() => {
  return <header>{/* 内容 */}</header>;
});
```

### 2. Service

业务服务基类，默认响应式和 Action。

```tsx
import { Service } from '@rabjs/react';

class ProductService extends Service {
  // 所有属性默认是响应式的，无需装饰器
  products = [];
  filterStatus = 'all';

  // 计算属性（getter）
  get filteredProducts() {
    if (this.filterStatus === 'all') return this.products;
    return this.products.filter((p) => p.status === this.filterStatus);
  }

  // 所有方法默认是 Action，自动批量更新
  setFilterStatus(status: string) {
    this.filterStatus = status;
  }

  // 异步方法会自动追踪 loading 和 error 状态
  async fetchProducts() {
    const response = await fetch('/api/products');
    this.products = await response.json();
  }
}
```

**访问异步状态：**

```tsx
const ProductList = view(() => {
  const productService = useService(ProductService);

  // 访问异步方法的状态
  const { loading, error } = productService.$model.fetchProducts;

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error.message}</div>;

  return <div>{/* 产品列表 */}</div>;
});
```

### 3. useService

在组件中获取服务实例。会从当前组件向上查找最近的容器。

```tsx
import { useService } from '@rabjs/react';

function ProductList() {
  const productService = useService(ProductService);
  return <div>{productService.filteredProducts.length}</div>;
}
```

## Service 作用域

### 全局作用域 - 使用 register()

全局注册的 Service 生命周期独立于组件，整个应用共享。

```tsx
// app.tsx - 应用入口
import { register } from '@rabjs/react';
import { AuthService, ThemeService, ConfigService } from '@/services';

// 全局注册 Service（应用启动时执行一次）
register(AuthService);
register(ThemeService);
register(ConfigService);

function App() {
  return <Router>{/* 路由配置 */}</Router>;
}
```

**特点：**
- ✅ 全局单例，整个应用共享
- ✅ 生命周期独立于组件
- ✅ 任何组件都可以通过 `useService` 获取
- ✅ 适用于：认证、主题、全局配置等

### 组件作用域 - 使用 bindServices()

将 Service 与组件生命周期绑定，组件挂载时创建，卸载时销毁。

```tsx
// pages/product/index.tsx
import { bindServices, useService } from '@rabjs/react';

const ProductPage = () => {
  const productService = useService(ProductService);
  return <div>{/* 页面内容 */}</div>;
};

// bindServices 会自动创建容器并注入 observer
export default bindServices(ProductPage, [ProductService]);
```

**特点：**
- ✅ 组件挂载时创建，卸载时销毁
- ✅ 子组件可通过 `useService` 访问
- ✅ 同级组件的 Service 相互隔离
- ✅ 适用于：页面级状态、表单状态等
- ✅ 自动注入 observer，组件无需再包裹

**重要区别：**

| 特性 | register() | bindServices() |
|------|-----------|----------------|
| 生命周期 | 独立于组件 | 绑定组件生命周期 |
| 作用域 | 全局共享 | 组件及其子组件 |
| 实例数量 | 单例 | 每个组件独立实例 |
| 适用场景 | 认证、主题、配置 | 页面状态、表单 |

## 多级 Domain 嵌套

支持多级领域嵌套，子组件可访问父级 Service，同级 Service 相互隔离。

```tsx
import { Service, bindServices, useService, register } from '@rabjs/react';

// ========== 应用级 Service（全局注册）==========
register(AppService);

// ========== 页面级 Service ==========
const PageContent = () => {
  const appService = useService(AppService);     // ✅ 访问全局
  const pageService = useService(PageService);   // ✅ 访问当前级

  return (
    <div>
      <h2>{pageService.pageTitle}</h2>
      <ComponentA />
      <ComponentB />
    </div>
  );
};

export const Page = bindServices(PageContent, [PageService]);

// ========== 组件 A（第三级，独立领域）==========
const ComponentAContent = () => {
  const appService = useService(AppService);           // ✅ 访问应用级
  const pageService = useService(PageService);         // ✅ 访问页面级
  const componentService = useService(ComponentService); // ✅ 访问组件级

  return <div>主题: {appService.theme}</div>;
};

export const ComponentA = bindServices(ComponentAContent, [ComponentService]);

// ========== 组件 B（第三级，独立领域）==========
const ComponentBContent = () => {
  const appService = useService(AppService);   // ✅ 访问应用级
  const pageService = useService(PageService); // ✅ 访问页面级
  // ❌ 无法访问 ComponentA 的 ComponentService（同级隔离）

  return <div>页面: {pageService.pageTitle}</div>;
};

export const ComponentB = bindServices(ComponentBContent, [ComponentService]);
```

**特性说明：**

- ✅ 子组件可访问父级容器的 Service
- ✅ 同级容器的 Service 相互隔离
- ✅ 支持任意层级嵌套

## 页面级组件的服务管理

### 核心原则

页面级组件（放在 `src/pages/{xx页面}/components/` 下）的 Service 应在页面统一注册。

**✅ 正确做法**：在页面级 `bindServices` 中统一注册所有子组件的 Service

```tsx
// src/pages/workbench/index.tsx
import { Header, HeaderService } from './components/header';
import { Sidebar, SidebarService } from './components/sidebar';

export default bindServices(WorkbenchPage, [
  WorkbenchService,    // 页面主业务 Service
  HeaderService,       // 子组件 Service
  SidebarService,      // 子组件 Service
]);
```

**❌ 错误做法**：在子组件内部注册 Service

```tsx
// ❌ 不要这样做
// src/pages/workbench/components/header/header.tsx
export default bindServices(Header, [HeaderService]);
```

### 子组件中的服务使用

**✅ 正确做法**：使用 `view` + `useService` 从 Domain 获取

```tsx
// src/pages/workbench/components/header/header.tsx
import { view, useService } from '@rabjs/react';
import { HeaderService } from './header.service';

const Header = view(() => {
  // 通过 Domain 机制自动获取 Service 实例
  const headerService = useService(HeaderService);

  return <div>{/* 组件内容 */}</div>;
});

export default Header; // 简洁导出，无需 bindServices
```

### 何时需要在组件内注册 Service

**多实例场景**：当需要多个独立的 Service 实例时，才在组件内注册

```tsx
// ✅ 多实例场景：列表中的每一项都有自己的 Service
const ListItem = ({ data }) => {
  const itemService = useService(ListItemService);
  return <div>{/* 列表项内容 */}</div>;
};

export default bindServices(ListItem, [ListItemService]);

// 使用时每个 ListItem 都有独立的 Service 实例
<div>
  {items.map(item => <ListItem key={item.id} data={item} />)}
</div>
```

## 最佳实践

### Service 使用

- **逻辑分离**：业务逻辑放 Service，组件负责展示
- **默认特性**：实例默认响应式，方法默认 Action，无需装饰器
- **异步状态**：通过 `service.$model.methodName.loading/error` 访问
- **依赖注入**：用 `@Inject` 注入其他服务

### 响应式

- **自动响应**：`bindServices` 已注入 observer，无需再包裹
- **细粒度**：仅追踪部分状态时用 `useObserverService`
- **避免副作用**：不在 render 中修改状态
- **计算属性**：用 getter 或 `@Memo()` 缓存

### 性能优化

- **批量更新**：Service 方法默认批量更新
- **选择性响应**：用 `useObserverService` 仅在特定字段变化时渲染
- **避免追踪**：用 `raw()` 访问原始对象

## 常见问题

**Q: 全局 Service 和组件 Service 如何选择？**
A: 全局状态（认证、主题）用 `register`，页面/组件状态用 `bindServices`。

**Q: bindServices 后为何不需要 observer？**
A: `bindServices` 已自动注入 observer。

**Q: Service 需要装饰器吗？**
A: 不需要。默认响应式和 Action，装饰器仅用于高级功能。

**Q: observer vs view？**
A: observer 用于函数组件，view 支持函数和类组件。

**Q: Service 间如何通信？**
A: 用 `@Inject` 注入或事件系统（`this.emit`/`this.on`）。

## 详细文档参考

- 完整 API 文档：参考 `~/.claude/skills/generate-component-doc/references/rabjs-api-reference.md`
- Service 设计模式：参考 `~/.claude/skills/generate-component-doc/references/service-patterns.md`
- 页面组件管理：参考 `.catpaw/rules/page-component-service.md`
