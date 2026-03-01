import type { MySql2Database } from 'drizzle-orm/mysql2';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzleMySql } from 'drizzle-orm/mysql2';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import mysql from 'mysql2/promise';
import pg from 'pg';
import Database from 'better-sqlite3';
import { Service } from 'typedi';
import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';

import { config } from '../../config/config.js';
import { logger } from '../../utils/logger.js';

export type DatabaseType = 'mysql' | 'postgresql' | 'sqlite';

// Union type for the database client
export type DatabaseClient = MySql2Database | NodePgDatabase | BetterSQLite3Database;

// Internal pool/connection type
type MySqlPool = mysql.Pool;
type PgPool = pg.Pool;
type SqliteDb = Database.Database;

@Service()
export class DrizzleAdapter {
  private db!: DatabaseClient;
  private mysqlPool?: MySqlPool;
  private pgPool?: PgPool;
  private sqliteDb?: SqliteDb;
  private initialized = false;
  private dbType: DatabaseType = 'mysql';

  /**
   * Initialize the database connection
   */
  async init(): Promise<void> {
    try {
      this.dbType = config.database.type;
      logger.info(`Initializing Drizzle with database type: ${this.dbType}`);

      switch (this.dbType) {
        case 'mysql':
          await this.initMySQL();
          break;
        case 'postgresql':
          await this.initPostgreSQL();
          break;
        case 'sqlite':
          await this.initSQLite();
          break;
        default:
          throw new Error(`Unsupported database type: ${this.dbType}`);
      }

      this.initialized = true;
      logger.info('Drizzle initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Drizzle:', error);
      throw error;
    }
  }

  /**
   * Initialize MySQL connection
   */
  private async initMySQL(): Promise<void> {
    const dbConfig = config.database.mysql;
    if (!dbConfig) {
      throw new Error('MySQL configuration is missing');
    }

    const connectionConfig: mysql.PoolOptions = {
      host: dbConfig.host,
      port: dbConfig.port || 3306,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      waitForConnections: true,
      connectionLimit: dbConfig.poolSize || 10,
      queueLimit: 0,
    };

    logger.info(`Connecting to MySQL at ${connectionConfig.host}:${connectionConfig.port}/${connectionConfig.database}`);

    this.mysqlPool = mysql.createPool(connectionConfig);
    this.db = drizzleMySql(this.mysqlPool) as unknown as DatabaseClient;
  }

  /**
   * Initialize PostgreSQL connection
   */
  private async initPostgreSQL(): Promise<void> {
    const dbConfig = config.database.postgresql;
    if (!dbConfig) {
      throw new Error('PostgreSQL configuration is missing');
    }

    const connectionConfig: pg.PoolConfig = {
      host: dbConfig.host,
      port: dbConfig.port || 5432,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      max: dbConfig.poolSize || 10,
    };

    logger.info(`Connecting to PostgreSQL at ${connectionConfig.host}:${connectionConfig.port}/${connectionConfig.database}`);

    this.pgPool = new pg.Pool(connectionConfig);
    this.db = drizzlePg(this.pgPool) as unknown as DatabaseClient;
  }

  /**
   * Initialize SQLite connection
   */
  private async initSQLite(): Promise<void> {
    const dbConfig = config.database.sqlite;
    if (!dbConfig) {
      throw new Error('SQLite configuration is missing');
    }

    logger.info(`Connecting to SQLite at: ${dbConfig.path}`);

    this.sqliteDb = new Database(dbConfig.path);
    this.db = drizzleSqlite(this.sqliteDb) as unknown as DatabaseClient;
  }

  /**
   * Get the database instance
   */
  getDb(): DatabaseClient {
    if (!this.initialized) {
      throw new Error('Drizzle not initialized. Call init() first.');
    }
    return this.db;
  }

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the database type
   */
  getDbType(): DatabaseType {
    return this.dbType;
  }

