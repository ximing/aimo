import { Service } from 'typedi';
import { eq, and, desc } from 'drizzle-orm';
import { ChatOpenAI } from '@langchain/openai';

import { config } from '../config/config.js';
import { getDatabase } from '../db/connection.js';
import { reviewItems } from '../db/schema/review-items.js';
import { reviewProfiles } from '../db/schema/review-profiles.js';
import { reviewSessions } from '../db/schema/review-sessions.js';
import { memos } from '../db/schema/memos.js';
import { OBJECT_TYPE } from '../models/constant/type.js';
import { generateTypeId } from '../utils/id.js';
import { logger } from '../utils/logger.js';

import { MemoService } from './memo.service.js';
import { getModelClient } from './model-client.helper.js';

import type {
  CreateReviewSessionDto,
  CreateReviewProfileDto,
  UpdateReviewProfileDto,
  ReviewProfileDto,
  ReviewSessionDto,
  ReviewItemDto,
  SubmitAnswerDto,
  SubmitAnswerResponseDto,
  CompleteSessionResponseDto,
  ReviewHistoryItemDto,
  MasteryLevel,
  ProfileFilterRule,
} from '@aimo/dto';

@Service()
export class ReviewService {
  constructor(private memoService: MemoService) {}

  async createSession(uid: string, dto: CreateReviewSessionDto): Promise<ReviewSessionDto> {
    const db = getDatabase();
    let scope = dto.scope ?? 'all';
    let scopeValue = dto.scopeValue;
    let count = Math.min(Math.max(dto.questionCount ?? 7, 5), 20);
    let filterRules: ProfileFilterRule[] | undefined;

    // If profileId is provided, use profile settings
    let profileId: string | undefined;
    let userModelId: string | null = null;
    if (dto.profileId) {
      const profile = await this.getProfileById(uid, dto.profileId);
      if (!profile) {
        throw new Error('Review profile not found');
      }
      profileId = dto.profileId;
      userModelId = profile.userModelId ?? null;
      count = Math.min(Math.max(profile.questionCount, 5), 20);
      filterRules = profile.filterRules;
      // For DB storage, keep scope/scopeValue for backward compat
      scope = 'all';
    }

    // Select memos based on filter rules or legacy scope
    const selectedMemos = filterRules
      ? await this.selectMemosByRules(uid, filterRules, count)
      : await this.selectMemosByScope(uid, scope, scopeValue, count);

    if (selectedMemos.length === 0) {
      throw new Error('No memos available for review in the selected scope');
    }

    const sessionId = generateTypeId(OBJECT_TYPE.REVIEW_SESSION);

    await db.insert(reviewSessions).values({
      sessionId,
      uid,
      profileId,
      scope,
      scopeValue,
      status: 'active',
    });

    // Generate questions for each memo
    const items: ReviewItemDto[] = [];
    for (let i = 0; i < selectedMemos.length; i++) {
      const memo = selectedMemos[i];
      const question = await this.generateQuestion(uid, userModelId, memo.content);
      const itemId = generateTypeId(OBJECT_TYPE.REVIEW_ITEM);

      await db.insert(reviewItems).values({
        itemId,
        sessionId,
        memoId: memo.memoId,
        question,
        order: i,
      });

      items.push({
        itemId,
        sessionId,
        memoId: memo.memoId,
        memoContent: memo.content,
        question,
        order: i,
      });
    }

    return {
      sessionId,
      uid,
      scope,
      scopeValue,
      status: 'active',
      items,
      createdAt: new Date().toISOString(),
    };
  }

  async getSession(uid: string, sessionId: string): Promise<ReviewSessionDto | null> {
    const db = getDatabase();
    const [session] = await db
      .select()
      .from(reviewSessions)
      .where(and(eq(reviewSessions.sessionId, sessionId), eq(reviewSessions.uid, uid)));
    if (!session) return null;

    const items = await db
      .select()
      .from(reviewItems)
      .where(eq(reviewItems.sessionId, sessionId))
      .orderBy(reviewItems.order);

    return await this.toSessionDto(session, items);
  }

