import { Service } from 'typedi';
import { eq, and, lte, inArray } from 'drizzle-orm';

import { getDatabase } from '../db/connection.js';
import { spacedRepetitionCards, spacedRepetitionRules } from '../db/schema/index.js';
import { users } from '../db/schema/users.js';
import { memos } from '../db/schema/memos.js';
import { tags } from '../db/schema/tags.js';
import { generateTypeId } from '../utils/id.js';
import { OBJECT_TYPE } from '../models/constant/type.js';
import { logger } from '../utils/logger.js';

import type { SpacedRepetitionCard } from '../db/schema/spaced-repetition-cards.js';
import type { SpacedRepetitionRule } from '../db/schema/spaced-repetition-rules.js';

export interface SRCardState {
  easeFactor: number;
  interval: number;
  repetitions: number;
}

export interface SRNextReview {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: Date;
}

@Service()
export class SpacedRepetitionService {
  /**
   * Calculate the next review schedule using the SM-2 algorithm.
   *
   * @param card - Current card state (easeFactor, interval, repetitions)
   * @param quality - Review quality: 1=forgot, 3=fuzzy, 4=remembered, 5=mastered
   * @returns Updated card state with nextReviewAt
   */
  calculateNextReview(card: SRCardState, quality: 1 | 3 | 4 | 5): SRNextReview {
    let { easeFactor, interval, repetitions } = card;

    if (quality === 1) {
      // Forgot: reset repetitions, interval back to 1
      easeFactor = Math.max(1.3, easeFactor - 0.2);
      repetitions = 0;
      interval = 1;
    } else {
      // Remembered (quality >= 3): increment repetitions, update easeFactor and interval
      let newEaseFactor: number;
      let newInterval: number;

      if (quality === 5) {
        newEaseFactor = Math.max(1.3, easeFactor + 0.15);
      } else if (quality === 4) {
        newEaseFactor = Math.max(1.3, easeFactor + 0.1);
      } else {
        // quality === 3
        newEaseFactor = Math.max(1.3, easeFactor - 0.08);
      }

      // After repetitions reset: 1st review = 1 day, 2nd review = 6 days, then formula
      const nextRepetitions = repetitions + 1;
      if (nextRepetitions === 1) {
        newInterval = 1;
      } else if (nextRepetitions === 2) {
        newInterval = 6;
      } else {
        if (quality === 5) {
          newInterval = Math.round(interval * easeFactor * 1.3);
        } else if (quality === 4) {
          newInterval = Math.round(interval * easeFactor);
        } else {
          // quality === 3
          newInterval = Math.round(interval * newEaseFactor);
        }
      }

      easeFactor = newEaseFactor;
      interval = newInterval;
      repetitions = nextRepetitions;
    }

    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + interval);

