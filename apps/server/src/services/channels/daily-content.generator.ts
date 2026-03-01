import { Inject, Service } from 'typedi';

import { LanceDbService as LanceDatabaseService } from '../../sources/lancedb.js';
import { RecommendationService } from '../recommendation.service.js';

import type { ContentGenerator, PushContent } from './content-generator.interface.js';
import type { MemoListItemDto } from '@aimo/dto';

@Service()
export class DailyContentGenerator implements ContentGenerator {
  @Inject()
  private recommendationService!: RecommendationService;

  constructor(private lanceDatabase: LanceDatabaseService) {}

  /**
   * Generate content based on content type
   */
  async generate(
    contentType: string,
    uid: string  ): Promise<PushContent> {
    switch (contentType) {
      case 'daily_pick': {
        return this.generateDailyPick(uid);
      }
      case 'daily_memos': {
        return this.generateDailyMemos(uid);
      }
      default: {
        throw new Error(`Unsupported content type: ${contentType}`);
      }
    }
  }

  /**
   * Generate daily_pick: get 3 recommended memos using AI (same as home page daily recommendations)
   */
  private async generateDailyPick(uid: string): Promise<PushContent> {
    // Use the same recommendation service as the home page
    const recommendedMemos = await this.recommendationService.generateDailyRecommendations(uid);

    if (recommendedMemos.length === 0) {
      return {
        title: '今日推荐',
        msg: '<p>你还没有记录任何备忘录，来创建一个吧！</p>',
        isHtml: true,
      };
    }

    const title = '今日推荐';

    // Format all 3 memos
    const memoItems = recommendedMemos
      .map((memo: MemoListItemDto) => {
        const content = memo.content || '';
        const createdAt = memo.createdAt
          ? new Date(memo.createdAt).toLocaleDateString('zh-CN')
          : '';
        return `
        <div style="margin-bottom: 16px; padding: 12px; background: #f5f5f5; border-radius: 8px;">
          <p style="color: #999; font-size: 12px; margin: 0 0 8px 0;">${createdAt}</p>
          <p style="margin: 0; font-size: 14px; line-height: 1.6;">${this.escapeHtml(content)}</p>
        </div>
      `;
      })
      .join('');

    const message = `
      <div style="font-size: 14px; line-height: 1.6;">
        ${memoItems}
      </div>
    `;

    return { title, msg: message, isHtml: true };
  }

  /**
   * Generate daily_memos: get all memos created today
   */
  private async generateDailyMemos(uid: string): Promise<PushContent> {
    const memosTable = await this.lanceDb.openTable('memos');

    // Get start and end of today
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

    // Get all memos for the user
    const allMemos = await memosTable.query().where(`uid = '${uid}'`).toArray();

    // Filter to today's memos
    const todayMemos = allMemos.filter((memo: any) => {
      const createdAt = memo.createdAt as number;
      return createdAt >= startOfDay && createdAt <= endOfDay;
    });

    if (todayMemos.length === 0) {
      return {
        title: '今日备忘录',
        msg: '<p>今天还没有记录任何备忘录</p>',
        isHtml: true,
      };
    }

    const title = `今日备忘录 (${todayMemos.length}条)`;

    const memoItems = todayMemos
      .map((memo: any) => {
        const content = memo.content || '';
        const createdAt = memo.createdAt
          ? new Date(memo.createdAt).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '';

        return `
        <div style="margin-bottom: 12px; padding: 8px; background: #f5f5f5; border-radius: 6px;">
          <p style="color: #999; font-size: 12px; margin: 0 0 4px 0;">${createdAt}</p>
          <p style="margin: 0;">${this.escapeHtml(content)}</p>
        </div>
      `;
      })
      .join('');

    const message = `
      <div style="font-size: 14px; line-height: 1.6;">
        ${memoItems}
      </div>
    `;

    return { title, msg: message, isHtml: true };
  }

  /**
   * Escape HTML special characters to prevent XSS
   */
  private escapeHtml(text: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    return text.replaceAll(/[&<>"'\/]/g, (char) => htmlEscapes[char] || char);
  }
}
