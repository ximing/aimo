import { Service } from 'typedi';
import * as lancedb from '@lancedb/lancedb';
import type { Connection, Table } from '@lancedb/lancedb';
import { config } from '../config/config.js';
import { usersSchema, memosSchema, type UserRecord, type MemoRecord } from '../models/db/schema.js';

// Re-export for backward compatibility
export type { UserRecord, MemoRecord };

@Service()
export class LanceDbService {
  private db!: Connection;
  private initialized = false;

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

      await this.ensureTablesExist();
      this.initialized = true;
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
    } catch (error) {
      console.error('Error ensuring tables exist:', error);
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
   */
  async openTable(tableName: string): Promise<Table> {
    const db = this.getDb();
    return db.openTable(tableName);
  }

  /**
   * Check if database is initialized
   */
  async isInitialized(): Promise<boolean> {
    return this.initialized;
  }
}
