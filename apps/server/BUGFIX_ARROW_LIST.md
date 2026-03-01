# Bug Fix: Apache Arrow List Type Handling

## Issue

After migrating to use complete LanceDB tables, vector search failed with error:

```
TypeError: attachmentIds.map is not a function
```

## Root Cause

LanceDB uses Apache Arrow for data storage. When querying data from LanceDB, List fields (like `attachments` and `tagIds`) are returned as Arrow List objects, not plain JavaScript arrays.

### Example

```javascript
// From LanceDB
const memo = await memosTable.query().toArray()[0];
console.log(memo.attachments); // Arrow List object, not array
console.log(Array.isArray(memo.attachments)); // false

// From MySQL
const memo = await db.select().from(memos).limit(1)[0];
console.log(memo.attachments); // JavaScript array
console.log(Array.isArray(memo.attachments)); // true
```

## Solution

Created utility functions following the project's Arrow conversion guidelines (`.catpaw/rules/dancedb.md`):

```typescript
/**
 * Convert Apache Arrow List<Utf8> to JavaScript string array
 * Reference: .catpaw/rules/dancedb.md
 */
export const toStringList = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value.toArray) return value.toArray();
  if (value.data && Array.isArray(value.data)) return value.data;
  return [];
};
```

## Changes

### 1. apps/server/src/utils/arrow.ts (NEW)

Created centralized Arrow utility functions:

- `toStringList()` - Convert List<Utf8> to string[]
- `toStructList()` - Convert List<Struct> to object[]
- `isArrowList()` - Check if value is Arrow List
- `toTimestamp()` - Convert Arrow timestamp to milliseconds

### 2. apps/server/src/services/memo.service.ts

**Updated imports:**
```typescript
import { toStringList } from '../utils/arrow.js';
```

**Updated vectorSearch() method:**
```typescript
// Before (caused error)
const attachmentIds = memo.attachments || [];
const tagIds = memo.tagIds || [];

// After (works correctly)
const attachmentIds = toStringList(memo.attachments);
const tagIds = toStringList(memo.tagIds);
```

## Why This Matters

When using complete LanceDB tables (scalar + vector), we get data directly from LanceDB queries. Arrow List fields must be converted to JavaScript arrays before:

1. Passing to array methods like `.map()`, `.filter()`, `.length`
2. Passing to other services expecting arrays
3. Serializing to JSON for API responses

## Correct Conversion Method

Following `.catpaw/rules/dancedb.md`, the correct order to check is:

1. Check if value is null/undefined → return `[]`
2. Check if already a JavaScript array → return as-is
3. Check if has `.toArray()` method → call it (Arrow List)
4. Check if has `.data` array property → return it (fallback)
5. Return `[]` as safe default

```typescript
// ✅ CORRECT (from .catpaw/rules/dancedb.md)
const toStringList = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value.toArray) return value.toArray();
  if (value.data && Array.isArray(value.data)) return value.data;
  return [];
};

// ❌ WRONG (doesn't handle all Arrow List cases)
const toArray = (value: any) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return Array.from(value); // May not work for all Arrow types
};
```

## Usage Guidelines

### For List<Utf8> fields (strings)

```typescript
import { toStringList } from '../utils/arrow.js';

// Good ✅
const attachmentIds = toStringList(memo.attachments);
const tagIds = toStringList(memo.tagIds);

// Bad ❌ (will fail if data comes from LanceDB)
const attachmentIds = memo.attachments || [];
const tagIds = memo.tagIds || [];
```

### For List<Struct> fields (objects)

```typescript
import { toStructList } from '../utils/arrow.js';

// Good ✅
const sources = toStructList(message.sources);

// Bad ❌
const sources = message.sources || [];
```

## Testing

Verified fix by:
1. ✅ Running vector search queries
2. ✅ Checking that attachments are properly fetched
3. ✅ Verifying tagIds are correctly enriched
4. ✅ TypeScript compilation passes

## Related Files

- `apps/server/src/utils/arrow.ts` - NEW: Arrow utility functions
- `apps/server/src/services/memo.service.ts` - Updated to use toStringList()
- `apps/server/src/models/db/schema.ts` - Schema defines List fields
- `.catpaw/rules/dancedb.md` - Project Arrow conversion guidelines

## References

- Project Guidelines: `.catpaw/rules/dancedb.md`
- Apache Arrow Documentation: https://arrow.apache.org/docs/js/
- LanceDB Documentation: https://lancedb.github.io/lancedb/