  /**
   * Run a simple query to check database health
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (this.dbType === 'mysql' && this.mysqlPool) {
        await this.mysqlPool.query('SELECT 1');
      } else if (this.dbType === 'postgresql' && this.pgPool) {
        await this.pgPool.query('SELECT 1');
      } else if (this.dbType === 'sqlite' && this.sqliteDb) {
        this.sqliteDb.prepare('SELECT 1').run();
      }
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Run migrations - to be called by migration system
   * Reads migration files from src/sources/database/migrations/
   * and tracks executed migrations in the _migrations table
   */
  async runMigrations(): Promise<void> {
    if (!this.initialized) {
      throw new Error('Drizzle not initialized. Call init() first.');
    }

    try {
      logger.info('Running Drizzle migrations...');

      // Get migrations directory
      const migrationsDir = join(fileURLToPath(import.meta.url), '..', '..', '..', 'migrations');
      const migrationFiles = readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

      if (migrationFiles.length === 0) {
        logger.info('No migration files found');
        return;
      }

      // Get executed migrations from _migrations table
      const { getMigrationsTable, mysqlMigrations, pgMigrations, sqliteMigrations } = await import('./schema/index.js');

      // Query to get executed migration hashes based on db type
      let executedMigrations: string[] = [];
      try {
        if (this.dbType === 'mysql') {
          const result = await (this.db as MySql2Database).select().from(mysqlMigrations);
          executedMigrations = result.map((r) => r.hash);
        } else if (this.dbType === 'postgresql') {
          const result = await (this.db as NodePgDatabase).select().from(pgMigrations);
          executedMigrations = result.map((r) => r.hash);
        } else {
          const sqliteDb = this.sqliteDb;
          if (sqliteDb) {
            const result = sqliteDb.prepare('SELECT hash FROM _migrations').all() as { hash: string }[];
            executedMigrations = result.map((r) => r.hash);
          }
        }
      } catch {
        // Table might not exist yet, that's okay - we'll create it
        logger.info('_migrations table does not exist yet, it will be created by migrations');
      }

      // Run pending migrations
      let executedCount = 0;
      for (const migrationFile of migrationFiles) {
        const migrationPath = join(migrationsDir, migrationFile);
        const migrationHash = this.hashFile(migrationPath);

        // Skip if already executed
        if (executedMigrations.includes(migrationHash)) {
          continue;
        }

        logger.info(`Executing migration: ${migrationFile}`);
        const sql = readFileSync(migrationPath, 'utf-8');

        // Split by statement-breakpoint and execute each statement
        const statements = sql.split('--> statement-breakpoint').map((s) => s.trim()).filter(Boolean);

        for (const statement of statements) {
          if (this.dbType === 'mysql') {
            await (this.db as MySql2Database).execute(statement);
          } else if (this.dbType === 'postgresql') {
            await (this.db as NodePgDatabase).execute(statement);
          } else {
            // SQLite - use raw
            const sqliteDb = this.sqliteDb;
            if (sqliteDb) {
              sqliteDb.exec(statement);
            }
          }
        }

        // Record migration in _migrations table
        const now = Date.now();
        if (this.dbType === 'mysql') {
          await (this.db as MySql2Database).insert(mysqlMigrations).values({
            hash: migrationHash,
            createdAt: new Date(now),
          });
        } else if (this.dbType === 'postgresql') {
          await (this.db as NodePgDatabase).insert(pgMigrations).values({
            hash: migrationHash,
            createdAt: new Date(now),
          });
        } else {
          const sqliteDb = this.sqliteDb;
          if (sqliteDb) {
            sqliteDb.prepare('INSERT INTO _migrations (hash, created_at) VALUES (?, ?)').run(migrationHash, now);
          }
        }

        executedCount++;
        logger.info(`Migration completed: ${migrationFile}`);
      }

      if (executedCount === 0) {
        logger.info('All migrations already executed');
      } else {
        logger.info(`Executed ${executedCount} migration(s)`);
      }
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Generate a simple hash from file content for tracking
   */
  private hashFile(filePath: string): string {
    const content = readFileSync(filePath, 'utf-8');
    // Simple hash based on file name and first 100 chars of content
    const fileName = basename(filePath);
    const hashInput = `${fileName}:${content.substring(0, 100)}`;

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `${fileName}-${Math.abs(hash).toString(16)}`;
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    try {
      if (this.initialized) {
        if (this.dbType === 'mysql' && this.mysqlPool) {
          await this.mysqlPool.end();
        } else if (this.dbType === 'postgresql' && this.pgPool) {
          await this.pgPool.end();
        } else if (this.dbType === 'sqlite' && this.sqliteDb) {
          this.sqliteDb.close();
        }

        this.initialized = false;
        logger.info('Drizzle connection closed');
      }
    } catch (error) {
      logger.error('Error closing Drizzle connection:', error);
      throw error;
    }
  }
}
