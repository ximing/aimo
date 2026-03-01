#!/usr/bin/env tsx
/**
 * One-time data migration script from LanceDB to MySQL
 *
 * This script migrates existing data from LanceDB (scalar + vector) to the new hybrid architecture:
 * - Scalar data → MySQL (via Drizzle ORM)
 * - Vector data → LanceDB vector-only tables (memo_vectors, attachment_vectors)
 *
 * Usage:
 *   pnpm migrate:data              # Run full migration
 *   pnpm migrate:data --dry-run    # Preview migration without writing
 *   pnpm migrate:data --table=users # Migrate specific table only
 *
 * Safety:
 * - Always backup your data before running this script
 * - Use --dry-run first to preview changes
 * - Script is idempotent - can be run multiple times safely
 */

import 'reflect-metadata';
import '../config/env.js';
import { initializeDatabase, getDatabase, closeDatabase } from '../db/connection.js';
import { LanceDbService } from '../sources/lancedb.js';
import { logger } from '../utils/logger.js';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/index.js';

interface MigrationOptions {
  dryRun: boolean;
  table?: string;
  batchSize: number;
  retryAttempts: number;
}

interface MigrationStats {
  table: string;
  total: number;
  migrated: number;
  failed: number;
  skipped: number;
}

class DataMigration {
  private db: any;
  private lanceDb!: LanceDbService;
  private options: MigrationOptions;
  private stats: Map<string, MigrationStats> = new Map();

  constructor(options: MigrationOptions) {
    this.options = options;
  }

  async initialize() {
    logger.info('🔄 Initializing data migration...');

    if (this.options.dryRun) {
      logger.warn('⚠️  DRY RUN MODE - No data will be written');
    }

    // Initialize database connections
    initializeDatabase();
    this.db = getDatabase();

    this.lanceDb = new LanceDbService();
    await this.lanceDb.init();

    logger.info('✅ Database connections initialized\n');
  }

  private initStats(table: string, total: number) {
    this.stats.set(table, {
      table,
      total,
      migrated: 0,
      failed: 0,
      skipped: 0,
    });
  }

  private updateStats(table: string, type: 'migrated' | 'failed' | 'skipped', count: number = 1) {
    const stats = this.stats.get(table);
    if (stats) {
      stats[type] += count;
    }
  }

  private logProgress(table: string) {
    const stats = this.stats.get(table);
    if (stats) {
      const percent = Math.round((stats.migrated / stats.total) * 100);
      logger.info(
        `Progress: ${stats.migrated}/${stats.total} (${percent}%) - Failed: ${stats.failed}, Skipped: ${stats.skipped}`
      );
    }
  }

  /**
   * Migrate users table from LanceDB to MySQL
   */
  async migrateUsers(): Promise<void> {
    logger.info('📦 Migrating users table...');

    try {
      const usersTable = await this.lanceDb.openTable('users');
      const users = await usersTable.query().toArray();

      this.initStats('users', users.length);
      logger.info(`Found ${users.length} users to migrate`);

      for (const user of users) {
        try {
          // Check if user already exists
          const existing = await this.db
            .select()
            .from(schema.users)
            .where(eq(schema.users.uid, user.uid))
            .limit(1);

          if (existing.length > 0) {
            this.updateStats('users', 'skipped');
            continue;
          }

          if (!this.options.dryRun) {
            await this.db.insert(schema.users).values({
              uid: user.uid,
              email: user.email || undefined,
              phone: user.phone || undefined,
              password: user.password,
              salt: user.salt,
              nickname: user.nickname || undefined,
              avatar: user.avatar || undefined,
              status: user.status ?? 1,
              createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
              updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
            });
          }

          this.updateStats('users', 'migrated');

          if (this.stats.get('users')!.migrated % 100 === 0) {
            this.logProgress('users');
          }
        } catch (error) {
          logger.error(`Failed to migrate user ${user.uid}:`, error);
          this.updateStats('users', 'failed');
        }
      }

      this.logProgress('users');
      logger.info('✅ Users migration complete\n');
    } catch (error) {
      logger.error('Failed to migrate users table:', error);
      throw error;
    }
  }

