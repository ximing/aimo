import { Service } from 'typedi';
import * as lancedb from '@lancedb/lancedb';
import type { Connection, Table } from '@lancedb/lancedb';
import { config } from '../config/config.js';
import {
  usersSchema,
  memosSchema,
  memoRelationsSchema,
  categoriesSchema,
  embeddingCacheSchema,
  attachmentsSchema,
  type UserRecord,
  type MemoRecord,
  type MemoRelationRecord,
  type CategoryRecord,
  type EmbeddingCacheRecord,
  type AttachmentRecord,
} from '../models/db/schema.js';

// Re-export for backward compatibility
export type { UserRecord, MemoRecord, MemoRelationRecord, CategoryRecord, EmbeddingCacheRecord, AttachmentRecord };

@Service()
export class LanceDbService {
  private db!: Connection;
  private initialized = false;
  private tableCache: Map<string, Table> = new Map();

  async init() {
    try {
      const storageType = config.lancedb.storageType;
      const path = config.lancedb.path;

      console.log(`Initializing LanceDB with storage type: ${storageType}, path: ${path}`);

      if (storageType === 's3') {
        // S3 Storage
        const s3Config = config.lancedb.s3;
        if (!s3Config) {
          throw new Error('S3 configuration is missing');
        }

        if (!s3Config.bucket) {
          throw new Error('S3 bucket name is required');
        }

        // Build storage options for S3
        const storageOptions: Record<string, string> = {
          virtualHostedStyleRequest: 'true', // 启用 virtual hosted style
          conditionalPut: 'disabled', // 关键！
        };

        if (s3Config.awsAccessKeyId) {
          storageOptions.awsAccessKeyId = s3Config.awsAccessKeyId;
        }

        if (s3Config.awsSecretAccessKey) {
          storageOptions.awsSecretAccessKey = s3Config.awsSecretAccessKey;
        }

        if (s3Config.region) {
          storageOptions.awsRegion = s3Config.region;
        }

        if (s3Config.endpoint) {
          //   storageOptions.endpoint = s3Config.endpoint;
          storageOptions.awsEndpoint = `https://${s3Config.bucket}.oss-${s3Config.region}.aliyuncs.com`;
        }

        const logMessage = [
          `Connecting to S3 bucket: ${s3Config.bucket}`,
          `prefix: ${s3Config.prefix}`,
          s3Config.endpoint ? `endpoint: ${s3Config.endpoint}` : null,
        ]
          .filter(Boolean)
          .join(', ');

        console.log(logMessage);

        this.db = await lancedb.connect(path, {
          storageOptions,
        });
      } else {
        // Local Storage (default)
        console.log(`Connecting to local database at: ${path}`);
        this.db = await lancedb.connect(path);
      }

      // Mark as initialized after connection is established (needed for table operations during init)
      this.initialized = true;

      await this.ensureTablesExist();
      console.log('LanceDB initialized successfully');
    } catch (error) {
      console.error('Failed to initialize LanceDB:', error);
      throw error;
    }
  }

  private async ensureTablesExist() {
    try {
      // Get existing tables
      const tableNames = await this.db.tableNames();

      // Create users table if not exists with explicit schema
      if (!tableNames.includes('users')) {
        console.log('Creating users table with explicit schema...');
        await this.db.createEmptyTable('users', usersSchema);
        console.log('Users table created successfully');
      }

      // Create memos table if not exists with explicit schema
      if (!tableNames.includes('memos')) {
        console.log('Creating memos table with explicit schema...');
        await this.db.createEmptyTable('memos', memosSchema);
        console.log('Memos table created successfully');
      }

      // Create memo_relations table if not exists with explicit schema
      if (!tableNames.includes('memo_relations')) {
        console.log('Creating memo_relations table with explicit schema...');
        await this.db.createEmptyTable('memo_relations', memoRelationsSchema);
        console.log('Memo relations table created successfully');
      }

      // Create categories table if not exists with explicit schema
      if (!tableNames.includes('categories')) {
        console.log('Creating categories table with explicit schema...');
        await this.db.createEmptyTable('categories', categoriesSchema);
        console.log('Categories table created successfully');
      }

      // Create embedding_cache table if not exists with explicit schema
      if (!tableNames.includes('embedding_cache')) {
        console.log('Creating embedding_cache table with explicit schema...');
        await this.db.createEmptyTable('embedding_cache', embeddingCacheSchema);
        console.log('Embedding cache table created successfully');
      }

      // Create attachments table if not exists with explicit schema
      if (!tableNames.includes('attachments')) {
        console.log('Creating attachments table with explicit schema...');
        await this.db.createEmptyTable('attachments', attachmentsSchema);
        console.log('Attachments table created successfully');
      }

      // Create scalar indexes for query optimization
      await this.createScalarIndexes();
    } catch (error) {
      console.error('Error ensuring tables exist:', error);
      throw error;
    }
  }