  async submitAnswer(
    uid: string,
    sessionId: string,
    dto: SubmitAnswerDto
  ): Promise<SubmitAnswerResponseDto> {
    const db = getDatabase();
    const [item] = await db.select().from(reviewItems).where(eq(reviewItems.itemId, dto.itemId));
    if (!item || item.sessionId !== sessionId) throw new Error('Item not found');

    const [memo] = await db.select().from(memos).where(eq(memos.memoId, item.memoId));
    if (!memo) throw new Error('Memo not found');

    // Get session to find profileId and userModelId
    const [session] = await db
      .select()
      .from(reviewSessions)
      .where(eq(reviewSessions.sessionId, sessionId));

    let userModelId: string | null = null;
    if (session?.profileId) {
      const profile = await this.getProfileById(uid, session.profileId);
      if (profile) {
        userModelId = profile.userModelId ?? null;
      }
    }

    const { feedback, mastery } = await this.evaluateAnswer(
      uid,
      userModelId,
      dto.answer,
      memo.content,
      item.question
    );

    await db
      .update(reviewItems)
      .set({ userAnswer: dto.answer, aiFeedback: feedback, mastery })
      .where(eq(reviewItems.itemId, dto.itemId));

    return { itemId: dto.itemId, aiFeedback: feedback, mastery };
  }

  async completeSession(uid: string, sessionId: string): Promise<CompleteSessionResponseDto> {
    const db = getDatabase();
    const items = await db.select().from(reviewItems).where(eq(reviewItems.sessionId, sessionId));

    const score = this.calculateScore(items);

    await db
      .update(reviewSessions)
      .set({ status: 'completed', score, completedAt: new Date() })
      .where(eq(reviewSessions.sessionId, sessionId));

    const itemDtos = await Promise.all(
      items.map(async (i) => {
        const [memo] = await db
          .select({ content: memos.content })
          .from(memos)
          .where(eq(memos.memoId, i.memoId));
        return {
          itemId: i.itemId,
          sessionId: i.sessionId,
          memoId: i.memoId,
          memoContent: memo?.content,
          question: i.question,
          userAnswer: i.userAnswer ?? undefined,
          aiFeedback: i.aiFeedback ?? undefined,
          mastery: i.mastery ?? undefined,
          order: i.order,
        };
      })
    );

    return { sessionId, score, items: itemDtos };
  }

  async getHistory(uid: string): Promise<ReviewHistoryItemDto[]> {
    const db = getDatabase();
    const sessions = await db
      .select()
      .from(reviewSessions)
      .where(eq(reviewSessions.uid, uid))
      .orderBy(desc(reviewSessions.createdAt))
      .limit(50);

    const result: ReviewHistoryItemDto[] = [];
    for (const s of sessions) {
      const items = await db
        .select({ itemId: reviewItems.itemId })
        .from(reviewItems)
        .where(eq(reviewItems.sessionId, s.sessionId));
      result.push({
        sessionId: s.sessionId,
        scope: s.scope,
        scopeValue: s.scopeValue ?? undefined,
        score: s.score ?? undefined,
        itemCount: items.length,
        createdAt: s.createdAt.toISOString(),
        completedAt: s.completedAt?.toISOString(),
      });
    }
    return result;
  }

  // Review Profile CRUD
  async getProfiles(uid: string): Promise<ReviewProfileDto[]> {
    const db = getDatabase();
    const profiles = await db
      .select()
      .from(reviewProfiles)
      .where(eq(reviewProfiles.userId, uid))
      .orderBy(desc(reviewProfiles.createdAt));

    return profiles.map((p) => this.toProfileDto(p));
  }

