export type ReviewScope = 'all' | 'category' | 'tag' | 'recent';
export type ReviewStatus = 'active' | 'completed' | 'abandoned';
export type MasteryLevel = 'remembered' | 'fuzzy' | 'forgot';

export interface CreateReviewSessionDto {
  scope: ReviewScope;
  /** categoryId, tagName, or number of days (for 'recent') */
  scopeValue?: string;
  /** Number of questions, 5-10. Defaults to 7. */
  questionCount?: number;
}

export interface ReviewItemDto {
  itemId: string;
  sessionId: string;
  memoId: string;
  question: string;
  userAnswer?: string;
  aiFeedback?: string;
  mastery?: MasteryLevel;
  order: number;
}

export interface ReviewSessionDto {
  sessionId: string;
  uid: string;
  scope: ReviewScope;
  scopeValue?: string;
  status: ReviewStatus;
  score?: number;
  items: ReviewItemDto[];
  createdAt: string;
  completedAt?: string;
}

export interface SubmitAnswerDto {
  itemId: string;
  answer: string;
}

export interface SubmitAnswerResponseDto {
  itemId: string;
  aiFeedback: string;
  mastery: MasteryLevel;
}

export interface CompleteSessionResponseDto {
  sessionId: string;
  score: number;
  items: ReviewItemDto[];
}

export interface ReviewHistoryItemDto {
  sessionId: string;
  scope: ReviewScope;
  scopeValue?: string;
  score?: number;
  itemCount: number;
  createdAt: string;
  completedAt?: string;
}