  /**
   * Create scalar indexes for query optimization
   * Indexes accelerate filtering and search operations
   * 
   * Index Strategy:
   * - BTREE indexes: for exact match, range queries, and sorting on indexed fields
   * - BITMAP indexes: for low-cardinality fields (status, flags)
   * - Single-column indexes: cover most query patterns in this schema
   * 
   * Note: LanceDB currently does not support composite indexes in this version.
   * Use single-column indexes on the most frequently filtered/sorted columns.
   * Query optimizer will use multiple single-column indexes when needed.
   */
  private async createScalarIndexes() {
    try {
      const users = await this.openTable('users');
      const memos = await this.openTable('memos');
      const memoRelations = await this.openTable('memo_relations');
      const categories = await this.openTable('categories');
      const attachments = await this.openTable('attachments');
      const embeddingCache = await this.openTable('embedding_cache');

      // Users table indexes
      // uid: BTREE for exact match queries
      // email, phone: BTREE for login and lookup queries
      // status: BITMAP for low-cardinality filtering
      await this.createIndexIfNotExists(users, 'uid', 'BTREE', 'users');
      await this.createIndexIfNotExists(users, 'email', 'BTREE', 'users');
      await this.createIndexIfNotExists(users, 'phone', 'BTREE', 'users');
      await this.createIndexIfNotExists(users, 'status', 'BITMAP', 'users');

      // Memos table indexes
      // uid: BTREE for filtering by user
      // categoryId: BTREE for filtering by category
      // createdAt, updatedAt: BTREE for range queries and sorting
      // memoId: BTREE for exact match lookup
      await this.createIndexIfNotExists(memos, 'uid', 'BTREE', 'memos');
      await this.createIndexIfNotExists(memos, 'memoId', 'BTREE', 'memos');
      await this.createIndexIfNotExists(memos, 'categoryId', 'BTREE', 'memos');
      await this.createIndexIfNotExists(memos, 'createdAt', 'BTREE', 'memos');
      await this.createIndexIfNotExists(memos, 'updatedAt', 'BTREE', 'memos');

      // Memo relations table indexes
      // uid: BTREE for user isolation
      // relationId: BTREE for exact match lookup
      // sourceMemoId: BTREE for querying relations from a memo
      // targetMemoId: BTREE for reverse lookup
      // sourceMemoId + targetMemoId: for detecting duplicate relations
      await this.createIndexIfNotExists(memoRelations, 'uid', 'BTREE', 'memo_relations');
      await this.createIndexIfNotExists(memoRelations, 'relationId', 'BTREE', 'memo_relations');
      await this.createIndexIfNotExists(memoRelations, 'sourceMemoId', 'BTREE', 'memo_relations');
      await this.createIndexIfNotExists(memoRelations, 'targetMemoId', 'BTREE', 'memo_relations');

      // Categories table indexes
      // uid: BTREE for filtering by user
      // categoryId: BTREE for exact match lookup
      // createdAt: BTREE for date range queries
      await this.createIndexIfNotExists(categories, 'uid', 'BTREE', 'categories');
      await this.createIndexIfNotExists(categories, 'categoryId', 'BTREE', 'categories');
      await this.createIndexIfNotExists(categories, 'createdAt', 'BTREE', 'categories');

      // Attachments table indexes
      // uid: BTREE for filtering by user
      // attachmentId: BTREE for exact match lookup
      // createdAt: BTREE for date range queries
      await this.createIndexIfNotExists(attachments, 'uid', 'BTREE', 'attachments');
      await this.createIndexIfNotExists(attachments, 'attachmentId', 'BTREE', 'attachments');
      await this.createIndexIfNotExists(attachments, 'createdAt', 'BTREE', 'attachments');

      // Embedding cache indexes
      // contentHash: BTREE for cache lookup
      // modelHash: BTREE for model-specific cache filtering
      await this.createIndexIfNotExists(embeddingCache, 'contentHash', 'BTREE', 'embedding_cache');
      await this.createIndexIfNotExists(embeddingCache, 'modelHash', 'BTREE', 'embedding_cache');
    } catch (error) {
      console.error('Error creating scalar indexes:', error);
      // Don't throw - allow app to continue even if index creation fails
      console.warn('Warning: Scalar index creation failed. Query performance may be reduced.');
    }
  }