  async createProfile(uid: string, dto: CreateReviewProfileDto): Promise<ReviewProfileDto> {
    const db = getDatabase();
    const profileId = generateTypeId(OBJECT_TYPE.REVIEW_SESSION);
    const now = new Date();

    // Store filterRules in the filterValues JSON column
    await db.insert(reviewProfiles).values({
      profileId,
      userId: uid,
      name: dto.name,
      scope: 'all',
      filterValues: dto.filterRules as unknown as string[],
      recentDays: null,
      questionCount: dto.questionCount ?? 10,
      createdAt: now,
      updatedAt: now,
    });

    return {
      profileId,
      userId: uid,
      name: dto.name,
      filterRules: dto.filterRules,
      questionCount: dto.questionCount ?? 10,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  async updateProfile(
    uid: string,
    profileId: string,
    dto: UpdateReviewProfileDto
  ): Promise<ReviewProfileDto | null> {
    const db = getDatabase();
    const [existing] = await db
      .select()
      .from(reviewProfiles)
      .where(and(eq(reviewProfiles.profileId, profileId), eq(reviewProfiles.userId, uid)));

    if (!existing) return null;

    const updates: Partial<typeof reviewProfiles.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.filterRules !== undefined)
      updates.filterValues = dto.filterRules as unknown as string[];
    if (dto.questionCount !== undefined) updates.questionCount = dto.questionCount;

    await db.update(reviewProfiles).set(updates).where(eq(reviewProfiles.profileId, profileId));

    const [updated] = await db
      .select()
      .from(reviewProfiles)
      .where(eq(reviewProfiles.profileId, profileId));

    return this.toProfileDto(updated);
  }

  async deleteProfile(uid: string, profileId: string): Promise<boolean> {
    const db = getDatabase();
    const [profile] = await db
      .select()
      .from(reviewProfiles)
      .where(and(eq(reviewProfiles.profileId, profileId), eq(reviewProfiles.userId, uid)));

    if (!profile) return false;

    await db.delete(reviewProfiles).where(eq(reviewProfiles.profileId, profileId));
    return true;
  }

  async getProfileById(uid: string, profileId: string): Promise<ReviewProfileDto | null> {
    const db = getDatabase();
    const [profile] = await db
      .select()
      .from(reviewProfiles)
      .where(and(eq(reviewProfiles.profileId, profileId), eq(reviewProfiles.userId, uid)));

    if (!profile) return null;
    return this.toProfileDto(profile);
  }

  /**
   * Select memos using structured filter rules (AND logic).
   * Include rules narrow the set; exclude rules remove from the set.
   */
  private async selectMemosByRules(uid: string, rules: ProfileFilterRule[], count: number) {
    // Fetch a large pool first
    const result = await this.memoService.getMemos({ uid, limit: 200, page: 1 });
    let pool = result.items;

    for (const rule of rules) {
      if (rule.type === 'category') {
        if (rule.operator === 'include') {
          pool = pool.filter((m) => m.categoryId === rule.value);
        } else {
          pool = pool.filter((m) => m.categoryId !== rule.value);
        }
      } else if (rule.type === 'tag') {
        if (rule.operator === 'include') {
          pool = pool.filter((m) =>
            m.tags?.some((t) => t.name === rule.value || t.tagId === rule.value)
          );
        } else {
          pool = pool.filter(
            (m) => !m.tags?.some((t) => t.name === rule.value || t.tagId === rule.value)
          );
        }
      } else if (rule.type === 'recent_days') {
        const days = parseInt(rule.value, 10) || 7;
        const cutoff = Date.now() - days * 86400000;
        pool = pool.filter((m) => m.createdAt >= cutoff);
      } else if (rule.type === 'date_range') {
        const [startISO, endISO] = rule.value.split(',');
        const start = startISO ? new Date(startISO).getTime() : 0;
        const end = endISO ? new Date(endISO).getTime() : Infinity;
        pool = pool.filter((m) => m.createdAt >= start && m.createdAt <= end);
      }
    }

    // Shuffle and pick
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  }

  /** Legacy scope-based memo selection (for sessions created without a profile). */
  private async selectMemosByScope(
    uid: string,
    scope: string,
    scopeValue?: string,
    count: number = 7
  ) {
    const options = { uid, limit: 50, page: 1 } as any;

    if (scope === 'category' && scopeValue) {
      options.categoryId = scopeValue;
    }
    if (scope === 'tag' && scopeValue) {
      options.tags = [scopeValue];
    }
    if (scope === 'recent' && scopeValue) {
      const days = parseInt(scopeValue, 10) || 7;
      options.startDate = new Date(Date.now() - days * 86400000);
    }

    const result = await this.memoService.getMemos(options);
    let all = result.items;

    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, count);
  }

