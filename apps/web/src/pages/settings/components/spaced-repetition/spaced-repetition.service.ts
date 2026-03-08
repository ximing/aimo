import { Service } from '@rabjs/react';
import * as srApi from '../../../../api/spaced-repetition';
import type { SRSettings, SRRule } from '../../../../api/spaced-repetition';

export class SpacedRepetitionService extends Service {
  settings: SRSettings = { srEnabled: false, srDailyLimit: 5 };
  rules: SRRule[] = [];
  loading = false;
  savingSettings = false;
  error: string | null = null;

  async fetchSettings(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const res = await srApi.getSRSettings();
      if (res.code === 0 && res.data) {
        this.settings = res.data;
      }
    } catch (e) {
      console.error('Fetch SR settings error:', e);
    } finally {
      this.loading = false;
    }
  }

  async fetchRules(): Promise<void> {
    try {
      const res = await srApi.getSRRules();
      if (res.code === 0 && res.data) {
        this.rules = res.data.rules || [];
      }
    } catch (e) {
      console.error('Fetch SR rules error:', e);
    }
  }

  async updateSettings(data: Partial<SRSettings>): Promise<{ success: boolean }> {
    this.savingSettings = true;
    try {
      const res = await srApi.updateSRSettings(data);
      if (res.code === 0 && res.data) {
        this.settings = res.data;
        return { success: true };
      }
      return { success: false };
    } catch (e) {
      console.error('Update SR settings error:', e);
      return { success: false };
    } finally {
      this.savingSettings = false;
    }
  }

  async createRule(data: {
    mode: 'include' | 'exclude';
    filterType: 'category' | 'tag';
    filterValue: string;
  }): Promise<{ success: boolean }> {
    try {
      const res = await srApi.createSRRule(data);
      if (res.code === 0 && res.data?.rule) {
        this.rules = [...this.rules, res.data.rule];
        return { success: true };
      }
      return { success: false };
    } catch (e) {
      console.error('Create SR rule error:', e);
      return { success: false };
    }
  }

  async deleteRule(ruleId: string): Promise<{ success: boolean }> {
    try {
      const res = await srApi.deleteSRRule(ruleId);
      if (res.code === 0) {
        this.rules = this.rules.filter((r) => r.ruleId !== ruleId);
        return { success: true };
      }
      return { success: false };
    } catch (e) {
      console.error('Delete SR rule error:', e);
      return { success: false };
    }
  }
}
