import { Service } from 'typedi';
import { eq, and, sql } from 'drizzle-orm';

import { OBJECT_TYPE } from '../models/constant/type.js';
import { getDatabase } from '../db/connection.js';
import { categories } from '../db/schema/categories.js';
import { generateTypeId } from '../utils/id.js';
import { logger } from '../utils/logger.js';

import type { CategoryDto, CreateCategoryDto, UpdateCategoryDto } from '@aimo/dto';

@Service()
export class CategoryService {
  constructor() {}

  /**
   * Create a new category for a user
   */
  async createCategory(uid: string, data: CreateCategoryDto): Promise<CategoryDto> {
    try {
      if (!data.name || data.name.trim().length === 0) {
        throw new Error('Category name cannot be empty');
      }

      const trimmedName = data.name.trim();

      // Check for duplicate category name for this user
      const existingCategory = await this.getCategoryByName(uid, trimmedName);
      if (existingCategory) {
        throw new Error('Category with this name already exists');
      }

      const categoryId = generateTypeId(OBJECT_TYPE.CATEGORY);

      const db = getDatabase();
      await db.insert(categories).values({
        categoryId,
        uid,
        name: trimmedName,
        color: data.color?.trim() || null,
      });

      // Fetch the created category to get auto-generated timestamps
      const results = await db
        .select()
        .from(categories)
        .where(eq(categories.categoryId, categoryId))
        .limit(1);

      if (results.length === 0) {
        throw new Error('Failed to retrieve created category');
      }

      return this.toCategoryDto(results[0]);
    } catch (error) {
      logger.error('Failed to create category:', error);
      throw error;
    }
  }

  /**
   * Get all categories for a user
   */
  async getCategoriesByUid(uid: string): Promise<CategoryDto[]> {
    try {
      const db = getDatabase();
      const results = await db.select().from(categories).where(eq(categories.uid, uid));

      // Sort by name alphabetically (case-insensitive)
      results.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

      return results.map((record) => this.toCategoryDto(record));
    } catch (error) {
      logger.error('Failed to get categories:', error);
      throw error;
    }
  }

  /**
   * Get a category by name (case-insensitive)
   */
  async getCategoryByName(uid: string, name: string): Promise<CategoryDto | null> {
    try {
      const db = getDatabase();

      // Use LOWER() for case-insensitive comparison
      const results = await db
        .select()
        .from(categories)
        .where(and(eq(categories.uid, uid), sql`LOWER(${categories.name}) = LOWER(${name})`))
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      return this.toCategoryDto(results[0]);
    } catch (error) {
      logger.error('Failed to get category by name:', error);
      throw error;
    }
  }

  /**
   * Get a category by ID
   */
  async getCategoryById(categoryId: string, uid: string): Promise<CategoryDto | null> {
    try {
      const db = getDatabase();
      const results = await db
        .select()
        .from(categories)
        .where(and(eq(categories.categoryId, categoryId), eq(categories.uid, uid)))
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      return this.toCategoryDto(results[0]);
    } catch (error) {
      logger.error('Failed to get category:', error);
      throw error;
    }
  }

  /**
   * Update a category
   */
  async updateCategory(
    categoryId: string,
    uid: string,
    data: UpdateCategoryDto
  ): Promise<CategoryDto | null> {
    try {
      // Get existing category
      const category = await this.getCategoryById(categoryId, uid);
      if (!category) {
        return null;
      }

      // Check for duplicate name if name is being updated
      if (data.name !== undefined && data.name.trim() !== category.name) {
        const trimmedName = data.name.trim();
        const existingCategory = await this.getCategoryByName(uid, trimmedName);
        if (existingCategory && existingCategory.categoryId !== categoryId) {
          throw new Error('Category with this name already exists');
        }
      }

      // Build updates object (only include fields that are being updated)
      const updates: Partial<typeof categories.$inferInsert> = {};

      if (data.name !== undefined) {
        updates.name = data.name.trim();
      }

      if (data.color !== undefined) {
        updates.color = data.color === null ? null : data.color.trim();
      }

      // Perform update
      const db = getDatabase();
      await db.update(categories).set(updates).where(eq(categories.categoryId, categoryId));

      // Fetch updated category
      const results = await db
        .select()
        .from(categories)
        .where(eq(categories.categoryId, categoryId))
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      return this.toCategoryDto(results[0]);
    } catch (error) {
      logger.error('Failed to update category:', error);
      throw error;
    }
  }

  /**
   * Delete a category
   * Note: Memos associated with this category will have their categoryId set to null automatically
   * via the foreign key constraint (onDelete: 'set null')
   */
  async deleteCategory(categoryId: string, uid: string): Promise<boolean> {
    try {
      // Check if category exists
      const category = await this.getCategoryById(categoryId, uid);
      if (!category) {
        return false;
      }

      // Delete the category (MySQL will automatically set categoryId to null in memos)
      const db = getDatabase();
      await db.delete(categories).where(eq(categories.categoryId, categoryId));

      return true;
    } catch (error) {
      logger.error('Failed to delete category:', error);
      throw error;
    }
  }

  /**
   * Convert database record to DTO
   */
  private toCategoryDto(record: typeof categories.$inferSelect): CategoryDto {
    return {
      categoryId: record.categoryId,
      uid: record.uid,
      name: record.name,
      color: record.color ?? undefined,
      createdAt: record.createdAt.getTime(),
      updatedAt: record.updatedAt.getTime(),
    };
  }
}
