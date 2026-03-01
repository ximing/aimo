import { getDatabase } from './connection.js';
import { logger } from '../utils/logger.js';

/**
 * Transaction callback function type
 * Receives a transaction object (tx) with same API as db
 */
export type TransactionCallback<T> = (tx: any) => Promise<T>;

/**
 * Execute a database transaction with automatic rollback on error
 *
 * @param callback - Async function that receives transaction object
 * @returns Promise resolving to callback's return value
 * @throws Error if transaction fails (after rollback)
 *
 * @example
 * ```typescript
 * const result = await withTransaction(async (tx) => {
 *   const user = await tx.insert(users).values({ ... });
 *   const memo = await tx.insert(memos).values({ userId: user.id });
 *   return { user, memo };
 * });
 * ```
 */
export async function withTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
  const db = getDatabase();

  try {
    // Drizzle's transaction() method handles BEGIN, COMMIT, and ROLLBACK automatically
    const result = await db.transaction(async (tx: any) => {
      logger.debug('Transaction started');

      try {
        const callbackResult = await callback(tx);
        logger.debug('Transaction callback completed successfully');
        return callbackResult;
      } catch (error) {
        logger.error('Transaction callback failed, rolling back', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Re-throw to trigger Drizzle's automatic rollback
        throw error;
      }
    });

    logger.debug('Transaction committed successfully');
    return result;
  } catch (error) {
    // Log the final error after rollback
    logger.error('Transaction failed and rolled back', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Re-throw the original error for caller to handle
    throw error;
  }
}

/**
 * Execute a database transaction with custom error context
 * Useful for adding contextual information to transaction errors
 *
 * @param context - Contextual information about the transaction (e.g., operation name, user ID)
 * @param callback - Async function that receives transaction object
 * @returns Promise resolving to callback's return value
 * @throws Error with enriched context if transaction fails
 *
 * @example
 * ```typescript
 * const result = await withTransactionContext(
 *   { operation: 'createMemoWithTags', userId: 'user123' },
 *   async (tx) => {
 *     const memo = await tx.insert(memos).values({ ... });
 *     await tx.insert(memoTags).values({ ... });
 *     return memo;
 *   }
 * );
 * ```
 */
export async function withTransactionContext<T>(
  context: Record<string, any>,
  callback: TransactionCallback<T>
): Promise<T> {
  const db = getDatabase();

  try {
    const result = await db.transaction(async (tx: any) => {
      logger.debug('Transaction started with context', { context });

      try {
        const callbackResult = await callback(tx);
        logger.debug('Transaction callback completed successfully', { context });
        return callbackResult;
      } catch (error) {
        logger.error('Transaction callback failed with context, rolling back', {
          context,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    });

    logger.debug('Transaction committed successfully with context', { context });
    return result;
  } catch (error) {
    logger.error('Transaction failed and rolled back with context', {
      context,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Enrich error with context
    if (error instanceof Error) {
      error.message = `Transaction failed [${JSON.stringify(context)}]: ${error.message}`;
    }

    throw error;
  }
}
