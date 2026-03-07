# US-006 Manual Test: Soft Delete for Memos with Cascade

## Test Setup

1. Start the development server:

```bash
pnpm dev:server
```

2. Ensure you have a test user account and authentication token

## Test Cases

### Test 1: Soft Delete Memo (Basic)

**Goal**: Verify that deleting a memo sets `deletedAt` instead of removing the record

**Steps**:

1. Create a test memo via POST `/api/v1/memos`

```json
{
  "content": "Test memo for soft delete",
  "type": "text"
}
```

2. Note the `memoId` from the response

3. Delete the memo via DELETE `/api/v1/memos/:memoId`

4. Verify in MySQL that the memo still exists with `deletedAt > 0`:

```sql
SELECT memoId, content, deletedAt FROM memos WHERE memoId = 'memo_xxx';
```

5. Verify in LanceDB that the memo has `deletedAt > 0`

6. Try to fetch the memo via GET `/api/v1/memos/:memoId` - should return 404

**Expected Result**:

- Memo exists in database with `deletedAt` timestamp
- Memo is not visible via API queries

### Test 2: Cascade Soft Delete to Relations

**Goal**: Verify that deleting a memo cascades soft delete to related memo_relations

**Steps**:

1. Create two test memos (memo A and memo B)

2. Create a relation from A to B via POST `/api/v1/memos/:memoId/relations`

```json
{
  "targetMemoIds": ["memo_B_id"]
}
```

3. Verify the relation exists in `memo_relations` table:

```sql
SELECT relationId, sourceMemoId, targetMemoId, deletedAt
FROM memo_relations
WHERE sourceMemoId = 'memo_A_id' OR targetMemoId = 'memo_A_id';
```

4. Delete memo A via DELETE `/api/v1/memos/memo_A_id`

5. Verify in MySQL that the relation has `deletedAt > 0`:

```sql
SELECT relationId, sourceMemoId, targetMemoId, deletedAt
FROM memo_relations
WHERE sourceMemoId = 'memo_A_id' OR targetMemoId = 'memo_A_id';
```

**Expected Result**:

- Relation record exists with `deletedAt` timestamp matching the memo's `deletedAt`
- Relation is not returned by API queries

### Test 3: Cascade for Both Source and Target Relations

**Goal**: Verify cascade works when memo is both source and target of relations

**Steps**:

1. Create three memos (A, B, C)

2. Create relations:
   - A → B (A is source)
   - C → A (A is target)

3. Delete memo A

4. Verify both relations are soft deleted:

```sql
SELECT relationId, sourceMemoId, targetMemoId, deletedAt
FROM memo_relations
WHERE sourceMemoId = 'memo_A_id' OR targetMemoId = 'memo_A_id';
```

**Expected Result**:

- Both relations have `deletedAt > 0`
- Neither relation appears in API queries

### Test 4: Transaction Atomicity

**Goal**: Verify that memo and relations are deleted atomically (all or nothing)

**Steps**:

1. Create a memo with relations

2. Temporarily break the database connection or introduce an error after memo deletion but before relation cascade

3. Verify that if the transaction fails, neither the memo nor relations are soft deleted

**Expected Result**:

- Transaction ensures atomicity - either both succeed or both fail

### Test 5: Attachments Are NOT Deleted

**Goal**: Verify that attachments remain intact when memo is soft deleted

**Steps**:

1. Create a memo with an attachment

2. Note the attachment ID

3. Delete the memo

4. Verify the attachment still exists with `deletedAt = 0`:

```sql
SELECT attachmentId, deletedAt FROM attachments WHERE attachmentId = 'attachment_xxx';
```

**Expected Result**:

- Attachment is NOT soft deleted (deletedAt = 0)
- Attachment file remains accessible

### Test 6: Soft Deleted Memo Cannot Be Updated

**Goal**: Verify that soft deleted memos cannot be modified

**Steps**:

1. Create and soft delete a memo

2. Try to update the memo via PUT `/api/v1/memos/:memoId`

**Expected Result**:

- Update fails with "Memo not found" error
- The `deletedAt = 0` filter in queries prevents operating on soft-deleted records

## Test Results

- [ ] Test 1: Soft Delete Memo (Basic)
- [ ] Test 2: Cascade Soft Delete to Relations
- [ ] Test 3: Cascade for Both Source and Target Relations
- [ ] Test 4: Transaction Atomicity
- [ ] Test 5: Attachments Are NOT Deleted
- [ ] Test 6: Soft Deleted Memo Cannot Be Updated

## Notes

- All tests should be performed with both MySQL and LanceDB verification
- Verify timestamps are consistent between memo and cascaded relations
- Check that the `or()` operator correctly handles both source and target relations in a single query
