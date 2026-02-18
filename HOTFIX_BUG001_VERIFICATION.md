# BUG-001 修复验证指南

## 问题描述

用户在热力图上点击 2月17日 时，虽然 API 请求被发送，但返回的数据为空，即使 MemoList 中确实存在该日期的数据。

## 根本原因

时区转换错误导致时间戳范围不匹配：

1. **前端问题**：`setSelectedDate()` 使用本地时区创建日期
   ```javascript
   // 错误方式（本地时区）
   const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
   // 在 UTC+8 时区，这会创建一个错误的时间戳
   ```

2. **后端问题**：`getActivityStats()` 格式化日期时也使用本地时区
   ```javascript
   // 错误方式（本地时区）
   const year = date.getFullYear();  // 使用本地年份
   const month = date.getMonth() + 1; // 使用本地月份
   const day = date.getDate();        // 使用本地日期
   ```

3. **结果**：前端发送的 UTC 时间戳与后端理解的时间戳范围不一致，导致 SQL 过滤条件出错

## 修复方案

### 前端修复（`apps/web/src/services/memo.service.ts`）

```typescript
// 修复前：使用本地时区
const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);

// 修复后：使用 UTC 时区
const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
```

**关键点**：`Date.UTC()` 创建的日期对象其 `getTime()` 返回的时间戳就是对应 UTC 时刻的毫秒数。

### 后端修复（`apps/server/src/services/memo.service.ts`）

```typescript
// 修复前：使用本地时区方法
const year = date.getFullYear();

// 修复后：使用 UTC 时区方法
const year = date.getUTCFullYear();
```

**关键点**：使用 `getUTC*` 系列方法确保日期组件按 UTC 时区解析。

## 验证步骤

### 1. 代码检查
- ✅ 前端 `setSelectedDate()` 使用 `Date.UTC()`
- ✅ 后端 `formatDateKeyUTC()` 使用 `getUTC*` 方法
- ✅ 无 linting 错误

### 2. 手动测试
1. 启动前后端开发服务器
   ```bash
   pnpm dev
   ```

2. 创建一个明确日期的 memo（例如 2月17日）
   - 打开应用
   - 在 memo 编辑框输入内容
   - 提交

3. 查看热力图
   - 应该看到 2月17日 显示为有数据的颜色（非灰色）
   - Hover 时应该显示 "1 条memo" 或相应数量

4. 点击 2月17日
   - 应该看到该日期的 memo 显示在列表中
   - URL 应该更新为 `?date=2025-02-17`（确切日期可能不同）
   - 顶部应该显示日期筛选标签

5. 检查网络请求
   - 打开浏览器开发者工具（F12）
   - 点击热力图日期
   - 查看 Network 标签，`/api/v1/memos` 请求应该包含：
     ```
     startDate=XXXXX&endDate=XXXXX
     ```
   - 响应应该包含该日期的 memo 数据

### 3. 自动化测试（可选）
```bash
cd apps/server
pnpm test -- getActivityStats.test.ts
```

## 额外的技术挑战（第二阶段修复）

在修复时间戳转换问题后，又遇到 LanceDB 的类型系统限制：

**问题**：
```
Invalid user input: Received literal Int64(...) and could not convert to literal 
of type 'Timestamp(Millisecond, None)'
```

**原因**：LanceDB 的 SQL 查询引擎无法在 WHERE 条件中将整数字面值自动转换为 Timestamp 类型。

**解决方案**：
- 改为先查询用户的所有 memo（无日期条件）
- 在 JavaScript 中进行日期范围过滤
- 这样避免了 LanceDB 类型转换的问题

```typescript
// ❌ 错误方式：LanceDB 无法转换
const results = await memosTable
  .query()
  .where(`uid = '${uid}' AND createdAt >= ${startTimestamp}`)
  .toArray();

// ✅ 正确方式：在应用层过滤
const allMemos = await memosTable.query().where(`uid = '${uid}'`).toArray();
const filtered = allMemos.filter(memo => 
  memo.createdAt >= startTimestamp && memo.createdAt <= endTimestamp
);
```

