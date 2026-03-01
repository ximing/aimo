/**
 * Database Migration Runner
 * Runs Drizzle migrations on MySQL database
 */

import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

/**
 * Run database migrations
 * This function creates a temporary connection, runs migrations, and closes the connection
 */
export async function runMigrations(): Promise<void> {
  logger.info('Starting database migrations...');

  let connection: mysql.Connection | null = null;

  try {
    // Create a temporary connection for migrations
    connection = await mysql.createConnection({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
    });

    logger.info('Migration connection established');

    // Create Drizzle instance for migrations
    const db = drizzle(connection);

    // Run migrations from the drizzle folder
    await migrate(db, { migrationsFolder: './drizzle' });

    logger.info('✓ Database migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    // Close the temporary connection
    if (connection) {
      await connection.end();
      logger.info('Migration connection closed');
    }
  }
}

/**
 * Run migrations if this file is executed directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      logger.info('Migrations completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration error:', error);
      process.exit(1);
    });
}
