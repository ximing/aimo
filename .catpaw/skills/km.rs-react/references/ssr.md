# SSR 支持

RSJS 支持服务端渲染（Server-Side Rendering）。

## 基本用法

在服务端禁用响应式追踪：

```typescript
import { enableStaticRendering } from '@rabjs/react';

// 在服务端代码中
if (typeof window === 'undefined') {
  enableStaticRendering(true);
}
```

## 完整示例

### 服务端入口

```typescript
// server.tsx
import { enableStaticRendering } from "@rabjs/react";

// 禁用响应式追踪
enableStaticRendering(true);

import { renderToString } from "react-dom/server";
import App from "./App";

export function render() {
  return renderToString(<App />);
}
```

### 客户端入口

```typescript
// client.tsx
import { hydrateRoot } from "react-dom/client";
import App from "./App";

hydrateRoot(document.getElementById("root")!, <App />);
```

## 注意事项

1. **在服务端禁用响应式追踪**

   ```typescript
   enableStaticRendering(true);
   ```

2. **Service 在服务端仍然可用**

   ```typescript
   // Service 可以正常使用
   export class DataService extends Service {
     data: any[] = [];

     async loadData() {
       // 在服务端也能正常工作
     }
   }
   ```

3. **异步状态在服务端需要预加载**

   ```typescript
   // 服务端预加载数据
   const service = new DataService();
   await service.loadData();

   // 然后渲染
   const html = renderToString(<App service={service} />);
   ```

## 最佳实践

### 1. 数据预加载

```typescript
// 在服务端预加载所有需要的数据
async function renderApp() {
  const dataService = new DataService();
  await dataService.loadData();

  return renderToString(
    <DomainContext.Provider value={container}>
      <App />
    </DomainContext.Provider>
  );
}
```

### 2. 状态序列化

```typescript
// 将服务端状态序列化到 HTML
const state = serialize(dataService);
const html = `
  <div id="root">${appHtml}</div>
  <script>
    window.__INITIAL_STATE__ = ${JSON.stringify(state)};
  </script>
`;

// 在客户端恢复状态
const initialState = window.__INITIAL_STATE__;
const dataService = new DataService();
Object.assign(dataService, initialState);
```
