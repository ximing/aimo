/**
 * Migration v4: Add "日记" category for existing users
 * 为已有存量用户添加默认的"日记"分类
 */

import type { Connection } from '@lancedb/lancedb';
import type { Migration } from '../types.js';
import { generateTypeId } from '../../utils/id.js';
import { OBJECT_TYPE } from '../../models/constant/type.js';

/**
 * Migration to add "日记" category for all existing users
 * 新用户注册时会在 UserService 中自动创建"日记"分类
 * 此迁移用于为存量用户添加该分类
 */
export const addDiaryCategoryMigration: Migration = {
  version: 4,
  tableName: 'categories',
  description: 'Add "日记" category for existing users',
  up: async (connection: Connection) => {
    const categoriesTable = await connection.openTable('categories');
    const usersTable = await connection.openTable('users');

    // Get all existing users
    const users = await usersTable.query().toArray();
    console.log(`Found ${users.length} existing users`);

    const diaryCategoryName = '日记';
    let createdCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      const uid = user.uid;

      // Check if user already has "日记" category (case-insensitive)
      const userCategories = await categoriesTable
        .query()
        .where(`uid = '${uid}'`)
        .toArray();

      const hasDiaryCategory = userCategories.some(
        (cat: any) => cat.name.toLowerCase() === diaryCategoryName.toLowerCase()
      );

      if (hasDiaryCategory) {
        skippedCount++;
        continue;
      }

      // Create "日记" category for user
      const now = Date.now();
      const category = {
        categoryId: generateTypeId(OBJECT_TYPE.CATEGORY),
        uid,
        name: diaryCategoryName,
        color: undefined,
        createdAt: now,
        updatedAt: now,
      };

      await categoriesTable.add([category as unknown as Record<string, unknown>]);
      createdCount++;
    }

    console.log(
      `Migration complete: created ${createdCount} "日记" categories, skipped ${skippedCount} users who already have one`
    );
  },
};