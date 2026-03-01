/**
 * Migration Executor
 * Handles execution of individual migrations and updates metadata
 */

import { logger } from '../utils/logger.js';

import type { Migration, MigrationExecutionResult } from './types.js';
import type { TableMigrationRecord } from '../models/db/schema.js';
import type { Connection, Table } from '@lancedb/lancedb';

export const MigrationExecutor = {
  /**
   * Execute a single migration and update metadata
   * @param connection LanceDB connection
   * @param migration Migration to execute
   * @param metadataTable Metadata table for tracking versions
   * @returns Execution result
   */
  async executeMigration(
    connection: Connection,
    migration: Migration,
    metadataTable: Table
  ): Promise<MigrationExecutionResult> {
    const { tableName, version } = migration;

    try {
      logger.info(
        `Executing migration: ${tableName} v${version} - ${migration.description || 'No description'}`
      );

      // Execute the migration
      await migration.up(connection);

      // Update metadata table
      const now = Date.now();
      const metadata: TableMigrationRecord = {
        tableName,
        currentVersion: version,
        lastMigratedAt: now,
      };

      // Check if record exists by querying
      const existingRecords = (await metadataTable
        .query()
        .where(`tableName = '${tableName.replaceAll("'", "''")}'`)
        .limit(1)
        .toArray()) as TableMigrationRecord[];

      if (existingRecords.length > 0) {
        // For LanceDB, we need to delete old record and insert new one
        // or use merge. Since merge might have complex behavior, we delete and re-add
        await metadataTable.delete(`tableName = '${tableName.replaceAll("'", "''")}'`);
      }

      // Insert/upsert the record
      await metadataTable.add([metadata as unknown as Record<string, unknown>]);

      logger.info(`Migration completed: ${tableName} v${version}`);

      return {
        tableName,
        fromVersion: version - 1,
        toVersion: version,
        executedMigrations: [version],
        executedAt: now,
      };
    } catch (error) {
      logger.error(`Failed to execute migration: ${tableName} v${version}`, error);
      throw new Error(`Migration failed for ${tableName} v${version}: ${(error as Error).message}`);
    }
  },

  /**
   * Execute multiple migrations in sequence
   * @param connection LanceDB connection
   * @param migrations Migrations to execute in order
   * @param metadataTable Metadata table
   * @returns Execution result
   */
  async executeMigrations(
    connection: Connection,
    migrations: Migration[],
    metadataTable: Table
  ): Promise<MigrationExecutionResult> {
    if (migrations.length === 0) {
      throw new Error('No migrations to execute');
    }

    const tableName = migrations[0].tableName;
    const executedVersions: number[] = [];
    const startVersion = migrations[0].version;
    let endVersion = migrations[0].version;

    try {
      for (const migration of migrations) {
        await this.executeMigration(connection, migration, metadataTable);
        executedVersions.push(migration.version);
        endVersion = migration.version;
      }

      return {
        tableName,
        fromVersion: startVersion - 1,
        toVersion: endVersion,
        executedMigrations: executedVersions,
        executedAt: Date.now(),
      };
    } catch (error) {
      logger.error(`Failed during batch migration for ${tableName}`, error);
      throw error;
    }
  },

  /**
   * Get the current version of a table from metadata
   * Returns 0 if table has no migration record
   */
  async getCurrentVersion(metadataTable: Table, tableName: string): Promise<number> {
    try {
      // Search for the table in metadata using query
      const results = (await metadataTable
        .query()
        .where(`tableName = '${tableName.replaceAll("'", "''")}'`)
        .limit(1)
        .toArray()) as TableMigrationRecord[];

      if (results.length === 0) {
        return 0; // Table not migrated yet
      }

      const record = results[0];
      return record.currentVersion;
    } catch (error) {
      logger.warn(`Could not get current version for ${tableName}:`, error);
      return 0;
    }
  },

  /**
   * Ensure metadata table exists
   */
  async ensureMetadataTableExists(connection: Connection): Promise<Table> {
    try {
      const tableNames = await connection.tableNames();

      if (!tableNames.includes('table_migrations')) {
        logger.info('Creating table_migrations metadata table...');

        const { tableMigrationsSchema } = await import('../models/db/schema.js');
        await connection.createEmptyTable('table_migrations', tableMigrationsSchema);

        logger.info('Table migrations metadata table created successfully');
      }

      return await connection.openTable('table_migrations');
    } catch (error) {
      logger.error('Failed to ensure metadata table exists:', error);
      throw error;
    }
  },
};
