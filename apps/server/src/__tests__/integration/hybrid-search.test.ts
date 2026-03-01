/**
 * Hybrid Search Integration Tests
 *
 * Tests the hybrid search flow: LanceDB returns IDs → Drizzle fetches details
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

describe('Hybrid Search Integration', () => {
  let db: any;
  let sqliteDb: any;
  let memoRepository: any;

  beforeAll(async () => {
    const { db: testDb, sqliteDb: testSqliteDb } = createTestDatabase();
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

  describe('Vector Search Flow', () => {
    it('should find memos by IDs (simulating LanceDB result)', async () => {
      // First, create some memos in Drizzle
      const memoIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const memoId = generateTestId(`search_memo_${i}`);
        memoIds.push(memoId);
        await memoRepository.create({
          memoId,
          uid: testUser.uid,
          content: `Searchable content ${i}`,
          type: 'text',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Simulate LanceDB returning only IDs (as it would in production)
      // In real code, this would be: const vectorResults = await lancedb.query(vectorSearch)
      const lanceDbReturnedIds = memoIds.slice(0, 3);

      // Then fetch details from Drizzle using findByIds
      const results = await memoRepository.findByIds(lanceDbReturnedIds);

      // Verify we get the correct memos back
      expect(results).toHaveLength(3);
      expect(results.map(r => r.memoId).sort()).toEqual(lanceDbReturnedIds.sort());
    });

    it('should handle empty LanceDB results', async () => {
      // Simulate LanceDB returning no results
      const results = await memoRepository.findByIds([]);

      expect(results).toHaveLength(0);
    });

    it('should handle non-existent IDs gracefully', async () => {
      // First create a memo
      const existingMemoId = generateTestId('existing_memo');
      await memoRepository.create({
        memoId: existingMemoId,
        uid: testUser.uid,
        content: 'Existing content',
        type: 'text',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Simulate LanceDB returning mixed existing and non-existing IDs
      const results = await memoRepository.findByIds([
        existingMemoId,
        'non_existent_1',
        'non_existent_2',
      ]);

      // Should only return existing memo
      expect(results).toHaveLength(1);
      expect(results[0].memoId).toBe(existingMemoId);
    });
  });

  describe('Combined Query Flow', () => {
    it('should apply category filter after fetching from Drizzle', async () => {
      // Create memos with different categories
      const categoryIds = ['cat_a', 'cat_b'];

      // Create memos in category A
      for (let i = 0; i < 2; i++) {
        await memoRepository.create({
          memoId: generateTestId(`cat_a_memo_${i}`),
          uid: testUser.uid,
          content: `Content in category A ${i}`,
          categoryId: categoryIds[0],
          type: 'text',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Create memo in category B
      await memoRepository.create({
        memoId: generateTestId('cat_b_memo'),
        uid: testUser.uid,
        content: 'Content in category B',
        categoryId: categoryIds[1],
        type: 'text',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Get all memos for user
      const allMemos = await memoRepository.findByUserId({
        uid: testUser.uid,
        page: 1,
        limit: 10,
      });

      // Filter by category (simulating what would happen after LanceDB query)
      const categoryAMemos = allMemos.items.filter(m => m.categoryId === 'cat_a');

      expect(categoryAMemos).toHaveLength(2);
    });

    it('should apply date range filter after fetching from Drizzle', async () => {
      const now = Date.now();
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000);

      // Create recent memo
      await memoRepository.create({
        memoId: generateTestId('recent_memo'),
        uid: testUser.uid,
        content: 'Recent content',
        type: 'text',
        createdAt: oneDayAgo,
        updatedAt: oneDayAgo,
      });

      // Create old memo
      await memoRepository.create({
        memoId: generateTestId('old_memo'),
        uid: testUser.uid,
        content: 'Old content',
        type: 'text',
        createdAt: twoDaysAgo,
        updatedAt: twoDaysAgo,
      });

      // Get all memos
      const allMemos = await memoRepository.findByUserId({
        uid: testUser.uid,
        page: 1,
        limit: 10,
      });

      // Filter by date range (simulating what would happen after LanceDB query)
      const recentMemos = allMemos.items.filter(
        m => m.createdAt && m.createdAt > now - 24 * 60 * 60 * 1000
      );

      expect(recentMemos).toHaveLength(1);
    });
  });

  describe('Pagination with Hybrid Search', () => {
    it('should handle pagination correctly with many results', async () => {
      const memoCount = 25;
      const pageSize = 10;

      // Create many memos
      for (let i = 0; i < memoCount; i++) {
        await memoRepository.create({
          memoId: generateTestId(`page_memo_${i}`),
          uid: testUser.uid,
          content: `Page content ${i}`,
          type: 'text',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Simulate getting page 1
      const page1 = await memoRepository.findByUserId({
        uid: testUser.uid,
        page: 1,
        limit: pageSize,
      });

      // Simulate getting page 2
      const page2 = await memoRepository.findByUserId({
        uid: testUser.uid,
        page: 2,
        limit: pageSize,
      });

      // Simulate getting page 3
      const page3 = await memoRepository.findByUserId({
        uid: testUser.uid,
        page: 3,
        limit: pageSize,
      });

      expect(page1.items).toHaveLength(pageSize);
      expect(page2.items).toHaveLength(pageSize);
      expect(page3.items).toHaveLength(5); // Remaining 5 memos
      expect(page1.total).toBe(memoCount);
    });
  });
});
