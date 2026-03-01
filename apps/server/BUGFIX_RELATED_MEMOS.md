# Bug Fix: Related Memos API Returns Only 1 Result

## Issue

The `/api/v1/memos/:memoId/related?page=1&limit=10` endpoint only returned 1 result instead of 10.

## Root Cause

Parameter order mismatch between controller and service method:

### Controller (memo.controller.ts:322)
```typescript
const result = await this.memoService.findRelatedMemos(memoId, user.uid, page, limit);
// Parameters: memoId, uid, page=1, limit=10
```

### Service Method (memo.service.ts:1072) - BEFORE
```typescript
async findRelatedMemos(
  memoId: string,
  uid: string,
  limit: number = 5,    // ❌ 3rd parameter is limit
  page: number = 1      // ❌ 4th parameter is page
)
```

### Result
When calling with `page=1, limit=10`:
- Service received: `limit=1, page=10`
- Only 1 result returned instead of 10

## Solution

Fixed parameter order in service method to match controller call:

### Service Method (memo.service.ts:1072) - AFTER
```typescript
async findRelatedMemos(
  memoId: string,
  uid: string,
  page: number = 1,     // ✅ 3rd parameter is page
  limit: number = 10    // ✅ 4th parameter is limit
)
```

## Changes

### apps/server/src/services/memo.service.ts

**Before:**
```typescript
async findRelatedMemos(
  memoId: string,
  uid: string,
  limit: number = 5,
  page: number = 1
)
```

**After:**
```typescript
async findRelatedMemos(
  memoId: string,
  uid: string,
  page: number = 1,
  limit: number = 10
)
```

## Impact

- ✅ Now correctly returns up to 10 related memos per page
- ✅ Pagination works as expected
- ✅ Default values updated to be more reasonable (limit: 10 instead of 5)
- ✅ No breaking changes (controller call already used correct order)

## Testing

Test the API:
```bash
GET /api/v1/memos/:memoId/related?page=1&limit=10
```

Expected result:
- Returns up to 10 related memos
- Pagination works correctly
- Each page returns correct number of results

## Related Files

- `apps/server/src/services/memo.service.ts` - Fixed parameter order
- `apps/server/src/controllers/v1/memo.controller.ts` - No changes needed (already correct)
