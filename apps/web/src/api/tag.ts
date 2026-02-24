import type { TagDto, CreateTagDto, UpdateTagDto } from '@aimo/dto';
import request from '../utils/request';

/**
 * Get all tags for the current user
 */
export const getTags = () => {
  return request.get<unknown, { code: number; data: { tags: TagDto[] } }>('/api/v1/tags');
};

/**
 * Get a single tag by ID
 */
export const getTag = (tagId: string) => {
  return request.get<unknown, { code: number; data: { tag: TagDto } }>(`/api/v1/tags/${tagId}`);
};

/**
 * Create a new tag
 */
export const createTag = (data: CreateTagDto) => {
  return request.post<unknown, { code: number; data: { tag: TagDto } }>('/api/v1/tags', data);
};

/**
 * Update a tag
 */
export const updateTag = (tagId: string, data: UpdateTagDto) => {
  return request.put<unknown, { code: number; data: { tag: TagDto } }>(`/api/v1/tags/${tagId}`, data);
};

/**
 * Delete a tag
 */
export const deleteTag = (tagId: string) => {
  return request.delete<unknown, { code: number; data: { message: string } }>(`/api/v1/tags/${tagId}`);
};
