# Manual Test Plan: US-008 - Tag Soft Delete with Memo Cleanup

## Test Objective
Verify that TagService.deleteTag() correctly soft deletes tags and removes the tagId from all memos' tagIds arrays in both MySQL and LanceDB.

## Prerequisites
- Server running with test database
- User account created (uid: test-user-001)
- Multiple tags created
- Multiple memos created with tags

## Test Setup

### 1. Create Test Data

```bash
# Via API or database seed script

# Create user: test-user-001
# Create tags:
#   - tag-001: "work" (color: blue)
#   - tag-002: "personal" (color: green)
#   - tag-003: "urgent" (color: red)

# Create memos:
#   - memo-001: tagIds = ["tag-001", "tag-002"]
#   - memo-002: tagIds = ["tag-001", "tag-003"]
#   - memo-003: tagIds = ["tag-002"]
#   - memo-004: tagIds = [] (no tags)
```

## Test Cases

### Test Case 1: Soft Delete Tag with Multiple Memo References

**Steps:**
1. Call `DELETE /api/v1/tags/tag-001` (tag "work")
2. Verify response: `{ success: true }`
3. Query tags table: `SELECT * FROM tags WHERE tagId = 'tag-001'`
4. Verify: `deletedAt > 0` (soft deleted)
5. Query memos in MySQL: `SELECT memoId, tagIds FROM memos WHERE memoId IN ('memo-001', 'memo-002')`
6. Verify:
   - memo-001: tagIds = ["tag-002"] (tag-001 removed)
   - memo-002: tagIds = ["tag-003"] (tag-001 removed)
7. Query memos in LanceDB: `SELECT memoId, tagIds FROM memos WHERE memoId IN ('memo-001', 'memo-002')`
8. Verify same results as MySQL

**Expected Result:**
- Tag soft deleted (deletedAt set)
- tagIds array updated in both databases
- Other tags remain intact

### Test Case 2: Soft Delete Tag with Single Memo Reference

**Steps:**
1. Call `DELETE /api/v1/tags/tag-002` (tag "personal")
2. Query memo-003: `SELECT memoId, tagIds FROM memos WHERE memoId = 'memo-003'`
3. Verify: tagIds = NULL (array was emptied, set to NULL)
4. Verify in LanceDB as well

**Expected Result:**
- Tag soft deleted
- memo-003 has NULL tagIds (not empty array)

### Test Case 3: Soft Delete Tag Not Referenced by Any Memo

**Steps:**
1. Create tag-004 "test" with no memos
2. Call `DELETE /api/v1/tags/tag-004`
3. Verify: tag-004 has deletedAt > 0
4. Verify: No memos updated

**Expected Result:**
- Tag soft deleted
- No memo operations performed

### Test Case 4: Attempt to Delete Non-Existent Tag

**Steps:**
1. Call `DELETE /api/v1/tags/non-existent-tag`
2. Verify response: `{ success: false }` or 404

**Expected Result:**
- No changes to database
- Appropriate error response

### Test Case 5: Attempt to Delete Already Soft-Deleted Tag

**Steps:**
1. Soft delete tag-003 (deletedAt > 0)
2. Call `DELETE /api/v1/tags/tag-003` again
3. Verify response: `{ success: false }` or 404

**Expected Result:**
- Tag remains soft deleted (deletedAt unchanged)
- No memo operations performed

### Test Case 6: Verify Transaction Atomicity

**Steps:**
1. Simulate error during memo update (e.g., disconnect LanceDB)
2. Call `DELETE /api/v1/tags/tag-001`
3. Verify: Either ALL changes committed OR ALL changes rolled back

**Expected Result:**
- MySQL transaction ensures atomicity for MySQL operations
- LanceDB operations happen after transaction commits
- Check logs for error handling

## Verification Queries

### MySQL Verification
```sql
-- Check tag soft delete
SELECT tagId, name, deletedAt FROM tags WHERE tagId = 'tag-001';

-- Check memo tagIds updated
SELECT memoId, tagIds FROM memos WHERE memoId IN ('memo-001', 'memo-002', 'memo-003');

-- Verify soft-deleted tags don't appear in queries
SELECT * FROM tags WHERE uid = 'test-user-001' AND deletedAt = 0;
```

### LanceDB Verification
```python
# Via LanceDB CLI or API
table = db.open_table('memos')
result = table.query().where("memoId = 'memo-001'").to_pandas()
print(result[['memoId', 'tagIds']])
```

## Cleanup
```sql
-- Reset test data
UPDATE tags SET deletedAt = 0 WHERE tagId IN ('tag-001', 'tag-002', 'tag-003');
UPDATE memos SET tagIds = '["tag-001", "tag-002"]' WHERE memoId = 'memo-001';
UPDATE memos SET tagIds = '["tag-001", "tag-003"]' WHERE memoId = 'memo-002';
UPDATE memos SET tagIds = '["tag-002"]' WHERE memoId = 'memo-003';
```

## Notes
- This test validates the soft delete pattern for tags with cascade to memos
- Both MySQL and LanceDB must be updated for consistency
- Empty tagIds arrays are converted to NULL in both databases
- Transaction ensures atomicity for MySQL operations
- LanceDB updates happen outside transaction but are logged for debugging
