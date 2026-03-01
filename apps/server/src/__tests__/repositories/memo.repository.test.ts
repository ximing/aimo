/**
 * MemoRepository Unit Tests
 *
 * Tests CRUD operations for the MemoRepository using in-memory SQLite
 */

import { createTestDatabase, initializeTestSchema, createTestMemoData, testUser, generateTestId } from '../test-setup.js';

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

describe('MemoRepository', () => {
  let db: any;
  let sqliteDb: any;
  let memoRepository: any;

  beforeAll(async () => {
    const { db: testDb, sqliteDb: testSqliteDb, close } = createTestDatabase();
    db = testDb;
    sqliteDb = testSqliteDb;
    initializeTestSchema(sqliteDb);

    // Import and initialize repository with mock adapter
    const { MemoRepository } = await import('../repositories/memo.repository.js');
    const mockAdapter = new MockDrizzleAdapter(sqliteDb, db);
    memoRepository = new MemoRepository(mockAdapter);
  });

  afterAll(() => {
    sqliteDb.close();
  });

  beforeEach(async () => {
    // Clear memos table before each test
    sqliteDb.exec('DELETE FROM memos');
  });

  describe('create', () => {
    it('should create a new memo', async () => {
      const memoData = createTestMemoData();

      const result = await memoRepository.create({
        memoId: memoData.memoId,
        uid: memoData.uid,
        content: memoData.content,
        categoryId: memoData.categoryId ?? undefined,
        type: memoData.type,
        tags: memoData.tags ?? undefined,
        createdAt: memoData.createdAt,
        updatedAt: memoData.updatedAt,
      });

      expect(result).toBeDefined();
      expect(result.memoId).toBe(memoData.memoId);
      expect(result.uid).toBe(memoData.uid);
      expect(result.content).toBe(memoData.content);
      expect(result.type).toBe('text');
    });

    it('should create memo with category and tags', async () => {
      const memoData = createTestMemoData({
        categoryId: 'category_1',
        tags: ['tag1', 'tag2'],
      });

      const result = await memoRepository.create({
        memoId: memoData.memoId,
        uid: memoData.uid,
        content: memoData.content,
        categoryId: memoData.categoryId ?? undefined,
        type: memoData.type,
        tags: memoData.tags ?? undefined,
        createdAt: memoData.createdAt,
        updatedAt: memoData.updatedAt,
      });

      expect(result.categoryId).toBe('category_1');
      expect(result.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('findById', () => {
    it('should find memo by ID', async () => {
      const memoData = createTestMemoData();
      await memoRepository.create({
        memoId: memoData.memoId,
        uid: memoData.uid,
        content: memoData.content,
        categoryId: memoData.categoryId ?? undefined,
        type: memoData.type,
        tags: memoData.tags ?? undefined,
        createdAt: memoData.createdAt,
        updatedAt: memoData.updatedAt,
      });

      const result = await memoRepository.findById(memoData.memoId);

      expect(result).toBeDefined();
      expect(result!.memoId).toBe(memoData.memoId);
    });

    it('should return null for non-existent memo', async () => {
      const result = await memoRepository.findById('non_existent_id');
      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    beforeEach(async () => {
      // Create multiple memos for user
      for (let i = 0; i < 3; i++) {
        await memoRepository.create({
          memoId: generateTestId(`memo_${i}`),
          uid: testUser.uid,
          content: `Test content ${i}`,
          type: 'text',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Create memo for different user
      await memoRepository.create({
        memoId: generateTestId('other_memo'),
        uid: 'other_user',
        content: 'Other user content',
        type: 'text',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should find memos by user ID', async () => {
      const result = await memoRepository.findByUserId({
        uid: testUser.uid,
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('should paginate results', async () => {
      const result = await memoRepository.findByUserId({
        uid: testUser.uid,
        page: 1,
        limit: 2,
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(3);
    });
  });

  describe('findByIds', () => {
    const memoIds: string[] = [];

    beforeEach(async () => {
      // Create memos
      for (let i = 0; i < 3; i++) {
        const memoId = generateTestId(`batch_memo_${i}`);
        memoIds.push(memoId);
        await memoRepository.create({
          memoId,
          uid: testUser.uid,
          content: `Batch content ${i}`,
          type: 'text',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    });

    it('should find memos by multiple IDs', async () => {
      const result = await memoRepository.findByIds(memoIds.slice(0, 2));

      expect(result).toHaveLength(2);
    });

    it('should maintain order of provided IDs', async () => {
      const reversedIds = [...memoIds].reverse();
      const result = await memoRepository.findByIds(reversedIds);

      expect(result[0].memoId).toBe(reversedIds[0]);
      expect(result[1].memoId).toBe(reversedIds[1]);
    });

    it('should return empty array for empty input', async () => {
      const result = await memoRepository.findByIds([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('update', () => {
    let memoId: string;

    beforeEach(async () => {
      memoId = generateTestId('update_memo');
      await memoRepository.create({
        memoId,
        uid: testUser.uid,
        content: 'Original content',
        type: 'text',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should update memo content', async () => {
      const result = await memoRepository.update(memoId, {
        content: 'Updated content',
      });

      expect(result!.content).toBe('Updated content');
    });

    it('should update multiple fields', async () => {
      const result = await memoRepository.update(memoId, {
        content: 'Updated content',
        categoryId: 'new_category',
        tags: ['new_tag'],
      });

      expect(result!.content).toBe('Updated content');
      expect(result!.categoryId).toBe('new_category');
      expect(result!.tags).toEqual(['new_tag']);
    });
  });

  describe('delete', () => {
    let memoId: string;

    beforeEach(async () => {
      memoId = generateTestId('delete_memo');
      await memoRepository.create({
        memoId,
        uid: testUser.uid,
        content: 'To be deleted',
        type: 'text',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should delete memo', async () => {
      const result = await memoRepository.delete(memoId);
      expect(result).toBe(true);

      const deleted = await memoRepository.findById(memoId);
      expect(deleted).toBeNull();
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      // Create memos with different categories and dates
      const now = Date.now();

      await memoRepository.create({
        memoId: generateTestId('cat1'),
        uid: testUser.uid,
        content: 'Content 1',
        categoryId: 'cat1',
        type: 'text',
        createdAt: new Date(now - 100000),
        updatedAt: new Date(now - 100000),
      });

      await memoRepository.create({
        memoId: generateTestId('cat2'),
        uid: testUser.uid,
        content: 'Content 2',
        categoryId: 'cat2',
        type: 'text',
        createdAt: new Date(now - 200000),
        updatedAt: new Date(now - 200000),
      });
    });

    it('should filter by category', async () => {
      const result = await memoRepository.search({
        uid: testUser.uid,
        categoryId: 'cat1',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].categoryId).toBe('cat1');
    });

    it('should filter by date range', async () => {
      const now = Date.now();
      const result = await memoRepository.search({
        uid: testUser.uid,
        startDate: new Date(now - 150000),
      });

      expect(result.items.length).toBeGreaterThanOrEqual(1);
    });
  });
});
