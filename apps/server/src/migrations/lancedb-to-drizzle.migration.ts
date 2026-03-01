/**
 * LanceDB to Drizzle Migration Script
 *
 * Migrates existing data from LanceDB to Drizzle relational database.
 * This migration runs on first startup when LanceDB has data but Drizzle is empty.
 *
 * Migration steps:
 * 1. Check if migration is needed (LanceDB has data, Drizzle is empty)
 * 2. Export LanceDB backup to JSON file
 * 3. Migrate all tables: users, memos, memo_relations, attachments
 * 4. Mark migration complete in _migrations table
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { Container } from 'typedi';

import { DrizzleAdapter } from '../sources/database/drizzle-adapter.js';
import { LanceDbService } from '../sources/lancedb.js';
import { logger } from '../utils/logger.js';

import type { UserRecord, MemoRecord, MemoRelationRecord, AttachmentRecord } from '../models/db/schema.js';
import type { DatabaseClient, DatabaseType } from '../sources/database/drizzle-adapter.js';

interface LanceDBBackup {
  timestamp: string;
  version: string;
  tables: {
    users: UserRecord[];
    memos: MemoRecord[];
    memo_relations: MemoRelationRecord[];
    attachments: AttachmentRecord[];
  };
}

const MIGRATION_HASH = 'lancedb-to-drizzle-v1';

/**
 * Check if migration is needed
 * Returns true if LanceDB has data and Drizzle is empty
 */
async function isMigrationNeeded(drizzleAdapter: DrizzleAdapter, lancedbService: LanceDbService): Promise<boolean> {
  try {
    // Check if LanceDB has data
    const db = lancedbService.getDb();
    const tableNames = await db.tableNames();
    const lancedbHasData = tableNames.length > 0 && (
      tableNames.includes('users') ||
      tableNames.includes('memos') ||
      tableNames.includes('memo_relations') ||
      tableNames.includes('attachments')
    );

    if (!lancedbHasData) {
      logger.info('LanceDB has no data, skipping LanceDB to Drizzle migration');
      return false;
    }

    // Check if Drizzle already has data
    const dbType = drizzleAdapter.getDbType();
    const drizzleDb = drizzleAdapter.getDb();

    // Check users table
    let drizzleHasData = false;
    if (dbType === 'mysql') {
      const result = await (drizzleDb as any).select().from({ u: { tableName: 'users', schema: undefined } }).limit(1);
      drizzleHasData = result.length > 0;
    } else if (dbType === 'postgresql') {
      const result = await (drizzleDb as any).select().from({ u: { tableName: 'users', schema: undefined } }).limit(1);
      drizzleHasData = result.length > 0;
    } else {
      // SQLite
      const result = (drizzleDb as any).prepare('SELECT 1 FROM users LIMIT 1').get();
      drizzleHasData = !!result;
    }

    if (drizzleHasData) {
      logger.info('Drizzle already has data, skipping LanceDB to Drizzle migration');
      return false;
    }

    // Check if migration already completed
    const migrationCompleted = await isMigrationCompleted(drizzleAdapter);
    if (migrationCompleted) {
      logger.info('LanceDB to Drizzle migration already completed');
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error checking migration status:', error);
    // If we can't determine, assume migration is needed
    return true;
  }
}

/**
 * Check if migration has already been completed
 */
async function isMigrationCompleted(drizzleAdapter: DrizzleAdapter): Promise<boolean> {
  try {
    const dbType = drizzleAdapter.getDbType();
    const drizzleDb = drizzleAdapter.getDb();
    const { getMigrationsTable } = await import('../sources/database/schema/index.js');
    const migrationsTable = getMigrationsTable(dbType);

    if (dbType === 'mysql') {
      const result = await (drizzleDb as any).select().from(migrationsTable).where((f: any) => f.hash === MIGRATION_HASH);
      return result.length > 0;
    } else if (dbType === 'postgresql') {
      const result = await (drizzleDb as any).select().from(migrationsTable).where((f: any) => f.hash === MIGRATION_HASH);
      return result.length > 0;
    } else {
      // SQLite
      const result = (drizzleDb as any).prepare('SELECT 1 FROM _migrations WHERE hash = ?').get(MIGRATION_HASH);
      return !!result;
    }
  } catch (error) {
    logger.error('Error checking migration completion:', error);
    return false;
  }
}

/**
 * Export LanceDB data to backup file
 */
async function exportLanceDBBackup(lancedbService: LanceDbService): Promise<string> {
  const db = lancedbService.getDb();
  const backupDir = './backups';

  // Create backup directory if it doesn't exist
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilePath = join(backupDir, `lancedb-backup-${timestamp}.json`);

  const backup: LanceDBBackup = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    tables: {
      users: [],
      memos: [],
      memo_relations: [],
      attachments: [],
    },
  };

  // Export users
  try {
    const usersTable = await db.openTable('users');
    const users = await usersTable.query().toArray();
    backup.tables.users = users as unknown as UserRecord[];
    logger.info(`Exported ${backup.tables.users.length} users`);
  } catch (error) {
    logger.warn('Could not export users table:', error);
  }

  // Export memos
  try {
    const memosTable = await db.openTable('memos');
    const memos = await memosTable.query().toArray();
    backup.tables.memos = memos as unknown as MemoRecord[];
    logger.info(`Exported ${backup.tables.memos.length} memos`);
  } catch (error) {
    logger.warn('Could not export memos table:', error);
  }

  // Export memo_relations
  try {
    const memoRelationsTable = await db.openTable('memo_relations');
    const memoRelations = await memoRelationsTable.query().toArray();
    backup.tables.memo_relations = memoRelations as unknown as MemoRelationRecord[];
    logger.info(`Exported ${backup.tables.memo_relations.length} memo relations`);
  } catch (error) {
    logger.warn('Could not export memo_relations table:', error);
  }

  // Export attachments
  try {
    const attachmentsTable = await db.openTable('attachments');
    const attachments = await attachmentsTable.query().toArray();
    backup.tables.attachments = attachments as unknown as AttachmentRecord[];
    logger.info(`Exported ${backup.tables.attachments.length} attachments`);
  } catch (error) {
    logger.warn('Could not export attachments table:', error);
  }

  // Write backup to file
  writeFileSync(backupFilePath, JSON.stringify(backup, null, 2));
  logger.info(`LanceDB backup saved to: ${backupFilePath}`);

  return backupFilePath;
}

