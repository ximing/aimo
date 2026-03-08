import type {
  CreateReviewSessionDto, CreateReviewProfileDto, UpdateReviewProfileDto, ReviewProfileDto,
  ReviewSessionDto, SubmitAnswerDto,
  SubmitAnswerResponseDto, CompleteSessionResponseDto, ReviewHistoryItemDto
} from '@aimo/dto';
import request from '../utils/request';

export const createReviewSession = (data: CreateReviewSessionDto) =>
  request.post<unknown, { code: number; data: ReviewSessionDto }>('/api/v1/review/sessions', data);

export const getReviewSession = (sessionId: string) =>
  request.get<unknown, { code: number; data: ReviewSessionDto }>(`/api/v1/review/sessions/${sessionId}`);

export const submitAnswer = (sessionId: string, data: SubmitAnswerDto) =>
  request.post<unknown, { code: number; data: SubmitAnswerResponseDto }>(
    `/api/v1/review/sessions/${sessionId}/answer`, data
  );

export const completeSession = (sessionId: string) =>
  request.post<unknown, { code: number; data: CompleteSessionResponseDto }>(
    `/api/v1/review/sessions/${sessionId}/complete`, {}
  );

export const getReviewHistory = () =>
  request.get<unknown, { code: number; data: { items: ReviewHistoryItemDto[]; total: number } }>(
    '/api/v1/review/history'
  );

// Review Profile APIs
export const getReviewProfiles = () =>
  request.get<unknown, { code: number; data: { profiles: ReviewProfileDto[] } }>(
    '/api/v1/review/profiles'
  );

export const createReviewProfile = (data: CreateReviewProfileDto) =>
  request.post<unknown, { code: number; data: ReviewProfileDto }>('/api/v1/review/profiles', data);

export const updateReviewProfile = (profileId: string, data: UpdateReviewProfileDto) =>
  request.put<unknown, { code: number; data: ReviewProfileDto }>(
    `/api/v1/review/profiles/${profileId}`, data
  );

export const deleteReviewProfile = (profileId: string) =>
  request.delete<unknown, { code: number; data: { success: boolean } }>(
    `/api/v1/review/profiles/${profileId}`
  );
