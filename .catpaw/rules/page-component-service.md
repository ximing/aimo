---
ruleType: Model Request
description: 页面级组件的服务管理模式。页面组件及其子组件的 Service
  应在页面统一注册，子组件通过 Domain 机制获取 Service，避免组件内重复注册。
name: page-component-service
---

# 页面级组件的服务管理模式

## 核心原则

页面级组件（放在 `src/pages/{xx页面}/components/`
下）的 Service 应遵循以下模式：

### 1. 服务注册位置

**✅ 正确做法**：在页面级 `bindServices` 中统一注册所有子组件的 Service

```typescript
// src/pages/workbench/index.tsx
export default bindServices(WorkbenchPage, [
  WorkbenchService, // 页面主业务 Service
  HeaderService, // 子组件 Service (页面级注册)
  OtherComponentService, // 其他子组件 Service
]);
```

**❌ 错误做法**：在子组件内部注册 Service

```typescript
// ❌ 不要这样做
// src/pages/workbench/components/header/header.tsx
export default bindServices(Header, [HeaderService]); // 不应该在这里注册
```

### 2. 子组件中的服务使用

**✅ 正确做法**：使用 `useService` 从 Domain 获取 Service

```typescript
// src/pages/workbench/components/header/header.tsx
const Header = view(() => {
  // 通过 Domain 机制自动获取 Service 实例
  const headerService = useService(HeaderService);

  return <div>{/* 组件内容 */}</div>;
});

export default Header; // 简洁导出，无需 bindServices
```

### 3. 服务导出

**✅ 正确做法**：从子组件的 `index.ts` 导出 Service

```typescript
// src/pages/workbench/components/header/index.ts
export { default as Header } from './header';
export { HeaderService } from './header.service';
```

**✅ 页面中的导入**：

```typescript
// src/pages/workbench/index.tsx
import { Header, HeaderService } from './components/header';
```

## Domain 机制工作原理

```
页面初始化时
    ↓
bindServices(WorkbenchPage, [HeaderService, ...])
    ↓
创建 Service 容器（Domain）
    ↓
组件渲染
    ↓
useService(HeaderService)
    ↓
从 Domain 中查询并获取 Service 实例 ✓
```

## 何时需要在组件内注册 Service

**多实例场景**：当需要多个独立的 Service 实例时，才在组件内注册

```typescript
// ✅ 多实例场景：列表中的每一项都有自己的 Service
export default bindServices(ListItemComponent, [ListItemService]);
```

## Service 设计指南

### 页面级 Service 特点

- 继承自 `@rabjs/react` 的 `Service` 类
- 类属性自动响应式
- 提供 setter 方法管理状态变化
- 可在 setter 中处理衍生状态（如依赖关系）

```typescript
export class HeaderService extends Service {
  selectedPoi: number | null = null;
  selectedOutbound: string | string[] | null = null;

  setSelectedPoi(value: number | null): void {
    this.selectedPoi = value;
    // 智能处理：选择站点时重置装货地
    this.selectedOutbound = null;
  }

  setSelectedOutbound(value: string | string[] | null): void {
    this.selectedOutbound = value;
  }
}
```

## 目录结构范例

```
src/pages/workbench/
├── index.tsx                    # 页面入口，注册所有 Service
├── workbench.service.ts         # 页面主 Service
├── components/
│   └── header/
│       ├── index.ts             # 导出组件和 Service
│       ├── header.tsx           # 组件源码（使用 Service）
│       ├── header.service.ts    # Service 定义
│       └── header.module.scss   # 样式
└── ...其他文件
```

## 检查清单

- [ ] 页面级组件的 Service 在页面 `bindServices` 中注册
- [ ] 子组件使用 `useService` 从 Domain 获取 Service
- [ ] 子组件导出文件包含 Service 导出
- [ ] 子组件末尾无 `bindServices` 调用（除非是多实例）
- [ ] Service 中的状态属性直接定义，无需 `reactive()` 包装
- [ ] 相关状态变化在 setter 中处理（如衍生状态）

## 相关规则

- 参考 `principle.md` 的目录规范
- 参考 `rs-react.md` 的状态管理原则
