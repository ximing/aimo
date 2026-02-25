---
ruleType: Model Request
description: 涉及到 dancedb 表结构调整，字段类型定义，arrow 数据类型的时候使用
---

# List<Utf8> 列默认值与 NULL 处理

- addColumns 的 `valueSql` 如果写 `NULL`，DataFusion 会把列类型推断成 `Null`，后续写入 List 会报 `Cannot automatically convert List(Utf8) to Null`。
- 避免使用 `CAST(NULL AS LIST<STRING>)`，DataFusion SQL 解析会报错（`<` 解析失败）。
- 正确做法：使用 `arrow_cast(NULL, 'List(Utf8)')` 作为 `valueSql` 或 `valuesSql` 的表达式。

示例：

```ts
// addColumns
const newColumns = [{ name: 'tagIds', valueSql: "arrow_cast(NULL, 'List(Utf8)')" }];

// update valuesSql
const updateValuesSql = {
  tagIds: "arrow_cast(NULL, 'List(Utf8)')",
};
```

# 修复已误建为 Null 类型的列

- 使用 `table.schema()` 获取字段类型，若 `tagIds` 为 `Null`：
  1. `dropColumns(['tagIds'])`
  2. `addColumns` 重新创建，默认值使用 `arrow_cast(NULL, 'List(Utf8)')`
- 若字段为 `List` 类型直接跳过。

# LanceDB 迁移与类型约束

- 表结构变更必须通过迁移脚本完成，禁止直接修改表结构。
- 推荐使用 `addColumns()` 添加新字段，避免删表重建。
- `addColumns().valueSql` 会推断列类型；新增可空字符串列不要写 `NULL`，使用 `CAST(NULL AS STRING)` 或显式字符串默认值。
- 不支持修改字段类型（需要删除列或重建表）。
- 不支持复合索引，只能创建单列索引。

# LanceDB/Arrow List 类型转换

- LanceDB 查询返回的 List 字段可能是 Arrow 对象，必须先 `.toArray()` 再使用。
- List<Utf8> 转换示例：

```ts
const toStringList = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value.toArray) return value.toArray();
  if (value.data && Array.isArray(value.data)) return value.data;
  return [];
};
```

- List<Struct> 转换示例：

```ts
const toStructList = (value: any) => {
  if (!value) return [];
  const array = value.toArray ? value.toArray() : Array.isArray(value) ? value : [];
  return array.map((item: any) => ({
    memoId: item?.memoId ?? undefined,
    content: item?.content ?? undefined,
    similarity: item?.similarity ?? undefined,
    relevanceScore: item?.relevanceScore ?? undefined,
    createdAt: item?.createdAt ?? undefined,
  }));
};
```

# 常见错误与参考

- 错误：直接用 `Array.isArray(record.sources)` 判断，Arrow List 会返回 false。
- 正确：优先判断是否有 `toArray` 方法。
- 参考实现：`apps/server/src/services/memo.service.ts` 的 `convertArrowAttachments`、`apps/server/src/services/ai-conversation.service.ts` 的 `toMessageDto`。
