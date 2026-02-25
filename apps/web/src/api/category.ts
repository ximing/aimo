import type { CreateCategoryDto, UpdateCategoryDto, CategoryDto } from '@aimo/dto';
import request from '../utils/request';

/**
 * Get all categories for the current user
 */
export const getCategories = () => {
  return request.get<unknown, { code: number; data: { categories: CategoryDto[] } }>(
    '/api/v1/categories'
  );
};

/**
 * Get a single category by ID
 */
export const getCategory = (categoryId: string) => {
  return request.get<unknown, { code: number; data: { category: CategoryDto } }>(
    `/api/v1/categories/${categoryId}`
  );
};

/**
 * Create a new category
 */
export const createCategory = (data: CreateCategoryDto) => {
  return request.post<unknown, { code: number; data: { category: CategoryDto } }>(
    '/api/v1/categories',
    data
  );
};

/**
 * Update a category
 */
export const updateCategory = (categoryId: string, data: UpdateCategoryDto) => {
  return request.put<unknown, { code: number; data: { category: CategoryDto } }>(
    `/api/v1/categories/${categoryId}`,
    data
  );
};

/**
 * Delete a category
 */
export const deleteCategory = (categoryId: string) => {
  return request.delete<unknown, { code: number; data: { message: string } }>(
    `/api/v1/categories/${categoryId}`
  );
};
