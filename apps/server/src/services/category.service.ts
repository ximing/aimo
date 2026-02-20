import { Service } from 'typedi';

import { OBJECT_TYPE } from '../models/constant/type.js';
import { LanceDbService as LanceDatabaseService } from '../sources/lancedb.js';
import { generateTypeId } from '../utils/id.js';

import type { CategoryRecord } from '../models/db/schema.js';
import type { CategoryDto, CreateCategoryDto, UpdateCategoryDto } from '@aimo/dto';

@Service()
export class CategoryService {
  constructor(private lanceDatabase: LanceDatabaseService) {}

  /**
   * Clear categoryId from all memos that have the specified category
   */
  async clearCategoryFromMemos(uid: string, categoryId: string): Promise<void> {
    try {
      const memosTable = await this.lanceDatabase.openTable('memos');

      // Find all memos with this category
      const results = await memosTable
        .query()
        .where(`uid = '${uid}' AND categoryId = '${categoryId}'`)
        .toArray();

      // Update each memo to set categoryId to null
      for (const memo of results) {
        await memosTable.update({
          where: `memoId = '${memo.memoId}'`,
          values: { categoryId: null },
        });
      }

      console.log(`Cleared category ${categoryId} from ${results.length} memos`);
    } catch (error) {
      console.error('Failed to clear category from memos:', error);
      // Don't throw - allow category deletion even if memo update fails
    }
  }

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
      const now = Date.now();

      const category: CategoryRecord = {
        categoryId,
        uid,
        name: trimmedName,
        color: data.color?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };

      const table = await this.lanceDatabase.openTable('categories');
      await table.add([category as unknown as Record<string, unknown>]);

      return this.toCategoryDto(category);
    } catch (error) {
      console.error('Failed to create category:', error);
      throw error;
    }
  }

  /**
   * Get all categories for a user
   */
  async getCategoriesByUid(uid: string): Promise<CategoryDto[]> {
    try {
      const table = await this.lanceDatabase.openTable('categories');

      const results = await table.query().where(`uid = '${uid}'`).toArray();

      // Sort by name alphabetically (case-insensitive)
      results.sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

      return results.map((record) => this.toCategoryDto(record as CategoryRecord));
    } catch (error) {
      console.error('Failed to get categories:', error);
      throw error;
    }
  }

  /**
   * Get a category by name (case-insensitive)
   */
  async getCategoryByName(uid: string, name: string): Promise<CategoryDto | null> {
    try {
      const table = await this.lanceDatabase.openTable('categories');

      // Query all categories for this user and filter by name (case-insensitive)
      const results = await table.query().where(`uid = '${uid}'`).toArray();

      const normalizedName = name.toLowerCase();
      const matchingCategory = results.find(
        (record: any) => record.name.toLowerCase() === normalizedName
      );

      return matchingCategory ? this.toCategoryDto(matchingCategory as CategoryRecord) : null;
    } catch (error) {
      console.error('Failed to get category by name:', error);
      throw error;
    }
  }

  /**
   * Get a category by ID
   */
  async getCategoryById(categoryId: string, uid: string): Promise<CategoryDto | null> {
    try {
      const table = await this.lanceDatabase.openTable('categories');

      const results = await table
        .query()
        .where(`categoryId = '${categoryId}' AND uid = '${uid}'`)
        .limit(1)
        .toArray();

      if (results.length === 0) {
        return null;
      }

      return this.toCategoryDto(results[0] as CategoryRecord);
    } catch (error) {
      console.error('Failed to get category:', error);
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
      const table = await this.lanceDatabase.openTable('categories');

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

      // Update fields
      const updatedRecord: CategoryRecord = {
        categoryId: category.categoryId,
        uid: category.uid,
        name: data.name === undefined ? category.name : data.name.trim(),
        color:
          data.color === null
            ? undefined
            : (data.color === undefined
              ? category.color
              : data.color.trim()),
        createdAt: category.createdAt,
        updatedAt: Date.now(),
      };

      // Update in database by deleting old and adding new
      await table.delete(`categoryId = '${categoryId}'`).catch(() => {
        // Ignore error if record doesn't exist
      });

      await table.add([updatedRecord as unknown as Record<string, unknown>]);

      return this.toCategoryDto(updatedRecord);
    } catch (error) {
      console.error('Failed to update category:', error);
      throw error;
    }
  }

  /**
   * Delete a category
   * Note: Memos associated with this category will have their categoryId set to null (uncategorized)
   */
  async deleteCategory(categoryId: string, uid: string): Promise<boolean> {
    try {
      const table = await this.lanceDatabase.openTable('categories');

      // Check if category exists
      const category = await this.getCategoryById(categoryId, uid);
      if (!category) {
        return false;
      }

      // Clear categoryId from all memos that have this category
      await this.clearCategoryFromMemos(uid, categoryId);

      // Delete the category
      await table.delete(`categoryId = '${categoryId}'`);

      return true;
    } catch (error) {
      console.error('Failed to delete category:', error);
      throw error;
    }
  }

  /**
   * Convert database record to DTO
   */
  private toCategoryDto(record: CategoryRecord): CategoryDto {
    return {
      categoryId: record.categoryId,
      uid: record.uid,
      name: record.name,
      color: record.color,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
