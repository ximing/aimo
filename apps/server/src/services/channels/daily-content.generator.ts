import { Service } from 'typedi';

import { LanceDbService } from '../../sources/lancedb.js';

import type { ContentGenerator, PushContent } from './content-generator.interface.js';

@Service()
export class DailyContentGenerator implements ContentGenerator {
  constructor(private lanceDb: LanceDbService) {}

  /**
   * Generate content based on content type
   */
  async generate(contentType: string, uid: string): Promise<PushContent> {
    switch (contentType) {
      case 'daily_pick':
        return this.generateDailyPick(uid);
      case 'daily_memos':
        return this.generateDailyMemos(uid);
      default:
        throw new Error(`Unsupported content type: ${contentType}`);
    }
  }

  /**
   * Generate daily_pick: randomly select one memo from user's collection
   */
  private async generateDailyPick(uid: string): Promise<PushContent> {
    const memosTable = await this.lanceDb.openTable('memos');

    // Get all memos for the user
    const memos = await memosTable.query().where(`uid = '${uid}'`).toArray();

    if (memos.length === 0) {
      return {
        title: '今日推荐',
        msg: '<p>你还没有记录任何备忘录，来创建一个吧！</p>',
      };
    }

    // Randomly select one memo
    const randomIndex = Math.floor(Math.random() * memos.length);
    const selectedMemo = memos[randomIndex] as any;

    const title = '今日推荐';
    const content = selectedMemo.content || '';
    const createdAt = selectedMemo.createdAt
      ? new Date(selectedMemo.createdAt).toLocaleDateString('zh-CN')
      : '';

    const msg = `
      <div style="font-size: 14px; line-height: 1.6;">
        <p style="color: #666; margin-bottom: 8px;">${createdAt}</p>
        <div style="background: #f5f5f5; padding: 12px; border-radius: 8px;">
          ${this.escapeHtml(content)}
        </div>
      </div>
    `;

    return { title, msg };
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
      };
    }

    const title = `今日备忘录 (${todayMemos.length}条)`;

    const memoItems = todayMemos.map((memo: any) => {
      const content = memo.content || '';
      const createdAt = memo.createdAt
        ? new Date(memo.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        : '';
      return `
        <div style="margin-bottom: 12px; padding: 8px; background: #f5f5f5; border-radius: 6px;">
          <p style="color: #999; font-size: 12px; margin: 0 0 4px 0;">${createdAt}</p>
          <p style="margin: 0;">${this.escapeHtml(content)}</p>
        </div>
      `;
    }).join('');

    const msg = `
      <div style="font-size: 14px; line-height: 1.6;">
        ${memoItems}
      </div>
    `;

    return { title, msg };
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
    return text.replace(/[&<>"'\/]/g, (char) => htmlEscapes[char] || char);
  }
}
