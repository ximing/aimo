/**
 * Category DTOs
 */

export interface CreateCategoryDto {
  /** Category name */
  name: string;
  /** Optional color hex code for UI display */
  color?: string;
}

export interface UpdateCategoryDto {
  /** Category name */
  name?: string;
  /** Optional color hex code (null to remove color) */
  color?: string | null;
}

export interface CategoryDto {
  /** Unique category identifier */
  categoryId: string;
  /** User ID who owns this category */
  uid: string;
  /** Category name */
  name: string;
  /** Optional color hex code for UI display */
  color?: string;
  /** Created timestamp in milliseconds */
  createdAt: number;
  /** Updated timestamp in milliseconds */
  updatedAt: number;
}
