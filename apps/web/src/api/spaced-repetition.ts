import request from '../utils/request';

export interface SRSettings {
  srEnabled: boolean;
  srDailyLimit: number;
}

export interface SRRule {
  ruleId: string;
  userId: string;
  mode: 'include' | 'exclude';
  filterType: 'category' | 'tag';
  filterValue: string;
  createdAt: string;
}

export interface SRCard {
  cardId: string;
  memoId: string;
  memo: {
    id: string;
    title: string;
    content: string;
  };
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: string;
}

export const getSRSettings = () =>
  request.get<unknown, { code: number; data: SRSettings }>('/api/v1/spaced-repetition/settings');

export const updateSRSettings = (data: Partial<SRSettings>) =>
  request.put<unknown, { code: number; data: SRSettings }>(
    '/api/v1/spaced-repetition/settings',
    data
  );

export const getSRRules = () =>
  request.get<unknown, { code: number; data: { rules: SRRule[] } }>(
    '/api/v1/spaced-repetition/rules'
  );

export const createSRRule = (data: {
  mode: 'include' | 'exclude';
  filterType: 'category' | 'tag';
  filterValue: string;
}) =>
  request.post<unknown, { code: number; data: { rule: SRRule } }>(
    '/api/v1/spaced-repetition/rules',
    data
  );

export const deleteSRRule = (ruleId: string) =>
  request.delete<unknown, { code: number; data: { message: string } }>(
    `/api/v1/spaced-repetition/rules/${ruleId}`
  );

export const getDueCards = () =>
  request.get<unknown, { code: number; data: { cards: SRCard[] } }>(
    '/api/v1/spaced-repetition/due'
  );

export const reviewCard = (
  cardId: string,
  quality: 'mastered' | 'remembered' | 'fuzzy' | 'forgot' | 'skip'
) =>
  request.post<unknown, { code: number; data: { card: SRCard } }>(
    `/api/v1/spaced-repetition/cards/${cardId}/review`,
    { quality }
  );
