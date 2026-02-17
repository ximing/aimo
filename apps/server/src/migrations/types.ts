/**
 * Migration System Type Definitions
 */

import type { Connection } from '@lancedb/lancedb';

/**
 * Migration record stored in table_migrations table
 * Tracks the version state of each database table
 */
export interface MigrationRecord {
  tableName: string; // unique table name
  currentVersion: number; // current schema version
  lastMigratedAt: number; // timestamp of last migration in milliseconds
}

/**
 * Migration script interface
 * Each migration version implements this interface
 */
export interface Migration {
  /**
   * Version number (must be > 0)
   * Must be unique per table
   */
  version: number;

  /**
   * Table name this migration applies to
   */
  tableName: string;

  /**
   * Migration up function: perform schema changes and data migrations
   * @param connection LanceDB connection
   */
  up: (connection: Connection) => Promise<void>;

  /**
   * Optional: description of changes
   */
  description?: string;
}

/**
 * Migration state after execution
 */
export interface MigrationExecutionResult {
  tableName: string;
  fromVersion: number;
  toVersion: number;
  executedMigrations: number[]; // list of executed migration versions
  executedAt: number; // timestamp in milliseconds
}
