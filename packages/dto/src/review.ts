export type ReviewScope = 'all' | 'category' | 'tag' | 'recent';
export type ReviewStatus = 'active' | 'completed' | 'abandoned';
export type MasteryLevel = 'remembered' | 'fuzzy' | 'forgot';

/**
 * A single filter rule for a review profile.
 * Multiple rules are combined with AND logic.
 *
 * - type 'category': filter by category ID; operator include/exclude
 * - type 'tag': filter by tag name; operator include/exclude
 * - type 'recent_days': memos created within last N days; value is number string; operator always 'include'
 * - type 'date_range': memos created between two dates; value is "startISO,endISO"; operator always 'include'
 */
export interface ProfileFilterRule {
  type: 'category' | 'tag' | 'recent_days' | 'date_range';
  operator: 'include' | 'exclude';
  /** categoryId / tagName / number-of-days / "startISO,endISO" */
  value: string;
  /** Human-readable label for display (e.g. category name, tag name) */
  label?: string;
}

export interface CreateReviewSessionDto {
  /** Profile ID - if provided, use profile's filterRules instead of scope/scopeValue */
  profileId?: string;
  scope?: ReviewScope;
  /** categoryId, tagName, or number of days (for 'recent') */
  scopeValue?: string;
  /** Number of questions, 5-20. Defaults to 7. */
  questionCount?: number;
}

export interface ReviewItemDto {
  itemId: string;
  sessionId: string;
  memoId: string;
  /** Original memo content for reference during review */
  memoContent?: string;
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

export interface ReviewProfileDto {
  profileId: string;
  userId: string;
  name: string;
  /** Structured filter rules (new format). Takes precedence over legacy scope fields. */
  filterRules: ProfileFilterRule[];
  questionCount: number;
  /** User-selected model ID for AI review. Null means use system default. */
  userModelId?: string | null;
  createdAt: string;
  updatedAt: string;
  /** @deprecated use filterRules */
  scope?: ReviewScope;
  /** @deprecated use filterRules */
  filterValues?: string[];
  /** @deprecated use filterRules */
  recentDays?: number;
}

export interface CreateReviewProfileDto {
  name: string;
  filterRules: ProfileFilterRule[];
  questionCount?: number;
  /** User-selected model ID for AI review. Null means use system default. */
  userModelId?: string | null;
}

export interface UpdateReviewProfileDto {
  name?: string;
  filterRules?: ProfileFilterRule[];
  questionCount?: number;
  /** User-selected model ID for AI review. Null means use system default. */
  userModelId?: string | null;
}