  /**
   * Create a scalar index if it doesn't already exist
   */
  private async createIndexIfNotExists(
    table: Table,
    columnName: string,
    indexType: 'BTREE' | 'BITMAP' = 'BTREE',
    tableName: string = 'unknown'
  ): Promise<void> {
    try {
      // Create the appropriate index type using LanceDB API
      const config =
        indexType === 'BITMAP'
          ? { config: lancedb.Index.bitmap() }
          : { config: lancedb.Index.btree() };

      await table.createIndex(columnName, config);
      console.log(`Created ${indexType} index on ${tableName}.${columnName}`);
    } catch (error: any) {
      // Index already exists or other error
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        console.debug(`Index already exists on ${tableName}.${columnName}`);
      } else {
        console.warn(`Failed to create index on ${tableName}.${columnName}:`, error.message);
      }
    }
  }

  /**
   * Get database connection
   */
  getDb(): Connection {
    if (!this.initialized) {
      throw new Error('LanceDB not initialized. Call init() first.');
    }
    return this.db;
  }

  /**
   * Open a table by name
   * Uses caching to reuse Table objects and avoid repeated initialization overhead
   * Table objects are designed for long-term reuse and cache index data in memory
   */
  async openTable(tableName: string): Promise<Table> {
    // Check cache first
    if (this.tableCache.has(tableName)) {
      return this.tableCache.get(tableName)!;
    }

    // Open table and cache it
    const db = this.getDb();
    const table = await db.openTable(tableName);
    this.tableCache.set(tableName, table);

    return table;
  }

  /**
   * Check if database is initialized
   */
  async isInitialized(): Promise<boolean> {
    return this.initialized;
  }

  /**
   * Optimize a table to rebuild indexes and consolidate data
   * Should be called after bulk insert/update operations to ensure indexes are up-to-date
   * Non-blocking and handles errors internally - will not throw
   * 
   * @param tableName - The name of the table to optimize
   * @param cleanupOlderThanDays - Optional: Clean up versions older than N days (default: uses config.lancedb.versionRetentionDays)
   */
  async optimizeTable(tableName: string, cleanupOlderThanDays?: number): Promise<void> {
    try {
      const table = await this.openTable(tableName);
      
      // 使用传入的天数或配置中的默认值
      const retentionDays = cleanupOlderThanDays ?? config.lancedb.versionRetentionDays;
      const cleanupDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      
      console.log(`Optimizing table: ${tableName} (cleaning versions older than ${retentionDays} days)...`);
      
      await table.optimize({
        cleanupOlderThan: cleanupDate,
      });
      
      console.log(`Table ${tableName} optimized successfully (versions older than ${retentionDays} days cleaned)`);
    } catch (error) {
      console.warn(`Warning: Failed to optimize table ${tableName}:`, error);
      // Don't throw - allow operations to continue even if optimization fails
    }
  }

  /**
   * Optimize all tables to rebuild indexes and consolidate data
   * Useful after bulk operations or periodic maintenance
   * 
   * @param cleanupOlderThanDays - Optional: Clean up versions older than N days (default: uses config.lancedb.versionRetentionDays)
   */
  async optimizeAllTables(cleanupOlderThanDays?: number): Promise<void> {
    const tables = ['users', 'memos', 'memo_relations', 'categories', 'attachments', 'embedding_cache'];
    console.log(`Starting optimization for all tables...`);
    
    for (const tableName of tables) {
      try {
        await this.optimizeTable(tableName, cleanupOlderThanDays);
      } catch (error) {
        console.warn(`Warning: Failed to optimize ${tableName}:`, error);
        // Continue with other tables even if one fails
      }
    }
    
    console.log(`All tables optimization completed`);
  }

  /**
   * Close all cached tables and release resources
   * Call this during application shutdown to ensure proper cleanup
   */
  async closeAllTables(): Promise<void> {
    try {
      for (const [tableName, table] of this.tableCache.entries()) {
        try {
          table.close();
          console.log(`Closed table: ${tableName}`);
        } catch (error) {
          console.warn(`Error closing table ${tableName}:`, error);
        }
      }
      this.tableCache.clear();
    } catch (error) {
      console.error('Error closing tables:', error);
      throw error;
    }
  }

  /**
   * Close the database connection and all cached resources
   * Should be called during application shutdown
   */
  async close(): Promise<void> {
    try {
      await this.closeAllTables();
      this.db.close();
      this.initialized = false;
      console.log('LanceDB connection closed');
    } catch (error) {
      console.error('Error closing LanceDB:', error);
      throw error;
    }
  }
}
