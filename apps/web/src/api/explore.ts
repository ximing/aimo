import type { ExploreQueryDto, ExploreResponseDto } from '@aimo/dto';
import request from '../utils/request';

/**
 * Explore the knowledge base with AI-powered query
 * Uses LangChain DeepAgents for retrieval, analysis, and generation
 */
export const explore = (data: ExploreQueryDto) => {
  return request.post<unknown, { code: number; data: ExploreResponseDto }>('/api/v1/explore', data);
};

/**
 * Quick search for memos without LLM processing
 * Returns memos with relevance scores
 */
export const quickSearch = (query: string, limit: number = 5) => {
  return request.post<unknown, { code: number; data: { items: unknown[]; total: number } }>(
    '/api/v1/explore/quick-search',
    { query, limit }
  );
};
