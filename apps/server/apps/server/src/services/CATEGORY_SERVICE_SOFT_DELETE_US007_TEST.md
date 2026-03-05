# CategoryService Soft Delete Test (US-007)

## Test Objective
Verify that `CategoryService.deleteCategory()` correctly soft deletes a category and sets `categoryId = NULL` for all associated memos.

## Prerequisites
- Server running with MySQL and LanceDB
- Valid JWT token for authentication
- Test user account

## Test Steps

### 1. Create Test Category
```bash
POST http://localhost:3000/api/v1/categories
Authorization: Bearer <YOUR_JWT_TOKEN>
Content-Type: application/json

{
  "name": "Test Category US-007",
  "color": "#FF5733"
}
```

**Expected Response:**
```json
{
  "categoryId": "cat_xxx...",
  "name": "Test Category US-007",
  "color": "#FF5733",
  "uid": "user_xxx...",
  "createdAt": 1234567890,
  "updatedAt": 1234567890
}
```

Save the `categoryId` for later steps.

### 2. Create Memos with Category
```bash
POST http://localhost:3000/api/v1/memos
Authorization: Bearer <YOUR_JWT_TOKEN>
Content-Type: application/json

{
  "content": "Memo 1 with test category",
  "categoryId": "cat_xxx..."
}
```

Repeat to create 2-3 memos with the same `categoryId`.

**Expected Response:** Each memo should have the `categoryId` field set.

### 3. Verify Memos Have Category (Before Deletion)
```bash
GET http://localhost:3000/api/v1/memos?categoryId=cat_xxx...
Authorization: Bearer <YOUR_JWT_TOKEN>
```

**Expected Response:** Should return 2-3 memos with the matching `categoryId`.

### 4. Soft Delete Category
```bash
DELETE http://localhost:3000/api/v1/categories/cat_xxx...
Authorization: Bearer <YOUR_JWT_TOKEN>
```

**Expected Response:**
```json
{
  "success": true
}
```

### 5. Verify Category is Soft Deleted
```bash
GET http://localhost:3000/api/v1/categories
Authorization: Bearer <YOUR_JWT_TOKEN>
```

**Expected Response:** The deleted category should NOT appear in the list (filtered by `deletedAt = 0`).

### 6. Verify Category in Database (MySQL)
```sql
-- Direct MySQL query
SELECT categoryId, name, deletedAt FROM categories WHERE categoryId = 'cat_xxx...';
```

**Expected Result:**
- `deletedAt` should be a non-zero timestamp (e.g., `1709674800000`)

### 7. Verify Memos Have NULL categoryId (MySQL)
```sql
-- Direct MySQL query
SELECT memoId, content, categoryId FROM memos WHERE memoId IN ('memo_1', 'memo_2', 'memo_3');
```

**Expected Result:**
- All memos should have `categoryId = NULL`

### 8. Verify Memos Have NULL categoryId (LanceDB)
```sql
-- LanceDB query (via server logs or direct query)
SELECT memoId, categoryId FROM memos WHERE memoId IN ('memo_1', 'memo_2', 'memo_3');
```

**Expected Result:**
- All memos should have `categoryId = null` (or undefined)

### 9. Verify Memos Are Uncategorized in API
```bash
GET http://localhost:3000/api/v1/memos
Authorization: Bearer <YOUR_JWT_TOKEN>
```

**Expected Response:** The previously categorized memos should now have `categoryId: undefined` or be absent from the field.

### 10. Verify Transaction Atomicity (Error Case)
To test transaction rollback, temporarily modify the code to throw an error after soft deleting the category but before updating memos:

```typescript
// In deleteCategory() method, add after soft delete:
throw new Error('Test rollback');
```

Then attempt to delete a category. Verify that:
- Category's `deletedAt` remains `0` (not soft deleted)
- Memos' `categoryId` remains unchanged

## Success Criteria
- ✅ Category is soft deleted (deletedAt > 0)
- ✅ Category does not appear in GET /categories list
- ✅ All memos with matching categoryId have categoryId set to NULL in both MySQL and LanceDB
- ✅ Memos remain accessible (not deleted)
- ✅ Transaction ensures atomicity (all or nothing)
- ✅ Typecheck passes

## Implementation Notes
- Uses `withTransaction()` for atomicity
- Soft delete pattern: Sets `deletedAt = Date.now()` instead of DELETE
- Updates both MySQL (via Drizzle) and LanceDB
- LanceDB update uses WHERE clause: `categoryId = 'cat_xxx' AND deletedAt = 0`
- Transaction includes: category soft delete + memo categoryId cleanup
