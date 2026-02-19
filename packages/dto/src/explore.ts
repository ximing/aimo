/**
 * Explore DTOs for AI-powered knowledge discovery
 */

import type { MemoListItemDto } from './memo.js';

/**
 * Request to explore/query the knowledge base
 */
export interface ExploreQueryDto {
  query: string;
  context?: string; // Optional conversation context for follow-up questions
}

/**
 * Source memo reference in AI response
 */
export interface ExploreSourceDto {
  memoId: string;
  title: string; // Generated title from content (first line or first 50 chars)
  content: string; // Content summary (first 200 chars)
  relevanceScore: number;
  createdAt: number;
}

/**
 * Response from AI exploration
 */
export interface ExploreResponseDto {
  answer: string;
  sources: ExploreSourceDto[];
  relatedTopics?: string[];
  suggestedQuestions?: string[];
}

/**
 * Agent state for LangChain DeepAgents
 * Passed between agents in the chain
 */
export interface AgentState {
  query: string;
  uid: string;
  context?: string;
  retrievedMemos?: MemoListItemDto[];
  relevanceScores?: Record<string, number>;
  analysis?: string;
  answer?: string;
  sources?: ExploreSourceDto[];
  suggestedQuestions?: string[];
  error?: string;
}

/**
 * Retrieval Agent output
 */
export interface RetrievalAgentOutput {
  memos: MemoListItemDto[];
  relevanceScores: Record<string, number>;
}

/**
 * Relation Analysis Agent output
 */
export interface RelationAnalysisOutput {
  relatedMemoIds: string[];
  relationTypes: Record<string, string[]>;
  analysis: string;
}

/**
 * Attachment Analysis Agent output
 */
export interface AttachmentAnalysisOutput {
  attachmentSummaries: Record<string, string>;
  keyInsights: string[];
}

/**
 * Summary Agent output - final response
 */
export interface SummaryAgentOutput {
  answer: string;
  sources: ExploreSourceDto[];
  relatedTopics?: string[];
  suggestedQuestions?: string[];
}

/**
 * Node in the relationship graph
 */
export interface RelationGraphNodeDto {
  id: string;
  type: 'source' | 'related' | 'backlink';
  title: string;
  content: string;
  createdAt: number;
}

/**
 * Edge in the relationship graph (connection between nodes)
 */
export interface RelationGraphEdgeDto {
  source: string;
  target: string;
  type: 'outgoing' | 'incoming' | 'thematic' | 'temporal' | 'tag';
  label?: string;
}

/**
 * Relationship graph data for visualization
 */
export interface RelationGraphDto {
  nodes: RelationGraphNodeDto[];
  edges: RelationGraphEdgeDto[];
  centerMemoId: string;
  analysis: string;
}

/**
 * Request to explore relationships for a memo
 */
export interface ExploreRelationsDto {
  memoId: string;
  includeBacklinks?: boolean;
  maxDepth?: number;
}

/**
 * Response with relationship graph data
 */
export interface ExploreRelationsResponseDto {
  graph: RelationGraphDto;
  suggestedExplorations?: string[];
}
