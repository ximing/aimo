import { Service } from 'typedi';
import { eq, and, desc } from 'drizzle-orm';
import { ChatOpenAI } from '@langchain/openai';

import { config } from '../config/config.js';
import { getDatabase } from '../db/connection.js';
import { reviewSessions } from '../db/schema/review-sessions.js';
import { reviewItems } from '../db/schema/review-items.js';
import { memos } from '../db/schema/memos.js';
import { OBJECT_TYPE } from '../models/constant/type.js';
import { generateTypeId } from '../utils/id.js';
import { logger } from '../utils/logger.js';

import { MemoService } from './memo.service.js';

import type {
  CreateReviewSessionDto,
  ReviewSessionDto,
  ReviewItemDto,
  SubmitAnswerDto,
  SubmitAnswerResponseDto,
  CompleteSessionResponseDto,
  ReviewHistoryItemDto,
  MasteryLevel,
  MemoSearchOptionsDto,
} from '@aimo/dto';

@Service()
export class ReviewService {
  private model: ChatOpenAI;

  constructor(private memoService: MemoService) {
    this.model = new ChatOpenAI({
      modelName: config.openai.model || 'gpt-4o-mini',
      apiKey: config.openai.apiKey,
      configuration: { baseURL: config.openai.baseURL },
      temperature: 0.5,
    });
  }

  async createSession(uid: string, dto: CreateReviewSessionDto): Promise<ReviewSessionDto> {
    const db = getDatabase();
    const count = Math.min(Math.max(dto.questionCount ?? 7, 5), 10);

    // Select memos based on scope
    const selectedMemos = await this.selectMemos(uid, dto.scope, dto.scopeValue, count);
    if (selectedMemos.length === 0) {
      throw new Error('No memos available for review in the selected scope');
    }

    const sessionId = generateTypeId(OBJECT_TYPE.REVIEW_SESSION);

    await db.insert(reviewSessions).values({
      sessionId,
      uid,
      scope: dto.scope,
      scopeValue: dto.scopeValue,
      status: 'active',
    });

    // Generate questions for each memo
    const items: ReviewItemDto[] = [];
    for (let i = 0; i < selectedMemos.length; i++) {
      const memo = selectedMemos[i];
      const question = await this.generateQuestion(memo.content);
      const itemId = generateTypeId(OBJECT_TYPE.REVIEW_ITEM);

      await db.insert(reviewItems).values({
        itemId,
        sessionId,
        memoId: memo.memoId,
        question,
        order: i,
      });

      items.push({ itemId, sessionId, memoId: memo.memoId, question, order: i });
    }

    return { sessionId, uid, scope: dto.scope, scopeValue: dto.scopeValue, status: 'active', items, createdAt: new Date().toISOString() };
  }

  async getSession(uid: string, sessionId: string): Promise<ReviewSessionDto | null> {
    const db = getDatabase();
    const [session] = await db.select().from(reviewSessions)
      .where(and(eq(reviewSessions.sessionId, sessionId), eq(reviewSessions.uid, uid)));
    if (!session) return null;

    const items = await db.select().from(reviewItems)
      .where(eq(reviewItems.sessionId, sessionId))
      .orderBy(reviewItems.order);

    return this.toSessionDto(session, items);
  }

  async submitAnswer(uid: string, sessionId: string, dto: SubmitAnswerDto): Promise<SubmitAnswerResponseDto> {
    const db = getDatabase();
    const [item] = await db.select().from(reviewItems)
      .where(eq(reviewItems.itemId, dto.itemId));
    if (!item || item.sessionId !== sessionId) throw new Error('Item not found');

    const [memo] = await db.select().from(memos).where(eq(memos.memoId, item.memoId));
    if (!memo) throw new Error('Memo not found');

    const { feedback, mastery } = await this.evaluateAnswer(dto.answer, memo.content, item.question);

    await db.update(reviewItems)
      .set({ userAnswer: dto.answer, aiFeedback: feedback, mastery })
      .where(eq(reviewItems.itemId, dto.itemId));

    return { itemId: dto.itemId, aiFeedback: feedback, mastery };
  }

