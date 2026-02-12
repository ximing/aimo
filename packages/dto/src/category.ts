/**
 * Category DTOs
 */

export interface CreateCategoryDto {
  name: string;
  color?: string; // Optional color hex code for UI display
}

export interface UpdateCategoryDto {
  name?: string;
  color?: string | null; // Optional color hex code (null to remove color)
}

export interface CategoryDto {
  categoryId: string;
  uid: string;
  name: string;
  color?: string; // Optional color hex code for UI display
  createdAt: number; // timestamp in milliseconds
  updatedAt: number; // timestamp in milliseconds
}
