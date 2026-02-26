import { Service } from '@rabjs/react';
import type { PushRuleDto, CreatePushRuleDto, UpdatePushRuleDto } from '@aimo/dto';
import * as pushRulesApi from '../../../../api/push-rules';

/**
 * PushRule Service
 * Manages push rule data and operations
 */
export class PushRuleService extends Service {
  rules: PushRuleDto[] = [];
  loading = false;
  error: string | null = null;

  /**
   * Fetch all push rules for the current user
   */
  async fetchRules(): Promise<{ success: boolean; message?: string }> {
    this.loading = true;
    this.error = null;

    try {
      const response = await pushRulesApi.getPushRules();

      if (response.code === 0 && response.data) {
        this.rules = (response.data.pushRules || []).filter(
          (rule): rule is PushRuleDto => Boolean(rule)
        );
        return { success: true };
      } else {
        this.error = 'Failed to fetch push rules';
        return { success: false, message: this.error };
      }
    } catch (error: unknown) {
      console.error('Fetch push rules error:', error);
      this.error = error instanceof Error ? error.message : 'Failed to fetch push rules';
      return { success: false, message: this.error };
    } finally {
      this.loading = false;
    }
  }

  /**
   * Create a new push rule
   */
  async createRule(data: CreatePushRuleDto): Promise<{ success: boolean; message?: string }> {
    this.error = null;

    try {
      const response = await pushRulesApi.createPushRule(data);

      if (response.code === 0 && response.data) {
        const pushRule =
          (response.data as { pushRule?: PushRuleDto; rule?: PushRuleDto }).pushRule ||
          (response.data as { pushRule?: PushRuleDto; rule?: PushRuleDto }).rule;

        if (!pushRule) {
          this.error = 'Failed to create push rule';
          return { success: false, message: this.error };
        }

        this.rules = [...this.rules, pushRule];
        return { success: true };
      } else {
        this.error = 'Failed to create push rule';
        return { success: false, message: this.error };
      }
    } catch (error: unknown) {
      console.error('Create push rule error:', error);
      this.error = error instanceof Error ? error.message : 'Failed to create push rule';
      return { success: false, message: this.error };
    }
  }

  /**
   * Update an existing push rule
   */
  async updateRule(
    ruleId: string,
    data: UpdatePushRuleDto
  ): Promise<{ success: boolean; message?: string }> {
    this.error = null;

    try {
      const response = await pushRulesApi.updatePushRule(ruleId, data);

      if (response.code === 0 && response.data) {
        const pushRule =
          (response.data as { pushRule?: PushRuleDto; rule?: PushRuleDto }).pushRule ||
          (response.data as { pushRule?: PushRuleDto; rule?: PushRuleDto }).rule;

        if (!pushRule) {
          this.error = 'Failed to update push rule';
          return { success: false, message: this.error };
        }

        this.rules = this.rules.map((r) => (r.id === ruleId ? pushRule : r));
        return { success: true };
      } else {
        this.error = 'Failed to update push rule';
        return { success: false, message: this.error };
      }
    } catch (error: unknown) {
      console.error('Update push rule error:', error);
      this.error = error instanceof Error ? error.message : 'Failed to update push rule';
      return { success: false, message: this.error };
    }
  }

  /**
   * Delete a push rule
   */
  async deleteRule(ruleId: string): Promise<{ success: boolean; message?: string }> {
    this.error = null;

    try {
      const response = await pushRulesApi.deletePushRule(ruleId);

      if (response.code === 0) {
        this.rules = this.rules.filter((r) => r.id !== ruleId);
        return { success: true };
      } else {
        this.error = 'Failed to delete push rule';
        return { success: false, message: this.error };
      }
    } catch (error: unknown) {
      console.error('Delete push rule error:', error);
      this.error = error instanceof Error ? error.message : 'Failed to delete push rule';
      return { success: false, message: this.error };
    }
  }

  /**
   * Test push notification for a rule
   */
  async testPush(ruleId: string): Promise<{ success: boolean; message?: string }> {
    this.error = null;

    try {
      const response = await pushRulesApi.testPushRule(ruleId);

      if (response.code === 0) {
        return { success: true, message: '测试消息已发送' };
      } else {
        this.error = 'Failed to send test push';
        return { success: false, message: this.error };
      }
    } catch (error: unknown) {
      console.error('Test push error:', error);
      this.error = error instanceof Error ? error.message : 'Failed to send test push';
      return { success: false, message: this.error };
    }
  }

  /**
   * Get a rule by ID
   */
  getRuleById(ruleId: string): PushRuleDto | undefined {
    return this.rules.find((r) => r.id === ruleId);
  }

  /**
   * Format push time for display
   */
  formatTime(hour: number): string {
    return `${hour.toString().padStart(2, '0')}:00`;
  }

  /**
   * Format content type for display
   */
  formatContentType(type: string): string {
    switch (type) {
      case 'daily_pick':
        return '每日推荐';
      case 'daily_memos':
        return '今日备忘录';
      default:
        return type;
    }
  }
}
