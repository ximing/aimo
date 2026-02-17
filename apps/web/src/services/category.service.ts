import { Service } from '@rabjs/react';
import type { CategoryDto, CreateCategoryDto, UpdateCategoryDto } from '@aimo/dto';
import * as categoryApi from '../api/category';

/**
 * Category Service
 * Manages category data and operations
 */
export class CategoryService extends Service {
  // State
  categories: CategoryDto[] = [];
  loading = false;

  /**
   * Fetch all categories for the current user
   */
  async fetchCategories() {
    this.loading = true;

    try {
      const response = await categoryApi.getCategories();

      if (response.code === 0 && response.data) {
        this.categories = response.data.categories;
        return { success: true, categories: this.categories };
      } else {
        return { success: false, message: 'Failed to fetch categories' };
      }
    } catch (error: unknown) {
      console.error('Fetch categories error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch categories',
      };
    } finally {
      this.loading = false;
    }
  }

  /**
   * Create a new category
   */
  async createCategory(name: string) {
    try {
      const data: CreateCategoryDto = { name };
      const response = await categoryApi.createCategory(data);

      if (response.code === 0 && response.data) {
        // Add the new category to the list
        this.categories = [...this.categories, response.data.category];
        return { success: true, category: response.data.category };
      } else {
        return { success: false, message: 'Failed to create category' };
      }
    } catch (error: unknown) {
      console.error('Create category error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create category',
      };
    }
  }

  /**
   * Update a category
   */
  async updateCategory(categoryId: string, name: string) {
    try {
      const data: UpdateCategoryDto = { name };
      const response = await categoryApi.updateCategory(categoryId, data);

      if (response.code === 0 && response.data) {
        // Update the category in the list
        const index = this.categories.findIndex((c) => c.categoryId === categoryId);
        if (index !== -1) {
          this.categories[index] = response.data.category;
        }
        return { success: true, category: response.data.category };
      } else {
        return { success: false, message: 'Failed to update category' };
      }
    } catch (error: unknown) {
      console.error('Update category error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update category',
      };
    }
  }

  /**
   * Delete a category
   */
  async deleteCategory(categoryId: string) {
    try {
      const response = await categoryApi.deleteCategory(categoryId);

      if (response.code === 0) {
        // Remove the category from the list
        this.categories = this.categories.filter((c) => c.categoryId !== categoryId);
        return { success: true };
      } else {
        return { success: false, message: 'Failed to delete category' };
      }
    } catch (error: unknown) {
      console.error('Delete category error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete category',
      };
    }
  }

  /**
   * Get a category by ID
   */
  getCategoryById(categoryId: string): CategoryDto | undefined {
    return this.categories.find((c) => c.categoryId === categoryId);
  }

  /**
   * Get a category name by ID
   */
  getCategoryName(categoryId: string): string | undefined {
    const category = this.getCategoryById(categoryId);
    return category?.name;
  }
}