/**
 * Migrate users from LanceDB to Drizzle
 */
async function migrateUsers(drizzleDb: DatabaseClient, dbType: DatabaseType, users: UserRecord[]): Promise<void> {
  const { getUsersTable } = await import('../sources/database/schema/index.js');
  const usersTable = getUsersTable(dbType);

  // Process in batches
  const batchSize = 100;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    const userRecords = batch.map((user) => ({
      uid: user.uid,
      email: user.email || null,
      phone: user.phone || null,
      password: user.password,
      salt: user.salt,
      nickname: user.nickname || null,
      avatar: user.avatar || null,
      status: user.status,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    }));

    if (dbType === 'mysql') {
      for (const record of userRecords) {
        await (drizzleDb as any).insert(usersTable).values(record);
      }
    } else if (dbType === 'postgresql') {
      for (const record of userRecords) {
        await (drizzleDb as any).insert(usersTable).values(record);
      }
    } else {
      // SQLite
      const stmt = (drizzleDb as any).prepare(`
        INSERT INTO users (uid, email, phone, password, salt, nickname, avatar, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const record of userRecords) {
        stmt.run(
          record.uid,
          record.email,
          record.phone,
          record.password,
          record.salt,
          record.nickname,
          record.avatar,
          record.status,
          record.createdAt?.getTime(),
          record.updatedAt?.getTime()
        );
      }
    }

    logger.info(`Migrated users ${i + 1}/${Math.min(i + batchSize, users.length)}...`);
  }

  logger.info(`Migrated ${users.length} users successfully`);
}

/**
 * Migrate memos from LanceDB to Drizzle
 */
async function migrateMemos(drizzleDb: DatabaseClient, dbType: DatabaseType, memos: MemoRecord[]): Promise<void> {
  const { getMemosTable } = await import('../sources/database/schema/index.js');
  const memosTable = getMemosTable(dbType);

  // Process in batches
  const batchSize = 100;
  for (let i = 0; i < memos.length; i += batchSize) {
    const batch = memos.slice(i, i + batchSize);

    // Prepare memo records
    const memoRecords = batch.map((memo) => ({
      memoId: memo.memoId,
      uid: memo.uid,
      categoryId: memo.categoryId || null,
      content: memo.content,
      type: memo.type || 'text',
      source: memo.source || null,
      isPublic: 0, // Default to private
      attachments: memo.attachments || [],
      tagIds: memo.tagIds || [],
      tags: memo.tags || [],
      createdAt: new Date(memo.createdAt),
      updatedAt: new Date(memo.updatedAt),
    }));

    if (dbType === 'mysql') {
      for (const record of memoRecords) {
        await (drizzleDb as any).insert(memosTable).values(record);
      }
    } else if (dbType === 'postgresql') {
      for (const record of memoRecords) {
        await (drizzleDb as any).insert(memosTable).values(record);
      }
    } else {
      // SQLite
      const stmt = (drizzleDb as any).prepare(`
        INSERT INTO memos (memo_id, uid, category_id, content, type, source, is_public, attachments, tag_ids, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const record of memoRecords) {
        stmt.run(
          record.memoId,
          record.uid,
          record.categoryId,
          record.content,
          record.type,
          record.source,
          record.isPublic,
          JSON.stringify(record.attachments),
          JSON.stringify(record.tagIds),
          JSON.stringify(record.tags),
          record.createdAt?.getTime(),
          record.updatedAt?.getTime()
        );
      }
    }

    logger.info(`Migrated memos ${i + 1}/${Math.min(i + batchSize, memos.length)}...`);
  }

  logger.info(`Migrated ${memos.length} memos successfully`);
}