  private toProfileDto(p: any): ReviewProfileDto {
    // filterValues column stores ProfileFilterRule[] in new format
    let filterRules: ProfileFilterRule[] = [];
    if (Array.isArray(p.filterValues) && p.filterValues.length > 0) {
      const first = p.filterValues[0];
      if (typeof first === 'object' && first !== null && 'type' in first) {
        // New format: ProfileFilterRule[]
        filterRules = p.filterValues as ProfileFilterRule[];
      }
      // Old string[] format: leave filterRules empty (graceful degradation)
    }

    return {
      profileId: p.profileId,
      userId: p.userId,
      name: p.name,
      filterRules,
      questionCount: p.questionCount,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
      updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
    };
  }

  private async generateQuestion(
    userId: string,
    userModelId: string | null,
    content: string
  ): Promise<string> {
    const db = getDatabase();
    const model = await getModelClient(db, userId, userModelId);
    const truncated = content.slice(0, 1000);
    const response = await model.invoke([
      {
        role: 'system',
        content:
          '你是一个知识回顾助手。根据笔记内容，生成一个简洁的问题来测试用户是否记得这条笔记的核心内容。问题应该是开放性的，用中文，不超过50字。只输出问题本身，不要加任何前缀。',
      },
      { role: 'user', content: `笔记内容：${truncated}` },
    ]);
    return response.content as string;
  }

  private async evaluateAnswer(
    userId: string,
    userModelId: string | null,
    answer: string,
    memoContent: string,
    question: string
  ): Promise<{ feedback: string; mastery: MasteryLevel }> {
    const db = getDatabase();
    const model = await getModelClient(db, userId, userModelId);
    const response = await model.invoke([
      {
        role: 'system',
        content:
          '你是一个知识回顾评估助手。对比用户的回答和原始笔记，评估掌握程度并给出反馈。\n\n输出格式（严格JSON）：{"mastery": "remembered"|"fuzzy"|"forgot", "feedback": "评估反馈文字"}\n\n评估标准：remembered=核心内容都答对了；fuzzy=部分正确但有遗漏；forgot=基本没答对或没回答',
      },
      {
        role: 'user',
        content: `问题：${question}\n\n用户回答：${answer}\n\n原始笔记：${memoContent.slice(0, 1000)}`,
      },
    ]);
    try {
      const parsed = JSON.parse(response.content as string);
      return { feedback: parsed.feedback, mastery: parsed.mastery };
    } catch {
      return { feedback: response.content as string, mastery: 'fuzzy' };
    }
  }

  private calculateScore(items: Array<{ mastery?: string | null }>): number {
    if (items.length === 0) return 0;
    const weights = { remembered: 1, fuzzy: 0.5, forgot: 0 };
    const total = items.reduce((sum, item) => {
      return sum + (weights[item.mastery as keyof typeof weights] ?? 0);
    }, 0);
    return Math.round((total / items.length) * 100);
  }

  private async toSessionDto(session: any, items: any[]): Promise<ReviewSessionDto> {
    const db = getDatabase();
    const itemsWithContent = await Promise.all(
      items.map(async (i) => {
        const [memo] = await db
          .select({ content: memos.content })
          .from(memos)
          .where(eq(memos.memoId, i.memoId));
        return {
          itemId: i.itemId,
          sessionId: i.sessionId,
          memoId: i.memoId,
          memoContent: memo?.content,
          question: i.question,
          userAnswer: i.userAnswer ?? undefined,
          aiFeedback: i.aiFeedback ?? undefined,
          mastery: i.mastery ?? undefined,
          order: i.order,
        };
      })
    );
    return {
      sessionId: session.sessionId,
      uid: session.uid,
      scope: session.scope,
      scopeValue: session.scopeValue ?? undefined,
      status: session.status,
      score: session.score ?? undefined,
      items: itemsWithContent,
      createdAt: session.createdAt.toISOString(),
      completedAt: session.completedAt?.toISOString(),
    };
  }
}
