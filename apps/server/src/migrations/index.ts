/**
 * Migration Manager
 * Orchestrates database schema migrations with version tracking
 *
 * Design:
 * 1. Maintains a metadata table (table_migrations) to track schema versions
 * 2. On first run, creates metadata table and initializes all tables to v1
 * 3. On subsequent runs, checks for pending migrations and executes them
 * 4. Executes migrations in order: v1 -> v2 -> v3, etc.
 * 5. Updates metadata after each successful migration
 */

import { MigrationExecutor } from './executor.js';
import {
  ALL_MIGRATIONS,
  getMigrationsFromVersion,
  getLatestVersion,
  getAllTableNames,
} from './scripts/index.js';

import type { MigrationExecutionResult } from './types.js';
import type { Connection } from '@lancedb/lancedb';

export interface MigrationManagerOptions {
  /**
   * Enable debug logging
   */
  verbose?: boolean;

  /**
   * Dry run mode - log migrations but don't execute them
   */
  dryRun?: boolean;
}

export class MigrationManager {
  constructor(private options: MigrationManagerOptions = {}) {}

  /**
   * Initialize migrations on database startup
   * This is the main entry point called from LanceDbService.init()
   *
   * Flow:
   * 1. Ensure metadata table exists
   * 2. For each table with migrations:
   *    a. Get current version from metadata (or 0 if not found)
   *    b. Get target version from migration scripts
   *    c. If target > current, execute migrations from current+1 to target
   *    d. Update metadata with new version
   */
  async initialize(connection: Connection): Promise<void> {
    try {
      if (this.options.verbose) {
        console.log('Starting migration manager initialization...');
      }

      // Step 1: Ensure metadata table exists
      const metadataTable = await MigrationExecutor.ensureMetadataTableExists(connection);

      // Step 2: Process each table
      const tableNames = getAllTableNames();

      if (this.options.verbose) {
        console.log(`Found ${tableNames.length} tables with migrations: ${tableNames.join(', ')}`);
      }

      for (const tableName of tableNames) {
        await this.migrateTable(connection, metadataTable, tableName);
      }

      if (this.options.verbose) {
        console.log('Migration manager initialization completed successfully');
      }
    } catch (error) {
      console.error('Migration manager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Migrate a single table to its latest version
   */
  private async migrateTable(connection: Connection, metadataTable: any, tableName: string): Promise<void> {
    try {
      if (this.options.verbose) {
        console.log(`\nProcessing table: ${tableName}`);
      }

      // Get current version from metadata
      const currentVersion = await MigrationExecutor.getCurrentVersion(metadataTable, tableName);

      // Get target version from migrations
      const targetVersion = getLatestVersion(tableName);

      if (this.options.verbose) {
        console.log(`  Current version: ${currentVersion}, Target version: ${targetVersion}`);
      }

      // If versions match, nothing to do
      if (currentVersion === targetVersion) {
        if (this.options.verbose) {
          console.log(`  Table ${tableName} is up to date`);
        }
        return;
      }

      // Get pending migrations
      const pendingMigrations = getMigrationsFromVersion(tableName, currentVersion);

      if (pendingMigrations.length === 0) {
        if (this.options.verbose) {
          console.log(`  No pending migrations for table ${tableName}`);
        }
        return;
      }

      if (this.options.verbose) {
        console.log(`  Pending migrations: v${pendingMigrations.map((m) => m.version).join(' -> v')}`);
      }

      // Execute pending migrations
      if (this.options.dryRun) {
        console.log(`  [DRY RUN] Would execute ${pendingMigrations.length} migrations for ${tableName}`);
        for (const migration of pendingMigrations) {
          console.log(`    - ${migration.description || 'Migration'} (v${migration.version})`);
        }
      } else {
        await MigrationExecutor.executeMigrations(connection, pendingMigrations, metadataTable);
        if (this.options.verbose) {
          console.log(`  Successfully migrated ${tableName} to v${targetVersion}`);
        }
      }
    } catch (error) {
      console.error(`Failed to migrate table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get current state of all tables
   */
  async getStatus(connection: Connection): Promise<Map<string, number>> {
    try {
      const metadataTable = await MigrationExecutor.ensureMetadataTableExists(connection);
      const status = new Map<string, number>();

      const tableNames = getAllTableNames();
      for (const tableName of tableNames) {
        const version = await MigrationExecutor.getCurrentVersion(metadataTable, tableName);
        status.set(tableName, version);
      }

      return status;
    } catch (error) {
      console.error('Failed to get migration status:', error);
      throw error;
    }
  }

  /**
   * Validate that all tables are at their target versions
   */
  async validate(connection: Connection): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const status = await this.getStatus(connection);
      const errors: string[] = [];

      for (const [tableName, currentVersion] of status.entries()) {
        const targetVersion = getLatestVersion(tableName);
        if (currentVersion !== targetVersion) {
          errors.push(`${tableName}: current v${currentVersion}, target v${targetVersion}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      console.error('Migration validation failed:', error);
      throw error;
    }
  }
}

// Export for backward compatibility
export { MigrationExecutor };
export type { Migration, MigrationExecutionResult } from './types.js';
export { getAllTableNames, getLatestVersion, getMigrationsFromVersion, getMigrationsForTable } from './scripts/index.js';