  async completeSession(uid: string, sessionId: string): Promise<CompleteSessionResponseDto> {
    const db = getDatabase();
    const items = await db.select().from(reviewItems)
      .where(eq(reviewItems.sessionId, sessionId));

    const score = this.calculateScore(items);

    await db.update(reviewSessions)
      .set({ status: 'completed', score, completedAt: new Date() })
      .where(eq(reviewSessions.sessionId, sessionId));

    const itemDtos = items.map((i) => ({
      itemId: i.itemId, sessionId: i.sessionId, memoId: i.memoId,
      question: i.question, userAnswer: i.userAnswer ?? undefined,
      aiFeedback: i.aiFeedback ?? undefined, mastery: i.mastery ?? undefined,
      order: i.order,
    }));

    return { sessionId, score, items: itemDtos };
  }

  async getHistory(uid: string): Promise<ReviewHistoryItemDto[]> {
    const db = getDatabase();
    const sessions = await db.select().from(reviewSessions)
      .where(eq(reviewSessions.uid, uid))
      .orderBy(desc(reviewSessions.createdAt))
      .limit(50);

    const result: ReviewHistoryItemDto[] = [];
    for (const s of sessions) {
      const items = await db.select({ itemId: reviewItems.itemId })
        .from(reviewItems).where(eq(reviewItems.sessionId, s.sessionId));
      result.push({
        sessionId: s.sessionId, scope: s.scope, scopeValue: s.scopeValue ?? undefined,
        score: s.score ?? undefined, itemCount: items.length,
        createdAt: s.createdAt.toISOString(), completedAt: s.completedAt?.toISOString(),
      });
    }
    return result;
  }

  private async selectMemos(uid: string, scope: string, scopeValue?: string, count: number = 7) {
    const options: MemoSearchOptionsDto = { uid, limit: 50, page: 1 };
    if (scope === 'category' && scopeValue) options.categoryId = scopeValue;
    if (scope === 'tag' && scopeValue) options.tags = [scopeValue];
    if (scope === 'recent' && scopeValue) {
      const days = parseInt(scopeValue, 10) || 7;
      options.startDate = new Date(Date.now() - days * 86400000);
    }
    const result = await this.memoService.getMemos(options);
    const all = result.items;
    // Shuffle and pick count
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, count);
  }

  private async generateQuestion(content: string): Promise<string> {
    const truncated = content.slice(0, 1000);
    const response = await this.model.invoke([
      { role: 'system', content: '你是一个知识回顾助手。根据笔记内容，生成一个简洁的问题来测试用户是否记得这条笔记的核心内容。问题应该是开放性的，用中文，不超过50字。只输出问题本身，不要加任何前缀。' },
      { role: 'user', content: `笔记内容：${truncated}` },
    ]);
    return response.content as string;
  }

  private async evaluateAnswer(answer: string, memoContent: string, question: string): Promise<{ feedback: string; mastery: MasteryLevel }> {
    const response = await this.model.invoke([
      { role: 'system', content: '你是一个知识回顾评估助手。对比用户的回答和原始笔记，评估掌握程度并给出反馈。\n\n输出格式（严格JSON）：{"mastery": "remembered"|"fuzzy"|"forgot", "feedback": "评估反馈文字"}\n\n评估标准：remembered=核心内容都答对了；fuzzy=部分正确但有遗漏；forgot=基本没答对或没回答' },
      { role: 'user', content: `问题：${question}\n\n用户回答：${answer}\n\n原始笔记：${memoContent.slice(0, 1000)}` },
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

  private buildQuestionPrompt(content: string): string {
    return `笔记内容：${content}`;
  }

  private toSessionDto(session: any, items: any[]): ReviewSessionDto {
    return {
      sessionId: session.sessionId, uid: session.uid, scope: session.scope,
      scopeValue: session.scopeValue ?? undefined, status: session.status,
      score: session.score ?? undefined,
      items: items.map((i) => ({
        itemId: i.itemId, sessionId: i.sessionId, memoId: i.memoId,
        question: i.question, userAnswer: i.userAnswer ?? undefined,
        aiFeedback: i.aiFeedback ?? undefined, mastery: i.mastery ?? undefined,
        order: i.order,
      })),
      createdAt: session.createdAt.toISOString(),
      completedAt: session.completedAt?.toISOString(),
    };
  }
}