/**
 * Migrate memo_relations from LanceDB to Drizzle
 */
async function migrateMemoRelations(
  drizzleDb: DatabaseClient,
  dbType: DatabaseType,
  memoRelations: MemoRelationRecord[]
): Promise<void> {
  const { getMemoRelationsTable } = await import('../sources/database/schema/index.js');
  const memoRelationsTable = getMemoRelationsTable(dbType);

  // Process in batches
  const batchSize = 100;
  for (let i = 0; i < memoRelations.length; i += batchSize) {
    const batch = memoRelations.slice(i, i + batchSize);
    const relationRecords = batch.map((relation) => ({
      relationId: relation.relationId,
      uid: relation.uid,
      sourceMemoId: relation.sourceMemoId,
      targetMemoId: relation.targetMemoId,
      createdAt: new Date(relation.createdAt),
    }));

    if (dbType === 'mysql') {
      for (const record of relationRecords) {
        await (drizzleDb as any).insert(memoRelationsTable).values(record);
      }
    } else if (dbType === 'postgresql') {
      for (const record of relationRecords) {
        await (drizzleDb as any).insert(memoRelationsTable).values(record);
      }
    } else {
      // SQLite
      const stmt = (drizzleDb as any).prepare(`
        INSERT INTO memo_relations (relation_id, uid, source_memo_id, target_memo_id, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const record of relationRecords) {
        stmt.run(record.relationId, record.uid, record.sourceMemoId, record.targetMemoId, record.createdAt?.getTime());
      }
    }

    logger.info(`Migrated memo_relations ${i + 1}/${Math.min(i + batchSize, memoRelations.length)}...`);
  }

  logger.info(`Migrated ${memoRelations.length} memo relations successfully`);
}

/**
 * Migrate attachments from LanceDB to Drizzle
 */
async function migrateAttachments(
  drizzleDb: DatabaseClient,
  dbType: DatabaseType,
  attachments: AttachmentRecord[]
): Promise<void> {
  const { getAttachmentsTable } = await import('../sources/database/schema/index.js');
  const attachmentsTable = getAttachmentsTable(dbType);

  // Process in batches
  const batchSize = 100;
  for (let i = 0; i < attachments.length; i += batchSize) {
    const batch = attachments.slice(i, i + batchSize);
    const attachmentRecords = batch.map((attachment) => ({
      attachmentId: attachment.attachmentId,
      uid: attachment.uid,
      filename: attachment.filename,
      type: attachment.type,
      size: attachment.size,
      storageType: attachment.storageType,
      path: attachment.path,
      bucket: attachment.bucket || null,
      prefix: attachment.prefix || null,
      endpoint: attachment.endpoint || null,
      region: attachment.region || null,
      isPublicBucket: attachment.isPublicBucket || null,
      multimodalModelHash: attachment.multimodalModelHash || null,
      properties: attachment.properties || null,
      createdAt: new Date(attachment.createdAt),
      updatedAt: new Date(attachment.createdAt), // Use createdAt for updatedAt since LanceDB doesn't have updatedAt
    }));

    if (dbType === 'mysql') {
      for (const record of attachmentRecords) {
        await (drizzleDb as any).insert(attachmentsTable).values(record);
      }
    } else if (dbType === 'postgresql') {
      for (const record of attachmentRecords) {
        await (drizzleDb as any).insert(attachmentsTable).values(record);
      }
    } else {
      // SQLite
      const stmt = (drizzleDb as any).prepare(`
        INSERT INTO attachments (attachment_id, uid, filename, type, size, storage_type, path, bucket, prefix, endpoint, region, is_public_bucket, multimodal_model_hash, properties, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const record of attachmentRecords) {
        stmt.run(
          record.attachmentId,
          record.uid,
          record.filename,
          record.type,
          record.size,
          record.storageType,
          record.path,
          record.bucket,
          record.prefix,
          record.endpoint,
          record.region,
          record.isPublicBucket,
          record.multimodalModelHash,
          record.properties,
          record.createdAt?.getTime(),
          record.updatedAt?.getTime()
        );
      }
    }

    logger.info(`Migrated attachments ${i + 1}/${Math.min(i + batchSize, attachments.length)}...`);
  }

  logger.info(`Migrated ${attachments.length} attachments successfully`);
}

/**
 * Record migration completion in _migrations table
 */
async function recordMigrationCompletion(drizzleAdapter: DrizzleAdapter): Promise<void> {
  const dbType = drizzleAdapter.getDbType();
  const drizzleDb = drizzleAdapter.getDb();
  const { getMigrationsTable } = await import('../sources/database/schema/index.js');
  const migrationsTable = getMigrationsTable(dbType);

  const now = new Date();

  if (dbType === 'mysql') {
    await (drizzleDb as any).insert(migrationsTable).values({
      hash: MIGRATION_HASH,
      createdAt: now,
    });
  } else if (dbType === 'postgresql') {
    await (drizzleDb as any).insert(migrationsTable).values({
      hash: MIGRATION_HASH,
      createdAt: now,
    });
  } else {
    // SQLite
    (drizzleDb as any).prepare('INSERT INTO _migrations (hash, created_at) VALUES (?, ?)').run(MIGRATION_HASH, now.getTime());
  }

  logger.info('Migration completion recorded in _migrations table');
}

/**
 * Main migration function
 */
export async function runLanceDBToDrizzleMigration(): Promise<void> {
  const drizzleAdapter = Container.get(DrizzleAdapter);
  const lancedbService = Container.get(LanceDbService);

  try {
    // Check if migration is needed
    const needsMigration = await isMigrationNeeded(drizzleAdapter, lancedbService);
    if (!needsMigration) {
      logger.info('LanceDB to Drizzle migration not needed');
      return;
    }

    logger.info('Starting LanceDB to Drizzle migration...');

    // Export backup first
    logger.info('Creating LanceDB backup...');
    const backupPath = await exportLanceDBBackup(lancedbService);
    logger.info(`Backup created at: ${backupPath}`);

    // Get LanceDB data
    const db = lancedbService.getDb();

    // Get users
    let users: UserRecord[] = [];
    try {
      const usersTable = await db.openTable('users');
      users = (await usersTable.query().toArray()) as unknown as UserRecord[];
    } catch (error) {
      logger.warn('Could not read users table:', error);
    }

    // Get memos
    let memos: MemoRecord[] = [];
    try {
      const memosTable = await db.openTable('memos');
      memos = (await memosTable.query().toArray()) as unknown as MemoRecord[];
    } catch (error) {
      logger.warn('Could not read memos table:', error);
    }

    // Get memo_relations
    let memoRelations: MemoRelationRecord[] = [];
    try {
      const memoRelationsTable = await db.openTable('memo_relations');
      memoRelations = (await memoRelationsTable.query().toArray()) as unknown as MemoRelationRecord[];
    } catch (error) {
      logger.warn('Could not read memo_relations table:', error);
    }

    // Get attachments
    let attachments: AttachmentRecord[] = [];
    try {
      const attachmentsTable = await db.openTable('attachments');
      attachments = (await attachmentsTable.query().toArray()) as unknown as AttachmentRecord[];
    } catch (error) {
      logger.warn('Could not read attachments table:', error);
    }

    // Get Drizzle database
    const drizzleDb = drizzleAdapter.getDb();
    const dbType = drizzleAdapter.getDbType();

    // Migrate each table
    logger.info('Migrating users...');
    await migrateUsers(drizzleDb, dbType, users);

    logger.info('Migrating memos...');
    await migrateMemos(drizzleDb, dbType, memos);

    logger.info('Migrating memo_relations...');
    await migrateMemoRelations(drizzleDb, dbType, memoRelations);

    logger.info('Migrating attachments...');
    await migrateAttachments(drizzleDb, dbType, attachments);

    // Record migration completion
    await recordMigrationCompletion(drizzleAdapter);

    logger.info('LanceDB to Drizzle migration completed successfully!');
  } catch (error) {
    logger.error('LanceDB to Drizzle migration failed:', error);
    throw new Error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