    return { easeFactor, interval, repetitions, nextReviewAt };
  }

  /**
   * Determine if a memo is eligible for spaced repetition based on user's filter rules.
   * Exclude rules take priority over include rules.
   * If no rules exist, all memos are eligible.
   */
  private async isMemoEligible(userId: string, memoId: string): Promise<boolean> {
    const db = getDatabase();

    // Fetch the memo to check its category and tags
    const memoResults = await db
      .select()
      .from(memos)
      .where(and(eq(memos.memoId, memoId), eq(memos.uid, userId), eq(memos.deletedAt, 0)))
      .limit(1);

    if (memoResults.length === 0) {
      return false;
    }

    const memo = memoResults[0];

    // Fetch user's filter rules
    const rules = await db
      .select()
      .from(spacedRepetitionRules)
      .where(eq(spacedRepetitionRules.userId, userId));

    // No rules: all memos are eligible
    if (rules.length === 0) {
      return true;
    }

    const excludeRules = rules.filter((r) => r.mode === 'exclude');
    const includeRules = rules.filter((r) => r.mode === 'include');

    // Get memo's tag names for tag-based filtering
    const memoTagIds = memo.tagIds || [];
    let memoTagNames: string[] = [];
    if (memoTagIds.length > 0) {
      const tagRecords = await db
        .select({ name: tags.name, tagId: tags.tagId })
        .from(tags)
        .where(and(eq(tags.uid, userId), eq(tags.deletedAt, 0)));
      const tagIdToName = new Map(tagRecords.map((t) => [t.tagId, t.name]));
      memoTagNames = memoTagIds.map((id) => tagIdToName.get(id)).filter(Boolean) as string[];
    }

    // Check exclude rules first (exclude takes priority)
    for (const rule of excludeRules) {
      if (rule.filterType === 'category') {
        if (memo.categoryId === rule.filterValue) {
          return false;
        }
      } else if (rule.filterType === 'tag') {
        if (memoTagNames.includes(rule.filterValue)) {
          return false;
        }
      }
    }

    // If there are include rules, memo must match at least one
    if (includeRules.length > 0) {
      for (const rule of includeRules) {
        if (rule.filterType === 'category') {
          if (memo.categoryId === rule.filterValue) {
            return true;
          }
        } else if (rule.filterType === 'tag') {
          if (memoTagNames.includes(rule.filterValue)) {
            return true;
          }
        }
      }
      // Has include rules but memo doesn't match any
      return false;
    }

    // Only exclude rules exist and memo didn't match any exclude rule
    return true;
  }

  /**
   * Create a SR card for a memo if eligible and not already existing.
   * Initial values: easeFactor=2.5, interval=1, repetitions=0, nextReviewAt=tomorrow 08:00
   */
  async createCardIfEligible(userId: string, memoId: string): Promise<void> {
    try {
      const db = getDatabase();

      // Check if card already exists for this user+memo
      const existing = await db
        .select({ cardId: spacedRepetitionCards.cardId })
        .from(spacedRepetitionCards)
        .where(
          and(
            eq(spacedRepetitionCards.userId, userId),
            eq(spacedRepetitionCards.memoId, memoId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return; // Card already exists, skip
      }

      const eligible = await this.isMemoEligible(userId, memoId);
      if (!eligible) {
        return;
      }

      // Set nextReviewAt to tomorrow at 08:00
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0);

      const cardId = generateTypeId(OBJECT_TYPE.REVIEW_ITEM);

      await db.insert(spacedRepetitionCards).values({
        cardId,
        userId,
        memoId,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
        nextReviewAt: tomorrow,
      });

      logger.info('Created SR card:', { cardId, userId, memoId });
    } catch (error) {
      logger.error('Error creating SR card:', error);
      // Don't throw - card creation is a side effect, not critical
    }
  }

  /**
   * Re-evaluate whether a card should exist for a memo.
   * - Should be included but card doesn't exist: create it
   * - Should be excluded but card exists: delete it
   * - Should be included and card already exists: no-op
   */
  async reevaluateCard(userId: string, memoId: string): Promise<void> {
    try {
      const db = getDatabase();

      const eligible = await this.isMemoEligible(userId, memoId);

      const existing = await db
        .select({ cardId: spacedRepetitionCards.cardId })
        .from(spacedRepetitionCards)
        .where(
          and(
            eq(spacedRepetitionCards.userId, userId),
            eq(spacedRepetitionCards.memoId, memoId)
          )
        )
        .limit(1);

      const cardExists = existing.length > 0;

      if (eligible && !cardExists) {
        // Should be included but card doesn't exist: create it
        await this.createCardIfEligible(userId, memoId);
      } else if (!eligible && cardExists) {
        // Should be excluded but card exists: delete it
        await db
          .delete(spacedRepetitionCards)
          .where(
            and(
              eq(spacedRepetitionCards.userId, userId),
              eq(spacedRepetitionCards.memoId, memoId)
            )
          );
        logger.info('Deleted SR card due to rule change:', { userId, memoId });
      }
      // If eligible && cardExists: no-op
    } catch (error) {
      logger.error('Error re-evaluating SR card:', error);
      // Don't throw - reevaluation is a side effect, not critical
    }
  }

  /**
   * Delete all SR cards for a memo (cascade delete).
   * Safe to call even if no cards exist.
   */
  async deleteCardsByMemo(memoId: string): Promise<void> {
    try {
      const db = getDatabase();
      await db
        .delete(spacedRepetitionCards)
        .where(eq(spacedRepetitionCards.memoId, memoId));
      logger.info('Deleted SR cards for memo:', { memoId });
    } catch (error) {
      logger.error('Error deleting SR cards for memo:', error);
      // Don't throw - deletion is a side effect, not critical
    }
  }

  /**
   * Get a card by ID, verifying it belongs to the user.
   */
  async getCardById(cardId: string, userId: string): Promise<SpacedRepetitionCard | null> {
    const db = getDatabase();
    const results = await db
      .select()
      .from(spacedRepetitionCards)
      .where(
        and(eq(spacedRepetitionCards.cardId, cardId), eq(spacedRepetitionCards.userId, userId))
      )
      .limit(1);
    return results[0] ?? null;
  }

  /**
   * Get all due cards for a user (nextReviewAt <= now), ordered by nextReviewAt asc.
   */
  async getDueCards(userId: string): Promise<SpacedRepetitionCard[]> {
    const db = getDatabase();
    const now = new Date();
    return await db
      .select()
      .from(spacedRepetitionCards)
      .where(
        and(
          eq(spacedRepetitionCards.userId, userId),
          lte(spacedRepetitionCards.nextReviewAt, now)
        )
      )
      .orderBy(spacedRepetitionCards.nextReviewAt);
  }

  /**
   * Get total card count for a user.
   */
  async getTotalCardCount(userId: string): Promise<number> {
    const db = getDatabase();
    const result = await db
      .select({ count: spacedRepetitionCards.cardId })
      .from(spacedRepetitionCards)
      .where(eq(spacedRepetitionCards.userId, userId));
    return result.length;
  }

  /**
   * Update a card after review.
   */
  async updateCardAfterReview(
    cardId: string,
    userId: string,
    updates: { easeFactor: number; interval: number; repetitions: number; nextReviewAt: Date; lastReviewAt: Date }
  ): Promise<SpacedRepetitionCard | null> {
    const db = getDatabase();
    await db
      .update(spacedRepetitionCards)
      .set(updates)
      .where(
        and(eq(spacedRepetitionCards.cardId, cardId), eq(spacedRepetitionCards.userId, userId))
      );
    return this.getCardById(cardId, userId);
  }

  // ==================== Settings Methods ====================

  /**
   * Get SR settings for a user.
   */
  async getSettings(userId: string): Promise<{ srEnabled: boolean; srDailyLimit: number } | null> {
    const db = getDatabase();
    const results = await db
      .select({ srEnabled: users.srEnabled, srDailyLimit: users.srDailyLimit })
      .from(users)
      .where(and(eq(users.uid, userId), eq(users.deletedAt, 0)))
      .limit(1);
    return results[0] ?? null;
  }

  /**
   * Update SR settings for a user.
   */
  async updateSettings(
    userId: string,
    updates: { srEnabled?: boolean; srDailyLimit?: number }
  ): Promise<{ srEnabled: boolean; srDailyLimit: number } | null> {
    const db = getDatabase();
    await db
      .update(users)
      .set(updates)
      .where(and(eq(users.uid, userId), eq(users.deletedAt, 0)));
    return this.getSettings(userId);
  }

  // ==================== Rules Methods ====================

  /**
   * Get all SR filter rules for a user.
   */
  async getRules(userId: string): Promise<SpacedRepetitionRule[]> {
    const db = getDatabase();
    return db
      .select()
      .from(spacedRepetitionRules)
      .where(eq(spacedRepetitionRules.userId, userId));
  }

  /**
   * Create a new SR filter rule.
   */
  async createRule(
    userId: string,
    data: { mode: 'include' | 'exclude'; filterType: 'category' | 'tag'; filterValue: string }
  ): Promise<SpacedRepetitionRule> {
    const db = getDatabase();
    const ruleId = generateTypeId(OBJECT_TYPE.SR_RULE);
    await db.insert(spacedRepetitionRules).values({
      ruleId,
      userId,
      mode: data.mode,
      filterType: data.filterType,
      filterValue: data.filterValue,
    });
    const results = await db
      .select()
      .from(spacedRepetitionRules)
      .where(eq(spacedRepetitionRules.ruleId, ruleId))
      .limit(1);
    return results[0];
  }

  /**
   * Get all due cards grouped by userId for all SR-enabled users.
   * Returns a map of userId -> { cards, srDailyLimit }.
   * Only returns users with srEnabled=true who have at least one due card.
   */
  async getDueCardsForAllSREnabledUsers(): Promise<
    Map<string, { cards: SpacedRepetitionCard[]; srDailyLimit: number }>
  > {
    const db = getDatabase();
    const now = new Date();

    // Get all SR-enabled users
    const srUsers = await db
      .select({ uid: users.uid, srDailyLimit: users.srDailyLimit })
      .from(users)
      .where(and(eq(users.srEnabled, true), eq(users.deletedAt, 0)));

    if (srUsers.length === 0) {
      return new Map();
    }

    const userIds = srUsers.map((u) => u.uid);

    // Get all due cards for these users
    const dueCards = await db
      .select()
      .from(spacedRepetitionCards)
      .where(
        and(
          inArray(spacedRepetitionCards.userId, userIds),
          lte(spacedRepetitionCards.nextReviewAt, now)
        )
      )
      .orderBy(spacedRepetitionCards.nextReviewAt);

    // Group by userId
    const result = new Map<string, { cards: SpacedRepetitionCard[]; srDailyLimit: number }>();
    const userLimitMap = new Map<string, number>(srUsers.map((u) => [u.uid, u.srDailyLimit as number]));

    for (const card of dueCards) {
      if (!result.has(card.userId)) {
        result.set(card.userId, {
          cards: [],
          srDailyLimit: userLimitMap.get(card.userId) ?? 5,
        });
      }
      result.get(card.userId)!.cards.push(card);
    }

    return result;
  }

  /**
   * Delete a SR filter rule. Returns false if rule not found or doesn't belong to user.
   */
  async deleteRule(ruleId: string, userId: string): Promise<boolean> {
    const db = getDatabase();
    const existing = await db
      .select({ ruleId: spacedRepetitionRules.ruleId })
      .from(spacedRepetitionRules)
      .where(
        and(
          eq(spacedRepetitionRules.ruleId, ruleId),
          eq(spacedRepetitionRules.userId, userId)
        )
      )
      .limit(1);
    if (existing.length === 0) {
      return false;
    }
    await db
      .delete(spacedRepetitionRules)
      .where(
        and(
          eq(spacedRepetitionRules.ruleId, ruleId),
          eq(spacedRepetitionRules.userId, userId)
        )
      );
    return true;
  }

  /**
   * Import all existing memos for a user into the SR pool.
   * Returns the count of imported and skipped memos.
   */
  async importExistingMemos(userId: string): Promise<{ imported: number; skipped: number }> {
    const db = getDatabase();

    // Get all non-deleted memos for this user
    const userMemos = await db
      .select({ memoId: memos.memoId })
      .from(memos)
      .where(and(eq(memos.uid, userId), eq(memos.deletedAt, 0)));

    let imported = 0;
    let skipped = 0;

    for (const memo of userMemos) {
      try {
        const eligible = await this.isMemoEligible(userId, memo.memoId);

        if (!eligible) {
          skipped++;
          continue;
        }

        // Check if card already exists
        const existing = await db
          .select({ cardId: spacedRepetitionCards.cardId })
          .from(spacedRepetitionCards)
          .where(
            and(
              eq(spacedRepetitionCards.userId, userId),
              eq(spacedRepetitionCards.memoId, memo.memoId)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        // Create new card with nextReviewAt = tomorrow 08:00
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(8, 0, 0, 0);

        const cardId = generateTypeId(OBJECT_TYPE.REVIEW_ITEM);

        await db.insert(spacedRepetitionCards).values({
          cardId,
          userId,
          memoId: memo.memoId,
          easeFactor: 2.5,
          interval: 1,
          repetitions: 0,
          nextReviewAt: tomorrow,
        });

        imported++;
        logger.info('Imported SR card from existing memo:', { cardId, userId, memoId: memo.memoId });
      } catch (error) {
        logger.error('Error importing memo to SR:', { memoId: memo.memoId, error });
        skipped++;
      }
    }

    logger.info('SR import completed:', { userId, imported, skipped });
    return { imported, skipped };
  }
}
