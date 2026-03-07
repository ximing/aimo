#!/usr/bin/env tsx

/**
 * Data Integrity Validation Script
 *
 * Validates referential integrity before/after removing foreign key constraints.
 * Checks for orphaned records and reports issues.
 *
 * Usage:
 *   pnpm tsx scripts/validate-data-integrity.ts [--mode=pre|post]
 *
 * Exit codes:
 *   0 - No critical issues found
 *   1 - Critical issues detected
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq, and, sql, inArray } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import * as schema from '../src/db/schema/index.js';

const {
  users,
  memos,
  memoRelations,
  attachments,
  aiConversations,
  aiMessages,
  categories,
  tags,
  dailyRecommendations,
  pushRules,
} = schema;

interface ValidationIssue {
  table: string;
  issueType: string;
  count: number;
  sampleIds: string[];
  severity: 'critical' | 'warning';
}

interface ValidationResult {
  timestamp: string;
  mode: 'pre-deployment' | 'post-deployment';
  issues: ValidationIssue[];
  summary: {
    totalIssues: number;
    criticalIssues: number;
    warningIssues: number;
  };
}

// Parse CLI arguments
const args = process.argv.slice(2);
const modeArg = args.find((arg) => arg.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=')[1] : 'pre';

if (!['pre', 'post'].includes(mode)) {
  console.error('Invalid mode. Use --mode=pre or --mode=post');
  process.exit(1);
}

const validationMode = mode === 'pre' ? 'pre-deployment' : 'post-deployment';

async function main() {
  console.log(`\n🔍 Starting data integrity validation (${validationMode} mode)...\n`);

  // Load database config from environment
  const dbConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'aimo',
  };

  console.log(`📊 Connecting to database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  // Create connection pool
  const pool = mysql.createPool({
    ...dbConfig,
    connectionLimit: 5,
    waitForConnections: true,
  });

  const db = drizzle(pool, { schema, mode: 'default' });

  const issues: ValidationIssue[] = [];

  try {
    // 1. Check for memos with non-existent users
    console.log('✓ Checking memos with non-existent users...');
    const memosWithInvalidUsers = await db
      .select({
        memoId: memos.memoId,
        uid: memos.uid,
      })
      .from(memos)
      .leftJoin(users, eq(memos.uid, users.uid))
      .where(and(eq(memos.deletedAt, 0), sql`${users.uid} IS NULL`));

    if (memosWithInvalidUsers.length > 0) {
      issues.push({
        table: 'memos',
        issueType: 'Non-existent user reference',
        count: memosWithInvalidUsers.length,
        sampleIds: memosWithInvalidUsers.slice(0, 5).map((m) => m.memoId),
        severity: 'critical',
      });
      console.log(`  ⚠️  Found ${memosWithInvalidUsers.length} memos with invalid users`);
    } else {
      console.log(`  ✅ No issues found`);
    }

    // 2. Check for memo_relations with non-existent or soft-deleted memos
    console.log('✓ Checking memo_relations with invalid source memos...');
    const relationsWithInvalidSource = await db
      .select({
        relationId: memoRelations.relationId,
        sourceMemoId: memoRelations.sourceMemoId,
      })
      .from(memoRelations)
      .leftJoin(memos, eq(memoRelations.sourceMemoId, memos.memoId))
      .where(
        and(
          eq(memoRelations.deletedAt, 0),
          sql`(${memos.memoId} IS NULL OR ${memos.deletedAt} > 0)`
        )
      );

    if (relationsWithInvalidSource.length > 0) {
      issues.push({
        table: 'memo_relations',
        issueType: 'Non-existent or deleted source memo',
        count: relationsWithInvalidSource.length,
        sampleIds: relationsWithInvalidSource.slice(0, 5).map((r) => r.relationId),
        severity: 'critical',
      });
      console.log(
        `  ⚠️  Found ${relationsWithInvalidSource.length} relations with invalid source memos`
      );
    } else {
      console.log(`  ✅ No issues found`);
    }

    console.log('✓ Checking memo_relations with invalid target memos...');
    const relationsWithInvalidTarget = await db
      .select({
        relationId: memoRelations.relationId,
        targetMemoId: memoRelations.targetMemoId,
      })
      .from(memoRelations)
      .leftJoin(memos, eq(memoRelations.targetMemoId, memos.memoId))
      .where(
        and(
          eq(memoRelations.deletedAt, 0),
          sql`(${memos.memoId} IS NULL OR ${memos.deletedAt} > 0)`
        )
      );

    if (relationsWithInvalidTarget.length > 0) {
      issues.push({
        table: 'memo_relations',
        issueType: 'Non-existent or deleted target memo',
        count: relationsWithInvalidTarget.length,
        sampleIds: relationsWithInvalidTarget.slice(0, 5).map((r) => r.relationId),
        severity: 'critical',
      });
      console.log(
        `  ⚠️  Found ${relationsWithInvalidTarget.length} relations with invalid target memos`
      );
    } else {
      console.log(`  ✅ No issues found`);
    }

    // 3. Check for attachments with non-existent users
    console.log('✓ Checking attachments with non-existent users...');
    const attachmentsWithInvalidUsers = await db
      .select({
        attachmentId: attachments.attachmentId,
        uid: attachments.uid,
      })
      .from(attachments)
      .leftJoin(users, eq(attachments.uid, users.uid))
      .where(and(eq(attachments.deletedAt, 0), sql`${users.uid} IS NULL`));

    if (attachmentsWithInvalidUsers.length > 0) {
      issues.push({
        table: 'attachments',
        issueType: 'Non-existent user reference',
        count: attachmentsWithInvalidUsers.length,
        sampleIds: attachmentsWithInvalidUsers.slice(0, 5).map((a) => a.attachmentId),
        severity: 'critical',
      });
      console.log(
        `  ⚠️  Found ${attachmentsWithInvalidUsers.length} attachments with invalid users`
      );
    } else {
      console.log(`  ✅ No issues found`);
    }

    // 4. Check for ai_messages with non-existent or soft-deleted conversations
    console.log('✓ Checking ai_messages with invalid conversations...');
    const messagesWithInvalidConversations = await db
      .select({
        messageId: aiMessages.messageId,
        conversationId: aiMessages.conversationId,
      })
      .from(aiMessages)
      .leftJoin(aiConversations, eq(aiMessages.conversationId, aiConversations.conversationId))
      .where(
        and(
          eq(aiMessages.deletedAt, 0),
          sql`(${aiConversations.conversationId} IS NULL OR ${aiConversations.deletedAt} > 0)`
        )
      );

    if (messagesWithInvalidConversations.length > 0) {
      issues.push({
        table: 'ai_messages',
        issueType: 'Non-existent or deleted conversation',
        count: messagesWithInvalidConversations.length,
        sampleIds: messagesWithInvalidConversations.slice(0, 5).map((m) => m.messageId),
        severity: 'critical',
      });
      console.log(
        `  ⚠️  Found ${messagesWithInvalidConversations.length} messages with invalid conversations`
      );
    } else {
      console.log(`  ✅ No issues found`);
    }

    // 5. Check for categories with non-existent users
    console.log('✓ Checking categories with non-existent users...');
    const categoriesWithInvalidUsers = await db
      .select({
        categoryId: categories.categoryId,
        uid: categories.uid,
      })
      .from(categories)
      .leftJoin(users, eq(categories.uid, users.uid))
      .where(and(eq(categories.deletedAt, 0), sql`${users.uid} IS NULL`));

    if (categoriesWithInvalidUsers.length > 0) {
      issues.push({
        table: 'categories',
        issueType: 'Non-existent user reference',
        count: categoriesWithInvalidUsers.length,
        sampleIds: categoriesWithInvalidUsers.slice(0, 5).map((c) => c.categoryId),
        severity: 'critical',
      });
      console.log(`  ⚠️  Found ${categoriesWithInvalidUsers.length} categories with invalid users`);
    } else {
      console.log(`  ✅ No issues found`);
    }

    // 6. Check for tags with non-existent users
    console.log('✓ Checking tags with non-existent users...');
    const tagsWithInvalidUsers = await db
      .select({
        tagId: tags.tagId,
        uid: tags.uid,
      })
      .from(tags)
      .leftJoin(users, eq(tags.uid, users.uid))
      .where(and(eq(tags.deletedAt, 0), sql`${users.uid} IS NULL`));

    if (tagsWithInvalidUsers.length > 0) {
      issues.push({
        table: 'tags',
        issueType: 'Non-existent user reference',
        count: tagsWithInvalidUsers.length,
        sampleIds: tagsWithInvalidUsers.slice(0, 5).map((t) => t.tagId),
        severity: 'critical',
      });
      console.log(`  ⚠️  Found ${tagsWithInvalidUsers.length} tags with invalid users`);
    } else {
      console.log(`  ✅ No issues found`);
    }

    // 7. Check for daily_recommendations with non-existent users
    console.log('✓ Checking daily_recommendations with non-existent users...');
    const recommendationsWithInvalidUsers = await db
      .select({
        recommendationId: dailyRecommendations.recommendationId,
        uid: dailyRecommendations.uid,
      })
      .from(dailyRecommendations)
      .leftJoin(users, eq(dailyRecommendations.uid, users.uid))
      .where(and(eq(dailyRecommendations.deletedAt, 0), sql`${users.uid} IS NULL`));

    if (recommendationsWithInvalidUsers.length > 0) {
      issues.push({
        table: 'daily_recommendations',
        issueType: 'Non-existent user reference',
        count: recommendationsWithInvalidUsers.length,
        sampleIds: recommendationsWithInvalidUsers.slice(0, 5).map((r) => r.recommendationId),
        severity: 'critical',
      });
      console.log(
        `  ⚠️  Found ${recommendationsWithInvalidUsers.length} recommendations with invalid users`
      );
    } else {
      console.log(`  ✅ No issues found`);
    }

    // 8. Check for push_rules with non-existent users
    console.log('✓ Checking push_rules with non-existent users...');
    const pushRulesWithInvalidUsers = await db
      .select({
        id: pushRules.id,
        uid: pushRules.uid,
      })
      .from(pushRules)
      .leftJoin(users, eq(pushRules.uid, users.uid))
      .where(and(eq(pushRules.deletedAt, 0), sql`${users.uid} IS NULL`));

    if (pushRulesWithInvalidUsers.length > 0) {
      issues.push({
        table: 'push_rules',
        issueType: 'Non-existent user reference',
        count: pushRulesWithInvalidUsers.length,
        sampleIds: pushRulesWithInvalidUsers.slice(0, 5).map((p) => p.id),
        severity: 'critical',
      });
      console.log(`  ⚠️  Found ${pushRulesWithInvalidUsers.length} push rules with invalid users`);
    } else {
      console.log(`  ✅ No issues found`);
    }

    // 9. Check for ai_conversations with non-existent users
    console.log('✓ Checking ai_conversations with non-existent users...');
    const conversationsWithInvalidUsers = await db
      .select({
        conversationId: aiConversations.conversationId,
        uid: aiConversations.uid,
      })
      .from(aiConversations)
      .leftJoin(users, eq(aiConversations.uid, users.uid))
      .where(and(eq(aiConversations.deletedAt, 0), sql`${users.uid} IS NULL`));

    if (conversationsWithInvalidUsers.length > 0) {
      issues.push({
        table: 'ai_conversations',
        issueType: 'Non-existent user reference',
        count: conversationsWithInvalidUsers.length,
        sampleIds: conversationsWithInvalidUsers.slice(0, 5).map((c) => c.conversationId),
        severity: 'critical',
      });
      console.log(
        `  ⚠️  Found ${conversationsWithInvalidUsers.length} conversations with invalid users`
      );
    } else {
      console.log(`  ✅ No issues found`);
    }

    // 10. Check for memos with invalid categoryId references
    console.log('✓ Checking memos with invalid category references...');
    const memosWithInvalidCategories = await db
      .select({
        memoId: memos.memoId,
        categoryId: memos.categoryId,
      })
      .from(memos)
      .leftJoin(categories, eq(memos.categoryId, categories.categoryId))
      .where(
        and(
          eq(memos.deletedAt, 0),
          sql`${memos.categoryId} IS NOT NULL`,
          sql`(${categories.categoryId} IS NULL OR ${categories.deletedAt} > 0)`
        )
      );

    if (memosWithInvalidCategories.length > 0) {
      issues.push({
        table: 'memos',
        issueType: 'Non-existent or deleted category reference',
        count: memosWithInvalidCategories.length,
        sampleIds: memosWithInvalidCategories.slice(0, 5).map((m) => m.memoId),
        severity: 'warning',
      });
      console.log(`  ⚠️  Found ${memosWithInvalidCategories.length} memos with invalid categories`);
    } else {
      console.log(`  ✅ No issues found`);
    }

    // 11. Check for memos with invalid tagIds in JSON array
    console.log('✓ Checking memos with invalid tag references...');
    const memosWithTags = await db
      .select({
        memoId: memos.memoId,
        tagIds: memos.tagIds,
      })
      .from(memos)
      .where(and(eq(memos.deletedAt, 0), sql`${memos.tagIds} IS NOT NULL`));

    const allTagIds = await db
      .select({ tagId: tags.tagId })
      .from(tags)
      .where(eq(tags.deletedAt, 0));

    const validTagIdSet = new Set(allTagIds.map((t) => t.tagId));
    const memosWithInvalidTags: { memoId: string; invalidTagIds: string[] }[] = [];

    for (const memo of memosWithTags) {
      if (memo.tagIds && Array.isArray(memo.tagIds)) {
        const invalidTags = memo.tagIds.filter((tagId) => !validTagIdSet.has(tagId));
        if (invalidTags.length > 0) {
          memosWithInvalidTags.push({
            memoId: memo.memoId,
            invalidTagIds: invalidTags,
          });
        }
      }
    }

    if (memosWithInvalidTags.length > 0) {
      issues.push({
        table: 'memos',
        issueType: 'Invalid tag IDs in tagIds array',
        count: memosWithInvalidTags.length,
        sampleIds: memosWithInvalidTags.slice(0, 5).map((m) => m.memoId),
        severity: 'warning',
      });
      console.log(`  ⚠️  Found ${memosWithInvalidTags.length} memos with invalid tag references`);
    } else {
      console.log(`  ✅ No issues found`);
    }

    // Generate summary
    const criticalIssues = issues.filter((i) => i.severity === 'critical');
    const warningIssues = issues.filter((i) => i.severity === 'warning');

    const result: ValidationResult = {
      timestamp: new Date().toISOString(),
      mode: validationMode,
      issues,
      summary: {
        totalIssues: issues.length,
        criticalIssues: criticalIssues.length,
        warningIssues: warningIssues.length,
      },
    };

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Mode: ${validationMode}`);
    console.log(`Total Issues: ${result.summary.totalIssues}`);
    console.log(`  Critical: ${result.summary.criticalIssues}`);
    console.log(`  Warnings: ${result.summary.warningIssues}`);

    if (issues.length > 0) {
      console.log('\n🔍 ISSUE DETAILS:');
      for (const issue of issues) {
        console.log(`\n  [${issue.severity.toUpperCase()}] ${issue.table}`);
        console.log(`    Type: ${issue.issueType}`);
        console.log(`    Count: ${issue.count}`);
        console.log(`    Sample IDs: ${issue.sampleIds.join(', ')}`);
      }
    }

    // Save results to JSON file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(process.cwd(), 'logs', 'validation');
    const outputFile = path.join(outputDir, `validation-${mode}-${timestamp}.json`);

    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`\n💾 Results saved to: ${outputFile}`);

    // Exit with appropriate code
    if (criticalIssues.length > 0) {
      console.log('\n❌ VALIDATION FAILED: Critical issues detected');
      console.log('Please fix these issues before proceeding with deployment.');
      await pool.end();
      process.exit(1);
    } else if (warningIssues.length > 0) {
      console.log('\n⚠️  VALIDATION PASSED with warnings');
      console.log('Review warnings before proceeding with deployment.');
      await pool.end();
      process.exit(0);
    } else {
      console.log('\n✅ VALIDATION PASSED: No issues detected');
      await pool.end();
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Validation error:', error);
    await pool.end();
    process.exit(1);
  }
}

main();