## 额外的技术挑战（第三阶段修复）

修复 getActivityStats 后，发现 getMemos 接口也有类似问题：

**问题**：
```
Schema error: No field named "NaN". Valid fields are "memoId", uid, ...
```

**原因**：
1. 前端通过查询参数发送时间戳数字：`1771372800000`
2. HTTP 查询参数都转换为字符串：`"1771372800000"`
3. 后端直接用 `new Date(string)` 构造，假定字符串是 ISO 格式
4. `new Date("1771372800000")` 失败，返回 Invalid Date，`getTime()` 返回 NaN
5. WHERE 条件变成 `createdAt >= NaN`，LanceDB 尝试查询不存在的字段

**解决方案**：

*控制器层* - 正确解析查询参数：
```typescript
// ❌ 错误方式：字符串 new Date() 假定 ISO 格式
startDate: startDate ? new Date(startDate) : undefined

// ✅ 正确方式：先 parseInt() 再构造
if (startDate) {
  const timestamp = parseInt(startDate, 10);
  if (!isNaN(timestamp)) {
    startDateObj = new Date(timestamp);
  }
}
```

*服务层* - 在 JavaScript 中过滤日期：
```typescript
// ❌ 错误方式：在 SQL WHERE 条件中比较 Timestamp
filterConditions.push(`createdAt >= ${startDate.getTime()}`);

// ✅ 正确方式：先查询，再在 JavaScript 中过滤
let allResults = await memosTable.query().where(whereClause).toArray();

const startTimestamp = startDate && !isNaN(startDate.getTime()) ? startDate.getTime() : null;
const endTimestamp = endDate && !isNaN(endDate.getTime()) ? endDate.getTime() : null;

if (startTimestamp !== null || endTimestamp !== null) {
  allResults = allResults.filter((memo: any) => {
    const memoTime = memo.createdAt as number;
    if (startTimestamp !== null && memoTime < startTimestamp) return false;
    if (endTimestamp !== null && memoTime > endTimestamp) return false;
    return true;
  });
}
```

**关键学习**：
- HTTP 查询参数始终是字符串，数字参数需要显式 `parseInt()`
- `new Date(string)` 只支持 ISO 格式（`YYYY-MM-DD...`），不支持时间戳字符串
- 对于时间戳字符串，必须 `parseInt()` → `new Date(number)`
- **LanceDB 限制**：Timestamp 字段在 SQL WHERE 中无法与整数字面值比较，必须在应用层过滤
- 总是验证 `!isNaN(date.getTime())` 以防止 NaN 被拼接到 SQL

## 预期结果

修复后应该出现的行为：

| 场景 | 修复前 | 修复后 |
|------|--------|---------|
| 创建 2/17 的 memo | memo 存在 | ✅ memo 存在 |
| 热力图显示 2/17 | ❌ 不显示 | ✅ 显示 |
| 点击 2/17 | ❌ 空列表或错误 | ✅ 显示该日期 memo |
| 时间戳范围 | ❌ 错误偏移 | ✅ 准确匹配 |
| API 响应 | ❌ LanceDB 类型错误 | ✅ 正常返回数据 |

## 影响范围

- **影响模块**：热力图日期筛选功能
- **受影响用户**：所有尝试通过热力图筛选 memo 的用户
- **兼容性**：无破坏性变更，现有数据无需迁移

## 后续建议

1. **添加时区测试**：在不同时区测试日期过滤功能
2. **文档更新**：在开发指南中明确说明日期处理应使用 UTC
3. **代码审查**：审查其他涉及日期转换的代码段，确保统一使用 UTC

## 相关文件

- 前端服务：`apps/web/src/services/memo.service.ts` (L280-300)
- 后端服务：`apps/server/src/services/memo.service.ts` (L767-825)
- PRD 文档：`tasks/prd-memo-calendar-heatmap.md`
- 进度记录：`tasks/progress.txt`
