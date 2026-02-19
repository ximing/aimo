import type {
  ExploreQueryDto,
  ExploreResponseDto,
  ExploreRelationsResponseDto,
} from '@aimo/dto';
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

/**
 * Get relationship graph for a memo
 * Returns nodes (memos) and edges (relationships) for visualization
 */
export const getRelations = (memoId: string, includeBacklinks: boolean = true) => {
  return request.get<unknown, { code: number; data: ExploreRelationsResponseDto }>(
    `/api/v1/explore/relations/${memoId}`,
    { params: { memoId, includeBacklinks } }
  );
};