  /**
   * Migrate categories table from LanceDB to MySQL
   */
  async migrateCategories(): Promise<void> {
    logger.info('📦 Migrating categories table...');

    try {
      const categoriesTable = await this.lanceDb.openTable('categories');
      const categories = await categoriesTable.query().toArray();

      this.initStats('categories', categories.length);
      logger.info(`Found ${categories.length} categories to migrate`);

      for (const category of categories) {
        try {
          // Check if category already exists
          const existing = await this.db
            .select()
            .from(schema.categories)
            .where(eq(schema.categories.categoryId, category.categoryId))
            .limit(1);

          if (existing.length > 0) {
            this.updateStats('categories', 'skipped');
            continue;
          }

          if (!this.options.dryRun) {
            await this.db.insert(schema.categories).values({
              categoryId: category.categoryId,
              uid: category.uid,
              name: category.name,
              color: category.color || undefined,
              createdAt: category.createdAt ? new Date(category.createdAt) : new Date(),
              updatedAt: category.updatedAt ? new Date(category.updatedAt) : new Date(),
            });
          }

          this.updateStats('categories', 'migrated');
        } catch (error) {
          logger.error(`Failed to migrate category ${category.categoryId}:`, error);
          this.updateStats('categories', 'failed');
        }
      }

      this.logProgress('categories');
      logger.info('✅ Categories migration complete\n');
    } catch (error) {
      logger.error('Failed to migrate categories table:', error);
      throw error;
    }
  }

  /**
   * Migrate tags table from LanceDB to MySQL
   */
  async migrateTags(): Promise<void> {
    logger.info('📦 Migrating tags table...');

    try {
      const tagsTable = await this.lanceDb.openTable('tags');
      const tags = await tagsTable.query().toArray();

      this.initStats('tags', tags.length);
      logger.info(`Found ${tags.length} tags to migrate`);

      for (const tag of tags) {
        try {
          // Check if tag already exists
          const existing = await this.db
            .select()
            .from(schema.tags)
            .where(eq(schema.tags.tagId, tag.tagId))
            .limit(1);

          if (existing.length > 0) {
            this.updateStats('tags', 'skipped');
            continue;
          }

          if (!this.options.dryRun) {
            await this.db.insert(schema.tags).values({
              tagId: tag.tagId,
              uid: tag.uid,
              name: tag.name,
              color: tag.color || undefined,
              usageCount: tag.usageCount ?? 0,
              createdAt: tag.createdAt ? new Date(tag.createdAt) : new Date(),
              updatedAt: tag.updatedAt ? new Date(tag.updatedAt) : new Date(),
            });
          }

          this.updateStats('tags', 'migrated');
        } catch (error) {
          logger.error(`Failed to migrate tag ${tag.tagId}:`, error);
          this.updateStats('tags', 'failed');
        }
      }

      this.logProgress('tags');
      logger.info('✅ Tags migration complete\n');
    } catch (error) {
      logger.error('Failed to migrate tags table:', error);
      throw error;
    }
  }

