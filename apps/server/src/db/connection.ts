import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import * as schema from './schema/index.js';

/**
 * MySQL connection pool singleton
 */
let pool: mysql.Pool | null = null;

/**
 * Drizzle database instance singleton
 */
let db: any = null;

/**
 * Initialize MySQL connection pool and Drizzle instance
 */
export function initializeDatabase() {
  if (pool) {
    logger.warn('Database pool already initialized');
    return db!;
  }

  const { host, port, user, password, database, connectionLimit } = config.mysql;

  logger.info('Initializing MySQL connection pool', {
    host,
    port,
    database,
    user,
    connectionLimit,
  });

  // Create MySQL connection pool
  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    connectionLimit: connectionLimit || 10,
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

  // Create Drizzle instance with schema
  db = drizzle(pool, { schema, mode: 'default' });

  logger.info('MySQL connection pool initialized successfully', {
    min: 2,
    max: connectionLimit || 10,
  });

  return db;
}

/**
 * Get Drizzle database instance (singleton)
 * Throws error if not initialized
 */
export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Check MySQL connection health
 */
export async function checkConnectionHealth(): Promise<boolean> {
  if (!pool) {
    logger.error('Connection health check failed: pool not initialized');
    return false;
  }

  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    logger.info('MySQL connection health check passed');
    return true;
  } catch (error) {
    logger.error('MySQL connection health check failed', { error });
    return false;
  }
}

/**
 * Get connection pool status
 */
export function getPoolStatus() {
  if (!pool) {
    return null;
  }

  // mysql2 pool doesn't expose all stats, but we can get basic info
  return {
    connectionLimit: config.mysql.connectionLimit || 10,
    initialized: !!pool,
  };
}

/**
 * Gracefully close MySQL connection pool
 */
export async function closeDatabase(): Promise<void> {
  if (!pool) {
    logger.warn('Database pool not initialized, nothing to close');
    return;
  }

  logger.info('Closing MySQL connection pool...');

  try {
    await pool.end();
    pool = null;
    db = null;
    logger.info('MySQL connection pool closed successfully');
  } catch (error) {
    logger.error('Error closing MySQL connection pool', { error });
    throw error;
  }
}
