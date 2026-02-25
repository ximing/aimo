import type {
  GenerateTagsRequestDto,
  GenerateTagsResponseDto,
  UpdateMemoTagsRequestDto,
  MemoWithAttachmentsDto,
  AIToolsListResponseDto,
} from '@aimo/dto';
import request from '../utils/request';

/**
 * Generate AI-powered tag suggestions from memo content
 * Returns 3-8 relevant tags based on content analysis
 */
export const generateTags = (data: GenerateTagsRequestDto) => {
  return request.post<unknown, { code: number; data: GenerateTagsResponseDto }>(
    '/api/v1/ai/generate-tags',
    data
  );
};

/**
 * Batch update memo tags
 * Replaces all tags on the memo with the provided array
 */
export const updateMemoTags = (memoId: string, data: UpdateMemoTagsRequestDto) => {
  return request.put<
    unknown,
    { code: number; data: { message: string; memo: MemoWithAttachmentsDto } }
  >(`/api/v1/memos/${memoId}/tags`, data);
};

/**
 * Get list of available AI tools
 * Returns configuration for all available AI tools
 */
export const getAvailableAITools = () => {
  return request.get<unknown, { code: number; data: AIToolsListResponseDto }>('/api/v1/ai/tools');
};

/**
 * Reserved for future AI tools:
 * - POST /api/v1/ai/summarize - Summarize memo content
 * - POST /api/v1/ai/translate - Translate memo content
 * - POST /api/v1/ai/expand - Expand brief notes into detailed content
 * - POST /api/v1/ai/grammar-check - Check and fix grammar
 */