  /**
   * Migrate memos table: scalar fields to MySQL, embeddings to LanceDB memo_vectors
   */
  async migrateMemos(): Promise<void> {
    logger.info('📦 Migrating memos table...');

    try {
      const memosTable = await this.lanceDb.openTable('memos');
      const memos = await memosTable.query().toArray();

      this.initStats('memos', memos.length);
      logger.info(`Found ${memos.length} memos to migrate`);

      for (const memo of memos) {
        try {
          // Check if memo already exists in MySQL
          const existing = await this.db
            .select()
            .from(schema.memos)
            .where(eq(schema.memos.memoId, memo.memoId))
            .limit(1);

          if (existing.length > 0) {
            this.updateStats('memos', 'skipped');
            continue;
          }

          if (!this.options.dryRun) {
            // Insert scalar fields to MySQL
            await this.db.insert(schema.memos).values({
              memoId: memo.memoId,
              uid: memo.uid,
              categoryId: memo.categoryId || undefined,
              content: memo.content,
              type: memo.type || 'text',
              source: memo.source || undefined,
              attachments: memo.attachments || undefined,
              tagIds: memo.tagIds || undefined,
              isPublic: memo.isPublic ?? false,
              createdAt: memo.createdAt ? new Date(memo.createdAt) : new Date(),
              updatedAt: memo.updatedAt ? new Date(memo.updatedAt) : new Date(),
            });

            // Insert embedding to LanceDB memo_vectors table
            if (memo.embedding && Array.isArray(memo.embedding)) {
              const vectorsTable = await this.lanceDb.openTable('memo_vectors');
              await vectorsTable.add([
                {
                  memoId: memo.memoId,
                  embedding: memo.embedding,
                },
              ]);
            }
          }

          this.updateStats('memos', 'migrated');

          if (this.stats.get('memos')!.migrated % 100 === 0) {
            this.logProgress('memos');
          }
        } catch (error) {
          logger.error(`Failed to migrate memo ${memo.memoId}:`, error);
          this.updateStats('memos', 'failed');
        }
      }

      this.logProgress('memos');
      logger.info('✅ Memos migration complete\n');
    } catch (error) {
      logger.error('Failed to migrate memos table:', error);
      throw error;
    }
  }

  /**
   * Migrate memo_relations table from LanceDB to MySQL
   */
  async migrateMemoRelations(): Promise<void> {
    logger.info('📦 Migrating memo_relations table...');

    try {
      const relationsTable = await this.lanceDb.openTable('memo_relations');
      const relations = await relationsTable.query().toArray();

      this.initStats('memo_relations', relations.length);
      logger.info(`Found ${relations.length} memo relations to migrate`);

      for (const relation of relations) {
        try {
          // Check if relation already exists
          const existing = await this.db
            .select()
            .from(schema.memoRelations)
            .where(eq(schema.memoRelations.relationId, relation.relationId))
            .limit(1);

          if (existing.length > 0) {
            this.updateStats('memo_relations', 'skipped');
            continue;
          }

          if (!this.options.dryRun) {
            await this.db.insert(schema.memoRelations).values({
              relationId: relation.relationId,
              uid: relation.uid,
              sourceMemoId: relation.sourceMemoId,
              targetMemoId: relation.targetMemoId,
              createdAt: relation.createdAt ? new Date(relation.createdAt) : new Date(),
            });
          }

          this.updateStats('memo_relations', 'migrated');
        } catch (error) {
          logger.error(`Failed to migrate relation ${relation.relationId}:`, error);
          this.updateStats('memo_relations', 'failed');
        }
      }

      this.logProgress('memo_relations');
      logger.info('✅ Memo relations migration complete\n');
    } catch (error) {
      logger.error('Failed to migrate memo_relations table:', error);
      throw error;
    }
  }

