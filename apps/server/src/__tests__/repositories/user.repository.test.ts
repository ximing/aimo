/**
 * UserRepository Unit Tests
 *
 * Tests CRUD operations for the UserRepository using in-memory SQLite
 */

import { createTestDatabase, initializeTestSchema, testUser, generateTestId } from '../test-setup.js';

// Mock DrizzleAdapter for testing
class MockDrizzleAdapter {
  private db: any;
  private dbType: string = 'sqlite';

  constructor(sqliteDb: any, db: any) {
    this.db = db;
  }

  getDb() {
    return this.db;
  }

  getDbType() {
    return this.dbType;
  }
}

describe('UserRepository', () => {
  let db: any;
  let sqliteDb: any;
  let userRepository: any;

  beforeAll(async () => {
    const { db: testDb, sqliteDb: testSqliteDb } = createTestDatabase();
    db = testDb;
    sqliteDb = testSqliteDb;
    initializeTestSchema(sqliteDb);

    // Import and initialize repository with mock adapter
    const { UserRepository } = await import('../repositories/user.repository.js');
    const mockAdapter = new MockDrizzleAdapter(sqliteDb, db);
    userRepository = new UserRepository(mockAdapter);
  });

  afterAll(() => {
    sqliteDb.close();
  });

  beforeEach(async () => {
    // Clear users table before each test
    sqliteDb.exec('DELETE FROM users');
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const result = await userRepository.create({
        uid: testUser.uid,
        email: testUser.email,
        password: testUser.password,
        salt: testUser.salt,
        nickname: testUser.nickname,
        avatar: testUser.avatar,
        status: testUser.status,
      });

      expect(result).toBeDefined();
      expect(result.uid).toBe(testUser.uid);
      expect(result.email).toBe(testUser.email);
      expect(result.nickname).toBe(testUser.nickname);
    });

    it('should create user with only required fields', async () => {
      const result = await userRepository.create({
        uid: generateTestId('user'),
        password: testUser.password,
        salt: testUser.salt,
      });

      expect(result).toBeDefined();
      expect(result.status).toBe(1); // default status
    });
  });

  describe('findByEmail', () => {
    beforeEach(async () => {
      await userRepository.create({
        uid: testUser.uid,
        email: testUser.email,
        password: testUser.password,
        salt: testUser.salt,
        nickname: testUser.nickname,
      });
    });

    it('should find user by email', async () => {
      const result = await userRepository.findByEmail(testUser.email);

      expect(result).toBeDefined();
      expect(result!.uid).toBe(testUser.uid);
    });

    it('should return null for non-existent email', async () => {
      const result = await userRepository.findByEmail('nonexistent@example.com');
      expect(result).toBeNull();
    });
  });

  describe('findByEmailWithPassword', () => {
    beforeEach(async () => {
      await userRepository.create({
        uid: testUser.uid,
        email: testUser.email,
        password: testUser.password,
        salt: testUser.salt,
        nickname: testUser.nickname,
      });
    });

    it('should find user with password', async () => {
      const result = await userRepository.findByEmailWithPassword(testUser.email);

      expect(result).toBeDefined();
      expect(result!.password).toBe(testUser.password);
      expect(result!.salt).toBe(testUser.salt);
    });
  });

  describe('findByUid', () => {
    beforeEach(async () => {
      await userRepository.create({
        uid: testUser.uid,
        email: testUser.email,
        password: testUser.password,
        salt: testUser.salt,
        nickname: testUser.nickname,
      });
    });

    it('should find user by UID', async () => {
      const result = await userRepository.findByUid(testUser.uid);

      expect(result).toBeDefined();
      expect(result!.email).toBe(testUser.email);
    });

    it('should return null for non-existent UID', async () => {
      const result = await userRepository.findByUid('non_existent_uid');
      expect(result).toBeNull();
    });
  });

  describe('findByUidWithPassword', () => {
    beforeEach(async () => {
      await userRepository.create({
        uid: testUser.uid,
        email: testUser.email,
        password: testUser.password,
        salt: testUser.salt,
        nickname: testUser.nickname,
      });
    });

    it('should find user by UID with password', async () => {
      const result = await userRepository.findByUidWithPassword(testUser.uid);

      expect(result).toBeDefined();
      expect(result!.password).toBe(testUser.password);
      expect(result!.salt).toBe(testUser.salt);
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      await userRepository.create({
        uid: testUser.uid,
        email: testUser.email,
        password: testUser.password,
        salt: testUser.salt,
        nickname: 'Original Name',
      });
    });

    it('should update user nickname', async () => {
      const result = await userRepository.update(testUser.uid, {
        nickname: 'New Name',
      });

      expect(result!.nickname).toBe('New Name');
    });

    it('should update user avatar', async () => {
      const result = await userRepository.update(testUser.uid, {
        avatar: 'https://example.com/new_avatar.png',
      });

      expect(result!.avatar).toBe('https://example.com/new_avatar.png');
    });

    it('should update multiple fields', async () => {
      const result = await userRepository.update(testUser.uid, {
        nickname: 'New Name',
        avatar: 'https://example.com/new_avatar.png',
      });

      expect(result!.nickname).toBe('New Name');
      expect(result!.avatar).toBe('https://example.com/new_avatar.png');
    });
  });

  describe('updatePassword', () => {
    beforeEach(async () => {
      await userRepository.create({
        uid: testUser.uid,
        email: testUser.email,
        password: 'old_password',
        salt: 'old_salt',
      });
    });

    it('should update user password', async () => {
      const result = await userRepository.updatePassword(
        testUser.uid,
        'new_password',
        'new_salt'
      );

      expect(result).toBe(true);

      const user = await userRepository.findByUidWithPassword(testUser.uid);
      expect(user!.password).toBe('new_password');
      expect(user!.salt).toBe('new_salt');
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await userRepository.create({
        uid: testUser.uid,
        email: testUser.email,
        password: testUser.password,
        salt: testUser.salt,
        status: 1,
      });
    });

    it('should soft delete user (set status to 0)', async () => {
      const result = await userRepository.delete(testUser.uid);

      expect(result).toBe(true);

      const user = await userRepository.findByUid(testUser.uid);
      expect(user!.status).toBe(0);
    });
  });
});
