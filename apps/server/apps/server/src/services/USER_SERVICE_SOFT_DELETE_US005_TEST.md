# UserService Soft Delete Test Documentation (US-005)

## Test: User Soft Delete

### Setup

1. Create a test user with `createUser()`
2. Verify user exists with `findUserByUid()`
3. Call `deleteUser(uid)` to soft delete the user
4. Verify user is soft-deleted

### Expected Behavior

1. **Before deletion**: `findUserByUid()` returns the user object with `deletedAt = 0`
2. **After deletion**:
   - `deleteUser()` returns `true`
   - Database record has `deletedAt` set to current timestamp (not 0)
   - `findUserByUid()` returns `null` (because query filters `deletedAt = 0`)
   - Authentication fails with "Account has been deleted" error

### Manual Test Steps

```typescript
// 1. Create test user
const testUser = await userService.createUser({
  email: 'test-soft-delete@example.com',
  password: 'hashedPassword123',
  salt: 'salt123',
  nickname: 'Test User',
  status: 1,
});

console.log('Created user:', testUser.uid, 'deletedAt:', testUser.deletedAt); // Should be 0

// 2. Verify user exists
const foundUser = await userService.findUserByUid(testUser.uid);
console.log('Found user before delete:', foundUser !== null); // Should be true

// 3. Soft delete user
const deleteResult = await userService.deleteUser(testUser.uid);
console.log('Delete result:', deleteResult); // Should be true

// 4. Verify user is hidden (soft-deleted)
const foundAfterDelete = await userService.findUserByUid(testUser.uid);
console.log('Found user after delete:', foundAfterDelete); // Should be null

// 5. Verify database record still exists with deletedAt > 0
const db = getDatabase();
const [dbRecord] = await db.select().from(users).where(eq(users.uid, testUser.uid));
console.log('DB record deletedAt:', dbRecord.deletedAt); // Should be > 0 (timestamp)
console.log('DB record still exists:', dbRecord !== undefined); // Should be true
```

### Key Changes from Previous Implementation

- **Before (US-002)**: `deleteUser()` set `status: 0` (marked inactive)
- **After (US-005)**: `deleteUser()` sets `deletedAt: Date.now()` (soft delete timestamp)

### No Cascade Deletes

- User-owned records (memos, categories, tags, etc.) are NOT deleted
- Only the user record itself is soft-deleted
- This preserves all user data for potential recovery or audit purposes

### Authentication Behavior

- Soft-deleted users cannot authenticate
- Auth middleware checks `user.deletedAt > 0` and returns "Account has been deleted" error
- This was implemented in US-002 and continues to work with US-005