  /**
   * Migrate attachments table: scalar fields to MySQL, embeddings to LanceDB attachment_vectors
   */
  async migrateAttachments(): Promise<void> {
    logger.info('📦 Migrating attachments table...');

    try {
      const attachmentsTable = await this.lanceDb.openTable('attachments');
      const attachments = await attachmentsTable.query().toArray();

      this.initStats('attachments', attachments.length);
      logger.info(`Found ${attachments.length} attachments to migrate`);

      for (const attachment of attachments) {
        try {
          // Check if attachment already exists
          const existing = await this.db
            .select()
            .from(schema.attachments)
            .where(eq(schema.attachments.attachmentId, attachment.attachmentId))
            .limit(1);

          if (existing.length > 0) {
            this.updateStats('attachments', 'skipped');
            continue;
          }

          if (!this.options.dryRun) {
            // Insert scalar fields to MySQL
            await this.db.insert(schema.attachments).values({
              attachmentId: attachment.attachmentId,
              uid: attachment.uid,
              filename: attachment.filename,
              type: attachment.type,
              size: attachment.size,
              storageType: attachment.storageType,
              path: attachment.path,
              bucket: attachment.bucket || undefined,
              prefix: attachment.prefix || undefined,
              endpoint: attachment.endpoint || undefined,
              region: attachment.region || undefined,
              isPublicBucket: attachment.isPublicBucket || undefined,
              multimodalModelHash: attachment.multimodalModelHash || undefined,
              properties: attachment.properties || undefined,
              createdAt: attachment.createdAt ? new Date(attachment.createdAt) : new Date(),
            });

            // Insert embedding to LanceDB attachment_vectors table
            if (attachment.multimodalEmbedding && Array.isArray(attachment.multimodalEmbedding)) {
              const vectorsTable = await this.lanceDb.openTable('attachment_vectors');
              await vectorsTable.add([
                {
                  attachmentId: attachment.attachmentId,
                  multimodalEmbedding: attachment.multimodalEmbedding,
                },
              ]);
            }
          }

          this.updateStats('attachments', 'migrated');
        } catch (error) {
          logger.error(`Failed to migrate attachment ${attachment.attachmentId}:`, error);
          this.updateStats('attachments', 'failed');
        }
      }

      this.logProgress('attachments');
      logger.info('✅ Attachments migration complete\n');
    } catch (error) {
      logger.error('Failed to migrate attachments table:', error);
      throw error;
    }
  }

  /**
   * Migrate ai_conversations table from LanceDB to MySQL
   */
  async migrateAIConversations(): Promise<void> {
    logger.info('📦 Migrating ai_conversations table...');

    try {
      const conversationsTable = await this.lanceDb.openTable('ai_conversations');
      const conversations = await conversationsTable.query().toArray();

      this.initStats('ai_conversations', conversations.length);
      logger.info(`Found ${conversations.length} AI conversations to migrate`);

      for (const conversation of conversations) {
        try {
          // Check if conversation already exists
          const existing = await this.db
            .select()
            .from(schema.aiConversations)
            .where(eq(schema.aiConversations.conversationId, conversation.conversationId))
            .limit(1);

          if (existing.length > 0) {
            this.updateStats('ai_conversations', 'skipped');
            continue;
          }

          if (!this.options.dryRun) {
            await this.db.insert(schema.aiConversations).values({
              conversationId: conversation.conversationId,
              uid: conversation.uid,
              title: conversation.title,
              createdAt: conversation.createdAt ? new Date(conversation.createdAt) : new Date(),
              updatedAt: conversation.updatedAt ? new Date(conversation.updatedAt) : new Date(),
            });
          }

          this.updateStats('ai_conversations', 'migrated');
        } catch (error) {
          logger.error(`Failed to migrate conversation ${conversation.conversationId}:`, error);
          this.updateStats('ai_conversations', 'failed');
        }
      }

      this.logProgress('ai_conversations');
      logger.info('✅ AI conversations migration complete\n');
    } catch (error) {
      logger.error('Failed to migrate ai_conversations table:', error);
      throw error;
    }
  }

  /**
   * Migrate ai_messages table from LanceDB to MySQL
   */
  async migrateAIMessages(): Promise<void> {
    logger.info('📦 Migrating ai_messages table...');

    try {
      const messagesTable = await this.lanceDb.openTable('ai_messages');
      const messages = await messagesTable.query().toArray();

      this.initStats('ai_messages', messages.length);
      logger.info(`Found ${messages.length} AI messages to migrate`);

      for (const message of messages) {
        try {
          // Check if message already exists
          const existing = await this.db
            .select()
            .from(schema.aiMessages)
            .where(eq(schema.aiMessages.messageId, message.messageId))
            .limit(1);

          if (existing.length > 0) {
            this.updateStats('ai_messages', 'skipped');
            continue;
          }

          if (!this.options.dryRun) {
            await this.db.insert(schema.aiMessages).values({
              messageId: message.messageId,
              conversationId: message.conversationId,
              role: message.role,
              content: message.content,
              sources: message.sources || undefined,
              createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
            });
          }

          this.updateStats('ai_messages', 'migrated');

          if (this.stats.get('ai_messages')!.migrated % 100 === 0) {
            this.logProgress('ai_messages');
          }
        } catch (error) {
          logger.error(`Failed to migrate message ${message.messageId}:`, error);
          this.updateStats('ai_messages', 'failed');
        }
      }

      this.logProgress('ai_messages');
      logger.info('✅ AI messages migration complete\n');
    } catch (error) {
      logger.error('Failed to migrate ai_messages table:', error);
      throw error;
    }
  }

