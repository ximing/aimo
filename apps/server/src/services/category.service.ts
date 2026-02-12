import { Service } from 'typedi';
import { LanceDbService } from '../sources/lancedb.js';
import type { CategoryDto, CreateCategoryDto, UpdateCategoryDto } from '@aimo/dto';
import type { CategoryRecord } from '../models/db/schema.js';
import { generateTypeId } from '../utils/id.js';
import { OBJECT_TYPE } from '../models/constant/type.js';

@Service()
export class CategoryService {
  constructor(private lanceDb: LanceDbService) {}

  /**
   * Create a new category for a user
   */
  async createCategory(uid: string, data: CreateCategoryDto): Promise<CategoryDto> {
    try {
      if (!data.name || data.name.trim().length === 0) {
        throw new Error('Category name cannot be empty');
      }

      const categoryId = generateTypeId(OBJECT_TYPE.CATEGORY);
      const now = Date.now();

      const category: CategoryRecord = {
        categoryId,
        uid,
        name: data.name.trim(),
        color: data.color?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };

      const table = await this.lanceDb.openTable('categories');
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
      const table = await this.lanceDb.openTable('categories');

      const results = await table.query().where(`uid = '${uid}'`).toArray();

      // Sort by createdAt in memory
      results.sort((a: any, b: any) => a.createdAt - b.createdAt);

      return results.map((record) => this.toCategoryDto(record as CategoryRecord));
    } catch (error) {
      console.error('Failed to get categories:', error);
      throw error;
    }
  }

  /**
   * Get a category by ID
   */
  async getCategoryById(categoryId: string, uid: string): Promise<CategoryDto | null> {
    try {
      const table = await this.lanceDb.openTable('categories');

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
      const table = await this.lanceDb.openTable('categories');

      // Get existing category
      const category = await this.getCategoryById(categoryId, uid);
      if (!category) {
        return null;
      }

      // Update fields
      const updatedRecord: CategoryRecord = {
        categoryId: category.categoryId,
        uid: category.uid,
        name: data.name !== undefined ? data.name.trim() : category.name,
        color:
          data.color === null
            ? undefined
            : data.color !== undefined
              ? data.color.trim()
              : category.color,
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
      const table = await this.lanceDb.openTable('categories');

      // Check if category exists
      const category = await this.getCategoryById(categoryId, uid);
      if (!category) {
        return false;
      }

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
