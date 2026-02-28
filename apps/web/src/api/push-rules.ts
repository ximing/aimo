import type { PushRuleDto, CreatePushRuleDto, UpdatePushRuleDto } from '@aimo/dto';
import request from '../utils/request';

/**
 * Get all push rules for the current user
 */
export const getPushRules = () => {
  return request.get<unknown, { code: number; data: { pushRules: PushRuleDto[] } }>(
    '/api/v1/push-rules'
  );
};

/**
 * Get a single push rule by ID
 */
export const getPushRule = (ruleId: string) => {
  return request.get<unknown, { code: number; data: { pushRule: PushRuleDto } }>(
    `/api/v1/push-rules/${ruleId}`
  );
};

/**
 * Create a new push rule
 */
export const createPushRule = (data: CreatePushRuleDto) => {
  return request.post<unknown, { code: number; data: { pushRule: PushRuleDto } }>(
    '/api/v1/push-rules',
    data
  );
};

/**
 * Update a push rule
 */
export const updatePushRule = (ruleId: string, data: UpdatePushRuleDto) => {
  return request.put<unknown, { code: number; data: { pushRule: PushRuleDto } }>(
    `/api/v1/push-rules/${ruleId}`,
    data
  );
};

/**
 * Delete a push rule
 */
export const deletePushRule = (ruleId: string) => {
  return request.delete<unknown, { code: number; data: { message: string } }>(
    `/api/v1/push-rules/${ruleId}`
  );
};

/**
 * Test push notification for a rule
 */
export const testPushRule = (ruleId: string) => {
  return request.post<unknown, { code: number; data: { message: string } }>(
    `/api/v1/push-rules/${ruleId}/test`
  );
};
