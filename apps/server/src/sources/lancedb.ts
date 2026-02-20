import * as lancedb from '@lancedb/lancedb';
import { Service } from 'typedi';


import { config } from '../config/config.js';
import { MigrationManager } from '../migrations/index.js';
import {
  type UserRecord,
  type MemoRecord,
  type MemoRelationRecord,
  type CategoryRecord,
  type EmbeddingCacheRecord,
  type AttachmentRecord,
  type MultimodalEmbeddingCacheRecord,
} from '../models/db/schema.js';

import type { Connection, Table } from '@lancedb/lancedb';

// Re-export for backward compatibility
export type {
  UserRecord,
  MemoRecord,
  MemoRelationRecord,
  CategoryRecord,
  EmbeddingCacheRecord,
  AttachmentRecord,
  MultimodalEmbeddingCacheRecord,
};

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

      // Run migrations (includes table creation and index creation)
      await this.runMigrations();

      console.log('LanceDB initialized successfully');
    } catch (error) {
      console.error('Failed to initialize LanceDB:', error);
      throw error;
    }
  }

  /**
   * Run migrations to initialize or upgrade schema
   * This replaces the old ensureTablesExist() method
   */
  private async runMigrations(): Promise<void> {
    try {
      console.log('Running database migrations...');
      const migrationManager = new MigrationManager({ verbose: true });
      await migrationManager.initialize(this.db);

      // Validate migration state
      const validation = await migrationManager.validate(this.db);
      if (!validation.valid) {
        console.error('Migration validation failed:', validation.errors);
        throw new Error(`Database schema is not up to date: ${validation.errors.join(', ')}`);
      }

      console.log('All migrations completed successfully');
    } catch (error) {
      console.error('Migration execution failed:', error);
      throw error;
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

      console.log(
        `Optimizing table: ${tableName} (cleaning versions older than ${retentionDays} days)...`
      );

      await table.optimize({
        cleanupOlderThan: cleanupDate,
      });

      console.log(
        `Table ${tableName} optimized successfully (versions older than ${retentionDays} days cleaned)`
      );
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
    const tables = [
      'users',
      'memos',
      'memo_relations',
      'categories',
      'attachments',
      'embedding_cache',
      'multimodal_embedding_cache',
    ];
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
