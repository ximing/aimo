import { ChatOpenAI } from '@langchain/openai';
import { eq, and } from 'drizzle-orm';
import { Service } from 'typedi';

import { config } from '../config/config.js';
import { getDatabase } from '../db/connection.js';
import { dailyRecommendations } from '../db/schema/index.js';
import { OBJECT_TYPE } from '../models/constant/type.js';
import { generateTypeId } from '../utils/id.js';
import { logger } from '../utils/logger.js';

import { MemoService } from './memo.service.js';

import type { MemoListItemDto } from '@aimo/dto';

/**
 * Service for generating daily memo recommendations using AI
 * Caches recommendations per user per day for consistent results
 * Uses Drizzle ORM with MySQL for relational data storage
 */
@Service()
export class RecommendationService {
  private model: ChatOpenAI;

  constructor(private memoService: MemoService) {
    // Initialize LangChain ChatOpenAI
    this.model = new ChatOpenAI({
      modelName: config.openai.model || 'gpt-4o-mini',
      apiKey: config.openai.apiKey,
      configuration: {
        baseURL: config.openai.baseURL,
      },
      temperature: 0.7,
    });
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  private getTodayDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Check if cached recommendations exist for today
   */
  private async getCachedRecommendations(
    uid: string,
    date: string
  ): Promise<{ recommendationId: string; uid: string; date: string; memoIds: string[]; createdAt: number } | null> {
    try {
      const db = getDatabase();
      const results = await db
        .select()
        .from(dailyRecommendations)
        .where(and(eq(dailyRecommendations.uid, uid), eq(dailyRecommendations.date, date)))
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      const record = results[0];
      return {
        recommendationId: record.recommendationId,
        uid: record.uid,
        date: record.date,
        memoIds: record.memoIds || [],
        createdAt: record.createdAt.getTime(),
      };
    } catch (error) {
      logger.error('Error checking cached recommendations:', error);
      return null;
    }
  }

  /**
   * Save recommendations to cache
   */
  private async cacheRecommendations(uid: string, date: string, memoIds: string[]): Promise<void> {
    try {
      const db = getDatabase();
      const recommendationId = generateTypeId(OBJECT_TYPE.RECOMMENDATION);

      await db.insert(dailyRecommendations).values({
        recommendationId,
        uid,
        date,
        memoIds,
      });
    } catch (error) {
      logger.error('Error caching recommendations:', error);
      // Don't throw - caching failure shouldn't break the feature
    }
  }

  /**
   * Generate unique random offsets for sampling
   */
  private generateRandomOffsets(max: number, count: number): number[] {
    if (max <= count) {
      return Array.from({ length: max }, (_, index) => index);
    }

    const offsets = new Set<number>();
    while (offsets.size < count) {
      const randomOffset = Math.floor(Math.random() * max);
      offsets.add(randomOffset);
    }
    return [...offsets];
  }

  /**
   * Generate daily recommendations using AI
   * Falls back to random selection if AI fails
   */
  async generateDailyRecommendations(uid: string): Promise<MemoListItemDto[]> {
    try {
      const today = this.getTodayDate();

      // Check cache first
      const cached = await this.getCachedRecommendations(uid, today);
      if (cached && cached.memoIds.length > 0) {
        logger.info('Using cached daily recommendations for user:', uid);
        const memos = await this.memoService.getMemosByIds(cached.memoIds, uid);
        // Preserve order from cached recommendation
        const memoMap = new Map(memos.map((m) => [m.memoId, m]));
        return cached.memoIds
          .map((id) => memoMap.get(id))
          .filter((m): m is MemoListItemDto => m !== undefined);
      }

      // Get memo count only (efficient - doesn't load all data)
      const totalCount = await this.memoService.getMemoCount(uid);

      // If less than 3 memos, get all of them
      if (totalCount <= 3) {
        const allMemos = await this.memoService.getAllMemosByUid(uid);
        const memoIds = allMemos.map((m) => m.memoId);
        await this.cacheRecommendations(uid, today, memoIds);
        return this.memoService.getMemosByIds(memoIds, uid);
      }

      // Randomly select 10 offsets and fetch memos by offset (avoid loading all memos)
      const randomOffsets = this.generateRandomOffsets(totalCount, 10);

      // Fetch memos at random offsets in parallel
      const sampledMemosPromises = randomOffsets.map((offset) =>
        this.memoService.getMemoByOffset(uid, offset)
      );
      const sampledMemosResults = await Promise.all(sampledMemosPromises);
      const sampledMemos = sampledMemosResults.filter(
        (m): m is NonNullable<typeof m> => m !== null
      );

      // If we got less than 3 memos, return all we have
      if (sampledMemos.length <= 3) {
        const memoIds = sampledMemos.map((m) => m.memoId);
        await this.cacheRecommendations(uid, today, memoIds);
        return this.memoService.getMemosByIds(memoIds, uid);
      }

      // Try AI-based selection from sampled memos
      try {
        const selectedIds = await this.selectMemosWithAI(sampledMemos);
        if (selectedIds.length > 0) {
          await this.cacheRecommendations(uid, today, selectedIds);
          return this.memoService.getMemosByIds(selectedIds, uid);
        }
      } catch (aiError) {
        logger.warn('AI recommendation failed, falling back to random selection:', aiError);
      }

      // Fallback: random selection from sampled memos
      const randomIds = this.selectRandomMemos(sampledMemos, 3);
      await this.cacheRecommendations(uid, today, randomIds);
      return this.memoService.getMemosByIds(randomIds, uid);
    } catch (error) {
      logger.error('Error generating daily recommendations:', error);
      throw error;
    }
  }

  /**
   * Use AI to select the best 3 memos for recommendation
   */
  private async selectMemosWithAI(memos: any[]): Promise<string[]> {
    // Prepare memo summaries for AI analysis
    const memoSummaries = memos.map((memo, index) => ({
      id: memo.memoId,
      index: index + 1,
      content: memo.content.slice(0, 500),
      createdAt: new Date(memo.createdAt).toISOString().split('T')[0],
    }));

    const systemPrompt = `You are an expert content curator. Your task is to analyze a user's notes and select the 3 most valuable notes for them to review today.

Selection criteria (in order of importance):
1. **Richness of Content**: Notes with substantial, meaningful content
2. **Uniqueness**: Notes that stand out from typical daily entries
3. **Review Value**: Notes that would benefit from being revisited - ideas, insights, or memories worth reflecting on
4. **Diversity**: Try to select notes from different time periods or topics

You must respond with ONLY a JSON array containing exactly 3 memo IDs, like this:
["memo_id_1", "memo_id_2", "memo_id_3"]

Do not include any explanation, markdown formatting, or additional text.`;

    const userPrompt = `Please analyze these notes and select the 3 best ones for daily recommendation:

${memoSummaries
  .map(
    (m) =>
      `[${m.index}] ID: ${m.id}\nDate: ${m.createdAt}\nContent: ${m.content}${
        m.content.length >= 500 ? '...' : ''
      }`
  )
  .join('\n\n')}

Respond with exactly 3 memo IDs in JSON array format.`;

    const response = await this.model.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    const content = typeof response.content === 'string' ? response.content : '';

    // Parse JSON response
    try {
      // Extract JSON array from response (handle markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const selectedIds = JSON.parse(jsonMatch[0]) as string[];
        // Validate that all IDs exist in the original memos
        const validIds = selectedIds.filter((id) => memos.some((m) => m.memoId === id));
        if (validIds.length >= 3) {
          return validIds.slice(0, 3);
        }
        // If some IDs are invalid but we have at least 1, supplement with random
        if (validIds.length > 0) {
          const remainingNeeded = 3 - validIds.length;
          const remainingMemos = memos.filter((m) => !validIds.includes(m.memoId));
          const randomIds = this.selectRandomMemos(remainingMemos, remainingNeeded);
          return [...validIds, ...randomIds];
        }
      }
    } catch (parseError) {
      logger.warn('Failed to parse AI response:', parseError, 'Response:', content);
    }

    // If parsing fails, return empty to trigger fallback
    return [];
  }

  /**
   * Select random memos as fallback
   */
  private selectRandomMemos(memos: any[], count: number): string[] {
    const shuffled = [...memos].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map((m) => m.memoId);
  }
}