  /**
   * Migrate daily_recommendations table from LanceDB to MySQL
   */
  async migrateDailyRecommendations(): Promise<void> {
    logger.info('📦 Migrating daily_recommendations table...');

    try {
      const recommendationsTable = await this.lanceDb.openTable('daily_recommendations');
      const recommendations = await recommendationsTable.query().toArray();

      this.initStats('daily_recommendations', recommendations.length);
      logger.info(`Found ${recommendations.length} daily recommendations to migrate`);

      for (const recommendation of recommendations) {
        try {
          // Check if recommendation already exists
          const existing = await this.db
            .select()
            .from(schema.dailyRecommendations)
            .where(
              eq(schema.dailyRecommendations.recommendationId, recommendation.recommendationId)
            )
            .limit(1);

          if (existing.length > 0) {
            this.updateStats('daily_recommendations', 'skipped');
            continue;
          }

          if (!this.options.dryRun) {
            await this.db.insert(schema.dailyRecommendations).values({
              recommendationId: recommendation.recommendationId,
              uid: recommendation.uid,
              date: recommendation.date,
              memoIds: recommendation.memoIds,
              createdAt: recommendation.createdAt ? new Date(recommendation.createdAt) : new Date(),
            });
          }

          this.updateStats('daily_recommendations', 'migrated');
        } catch (error) {
          logger.error(
            `Failed to migrate recommendation ${recommendation.recommendationId}:`,
            error
          );
          this.updateStats('daily_recommendations', 'failed');
        }
      }

      this.logProgress('daily_recommendations');
      logger.info('✅ Daily recommendations migration complete\n');
    } catch (error) {
      logger.error('Failed to migrate daily_recommendations table:', error);
      throw error;
    }
  }

  /**
   * Migrate push_rules table from LanceDB to MySQL
   */
  async migratePushRules(): Promise<void> {
    logger.info('📦 Migrating push_rules table...');

    try {
      const pushRulesTable = await this.lanceDb.openTable('push_rules');
      const pushRules = await pushRulesTable.query().toArray();

      this.initStats('push_rules', pushRules.length);
      logger.info(`Found ${pushRules.length} push rules to migrate`);

      for (const rule of pushRules) {
        try {
          // Check if push rule already exists
          const existing = await this.db
            .select()
            .from(schema.pushRules)
            .where(eq(schema.pushRules.id, rule.id))
            .limit(1);

          if (existing.length > 0) {
            this.updateStats('push_rules', 'skipped');
            continue;
          }

          if (!this.options.dryRun) {
            await this.db.insert(schema.pushRules).values({
              id: rule.id,
              uid: rule.uid,
              name: rule.name,
              pushTime: rule.pushTime,
              contentType: rule.contentType,
              channels: rule.channels || undefined,
              enabled: rule.enabled ?? 1,
              createdAt: rule.createdAt ? new Date(rule.createdAt) : new Date(),
              updatedAt: rule.updatedAt ? new Date(rule.updatedAt) : new Date(),
            });
          }

          this.updateStats('push_rules', 'migrated');
        } catch (error) {
          logger.error(`Failed to migrate push rule ${rule.id}:`, error);
          this.updateStats('push_rules', 'failed');
        }
      }

      this.logProgress('push_rules');
      logger.info('✅ Push rules migration complete\n');
    } catch (error) {
      logger.error('Failed to migrate push_rules table:', error);
      throw error;
    }
  }

