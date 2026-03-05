# UserService Soft Delete Testing

## Manual Test Cases

### Test Setup
1. Create a test user
2. Soft delete the user (set deletedAt > 0)
3. Verify all queries filter the soft-deleted user

### Test Cases

#### TC-001: findUserByEmail filters soft-deleted users
**Steps:**
1. Create user with email `test@example.com`
2. Soft delete user: `UPDATE users SET deleted_at = UNIX_TIMESTAMP() * 1000 WHERE email = 'test@example.com'`
3. Call `userService.findUserByEmail('test@example.com')`

**Expected:** Returns `null`

#### TC-002: findUserByUid filters soft-deleted users
**Steps:**
1. Get UID of soft-deleted user
2. Call `userService.findUserByUid(uid)`

**Expected:** Returns `null`

#### TC-003: findUserByPhone filters soft-deleted users
**Steps:**
1. Create user with phone `+1234567890`
2. Soft delete user
3. Call `userService.findUserByPhone('+1234567890')`

**Expected:** Returns `null`

#### TC-004: updateUser does not update soft-deleted users
**Steps:**
1. Try to update a soft-deleted user
2. Call `userService.updateUser(deletedUid, { nickname: 'New Name' })`

**Expected:** Throws error "User not found"

#### TC-005: deleteUser does not delete already soft-deleted users
**Steps:**
1. Try to delete a soft-deleted user
2. Call `userService.deleteUser(deletedUid)`

**Expected:** Throws error "User not found"

#### TC-006: Authentication middleware rejects soft-deleted users
**Steps:**
1. Get JWT token for a user
2. Soft delete the user
3. Make authenticated API request with the token

**Expected:** Returns 401 with message "Account has been deleted"

## SQL Verification Queries

```sql
-- Check deletedAt filter is applied
SELECT * FROM users WHERE email = 'test@example.com' AND deleted_at = 0;

-- Verify soft-deleted user exists but is filtered
SELECT * FROM users WHERE email = 'test@example.com';

-- Count active vs soft-deleted users
SELECT
  SUM(CASE WHEN deleted_at = 0 THEN 1 ELSE 0 END) as active_users,
  SUM(CASE WHEN deleted_at > 0 THEN 1 ELSE 0 END) as deleted_users
FROM users;
```

## Implementation Details

All UserService SELECT queries now include `eq(users.deletedAt, 0)` filter using Drizzle ORM's `and()` operator:

- `findUserByEmail()` - ✓ Filters deletedAt = 0
- `findUserByUid()` - ✓ Filters deletedAt = 0
- `findUserByPhone()` - ✓ Filters deletedAt = 0
- `createUser()` (fetch after insert) - ✓ Filters deletedAt = 0
- `updateUser()` (both check and fetch) - ✓ Filters deletedAt = 0
- `deleteUser()` (status update) - ✓ Filters deletedAt = 0

Authentication middleware (`auth-handler.ts`) checks `user.deletedAt > 0` and returns 401 with "Account has been deleted" message.
