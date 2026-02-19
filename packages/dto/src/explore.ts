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
  content: string;
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
