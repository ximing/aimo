/**
 * Tag DTOs
 */

export interface TagDto {
  tagId: string;
  name: string;
  color?: string;
  usageCount?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface CreateTagDto {
  name: string;
  color?: string;
}

export interface UpdateTagDto {
  name?: string;
  color?: string;
}

export interface TagListDto {
  items: TagDto[];
}

export interface TagWithMemosDto {
  tag: TagDto;
  memoIds: string[];
}
