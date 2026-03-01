/**
 * Tag DTOs
 */

export interface TagDto {
  /** Unique tag identifier */
  tagId: string;
  /** Tag name */
  name: string;
  /** Optional color hex code for UI display */
  color?: string;
  /** Number of times this tag has been used */
  usageCount?: number;
  /** Created timestamp in milliseconds */
  createdAt?: number;
  /** Updated timestamp in milliseconds */
  updatedAt?: number;
}

export interface CreateTagDto {
  /** Tag name */
  name: string;
  /** Optional color hex code for UI display */
  color?: string;
}

export interface UpdateTagDto {
  /** Tag name */
  name?: string;
  /** Optional color hex code for UI display */
  color?: string;
}

export interface TagListDto {
  /** Array of tag items */
  items: TagDto[];
}

export interface TagWithMemosDto {
  /** Tag data */
  tag: TagDto;
  /** Array of memo IDs using this tag */
  memoIds: string[];
}
