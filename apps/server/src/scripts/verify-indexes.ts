#!/usr/bin/env tsx
/**
 * Script to verify index usage on critical queries using EXPLAIN
 * Run with: pnpm tsx src/scripts/verify-indexes.ts
 */

import 'reflect-metadata';
import '../config/env.js';
import { initializeDatabase, getDatabase, closeDatabase } from '../db/connection.js';
import { logger } from '../utils/logger.js';

interface ExplainResult {
  id: number;
  select_type: string;
  table: string;
  partitions: string | null;
  type: string;
  possible_keys: string | null;
  key: string | null;
  key_len: string | null;
  ref: string | null;
  rows: number;
  filtered: number;
  Extra: string | null;
}

async function runExplain(query: string, description: string): Promise<void> {
  const db = getDatabase();
  logger.info(`\n=== ${description} ===`);
  logger.info(`Query: ${query}`);

  try {
    const results = (await db.execute(`EXPLAIN ${query}`)) as unknown as ExplainResult[];

    if (results && results.length > 0) {
      results.forEach((row: ExplainResult) => {
        logger.info('EXPLAIN Result:', {
          table: row.table,
          type: row.type,
          possible_keys: row.possible_keys,
          key: row.key, // The actual index being used
          rows: row.rows,
          Extra: row.Extra,
        });

        // Verify index usage
        if (row.key) {
          logger.info(`✅ Index "${row.key}" is being used`);
        } else if (row.possible_keys) {
          logger.warn(`⚠️  No index used, but possible keys available: ${row.possible_keys}`);
        } else {
          logger.warn(`⚠️  No index used (full table scan)`);
        }
      });
    }
  } catch (error) {
    logger.error(`Error running EXPLAIN: ${error}`);
  }
}

async function verifyIndexes() {
  try {
    logger.info('🔍 Verifying database index usage...\n');

    // Initialize database connection
    initializeDatabase();

    // Test 1: Query memos by uid (should use uid_idx)
    await runExplain(
      "SELECT * FROM memos WHERE uid = 'test-uid' LIMIT 10",
      'Query memos by user ID'
    );

    // Test 2: Query memos by categoryId (should use category_id_idx)
    await runExplain(
      "SELECT * FROM memos WHERE category_id = 'test-category-id'",
      'Query memos by category ID'
    );

    // Test 3: Query memos sorted by createdAt (should use created_at_idx)
    await runExplain(
      "SELECT * FROM memos WHERE uid = 'test-uid' ORDER BY created_at DESC LIMIT 20",
      'Query memos sorted by creation date'
    );

    // Test 4: Query memo relations by sourceMemoId (should use source_memo_id_idx)
    await runExplain(
      "SELECT * FROM memo_relations WHERE source_memo_id = 'test-memo-id'",
      'Query memo relations by source memo ID'
    );

    // Test 5: Query memo relations by sourceMemoId and targetMemoId (should use source_target_unique)
    await runExplain(
      "SELECT * FROM memo_relations WHERE source_memo_id = 'test-memo-1' AND target_memo_id = 'test-memo-2'",
      'Query memo relation by source and target (unique constraint)'
    );

    // Test 6: Query attachments by uid (should use uid_idx)
    await runExplain(
      "SELECT * FROM attachments WHERE uid = 'test-uid' ORDER BY created_at DESC",
      'Query attachments by user ID'
    );

    // Test 7: Query AI messages by conversationId (should use conversation_id_idx)
    await runExplain(
      "SELECT * FROM ai_messages WHERE conversation_id = 'test-conversation-id' ORDER BY created_at ASC",
      'Query AI messages by conversation ID'
    );

    // Test 8: Query daily recommendations by uid and date (should use uid_date_unique)
    await runExplain(
      "SELECT * FROM daily_recommendations WHERE uid = 'test-uid' AND date = '2026-03-01'",
      'Query daily recommendations by user ID and date'
    );

    // Test 9: Join query - memos with category (should use indexes on both tables)
    await runExplain(
      "SELECT m.*, c.name as category_name FROM memos m LEFT JOIN categories c ON m.category_id = c.category_id WHERE m.uid = 'test-uid'",
      'Join memos with categories'
    );

    // Test 10: Complex query with multiple conditions
    await runExplain(
      "SELECT * FROM memos WHERE uid = 'test-uid' AND category_id = 'test-category' AND created_at >= '2026-01-01' ORDER BY created_at DESC LIMIT 20",
      'Complex query with multiple indexed columns'
    );

    logger.info('\n✅ Index verification complete!\n');
    logger.info('Summary:');
    logger.info('- All critical queries should show index usage in the "key" field');
    logger.info('- "type" should be "ref", "eq_ref", or "range" (not "ALL" which means full table scan)');
    logger.info('- Lower "rows" count indicates better query performance');

  } catch (error) {
    logger.error('Failed to verify indexes:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

verifyIndexes();