  /**
   * Run full migration for all tables
   */
  async runFullMigration(): Promise<void> {
    const tables = [
      { name: 'users', fn: () => this.migrateUsers() },
      { name: 'categories', fn: () => this.migrateCategories() },
      { name: 'tags', fn: () => this.migrateTags() },
      { name: 'memos', fn: () => this.migrateMemos() },
      { name: 'memo_relations', fn: () => this.migrateMemoRelations() },
      { name: 'attachments', fn: () => this.migrateAttachments() },
      { name: 'ai_conversations', fn: () => this.migrateAIConversations() },
      { name: 'ai_messages', fn: () => this.migrateAIMessages() },
      { name: 'daily_recommendations', fn: () => this.migrateDailyRecommendations() },
      { name: 'push_rules', fn: () => this.migratePushRules() },
    ];

    for (const { name, fn } of tables) {
      if (this.options.table && this.options.table !== name) {
        logger.info(`⏭️  Skipping ${name} (not selected)\n`);
        continue;
      }

      let attempts = 0;
      while (attempts < this.options.retryAttempts) {
        try {
          await fn();
          break;
        } catch (error) {
          attempts++;
          if (attempts < this.options.retryAttempts) {
            logger.warn(`Retry attempt ${attempts}/${this.options.retryAttempts} for ${name}`);
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
          } else {
            logger.error(`Failed to migrate ${name} after ${attempts} attempts`);
            throw error;
          }
        }
      }
    }
  }

  /**
   * Print migration summary
   */
  printSummary(): void {
    logger.info('\n═══════════════════════════════════════════');
    logger.info('           MIGRATION SUMMARY');
    logger.info('═══════════════════════════════════════════\n');

    let totalMigrated = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    for (const [table, stats] of this.stats.entries()) {
      logger.info(`📊 ${table}:`);
      logger.info(`   Total:    ${stats.total}`);
      logger.info(`   Migrated: ${stats.migrated}`);
      logger.info(`   Failed:   ${stats.failed}`);
      logger.info(`   Skipped:  ${stats.skipped}\n`);

      totalMigrated += stats.migrated;
      totalFailed += stats.failed;
      totalSkipped += stats.skipped;
    }

    logger.info('═══════════════════════════════════════════');
    logger.info(`Total Migrated: ${totalMigrated}`);
    logger.info(`Total Failed:   ${totalFailed}`);
    logger.info(`Total Skipped:  ${totalSkipped}`);
    logger.info('═══════════════════════════════════════════\n');

    if (this.options.dryRun) {
      logger.warn('⚠️  This was a DRY RUN - no data was written');
    }
  }

  async cleanup() {
    logger.info('🧹 Cleaning up connections...');
    await this.lanceDb.close();
    await closeDatabase();
    logger.info('✅ Cleanup complete');
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: false,
    table: undefined,
    batchSize: 100,
    retryAttempts: 3,
  };

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--table=')) {
      options.table = arg.split('=')[1];
    } else if (arg.startsWith('--batch-size=')) {
      options.batchSize = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--retry=')) {
      options.retryAttempts = parseInt(arg.split('=')[1], 10);
    }
  }

  return options;
}

/**
 * Main entry point
 */
async function main() {
  const options = parseArgs();

  logger.info('╔═══════════════════════════════════════════╗');
  logger.info('║   LanceDB to MySQL Data Migration Tool   ║');
  logger.info('╚═══════════════════════════════════════════╝\n');

  logger.info('Options:', options);
  logger.info('');

  const migration = new DataMigration(options);

  try {
    await migration.initialize();
    await migration.runFullMigration();
    migration.printSummary();

    logger.info('✅ Migration completed successfully!\n');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    migration.printSummary();
    process.exit(1);
  } finally {
    await migration.cleanup();
  }
}

main();
