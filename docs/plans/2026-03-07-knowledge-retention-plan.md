# 知识沉淀与回顾功能实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 AIMO 闪念笔记应用实现四个知识沉淀与回顾功能：AI 回顾模式、间隔重复推送、周期摘要报告、知识图谱可视化。

**Architecture:** 后端新增 review/spaced-repetition/digest/graph 四套服务和控制器，使用 Drizzle ORM 新增 MySQL 表，复用现有 AI 服务、向量搜索、推送渠道和调度器。前端新增 /review 和 /graph 页面，扩展 /insights 和 /settings 页面。

**Tech Stack:** Express.js + TypeDI + Drizzle ORM (MySQL) + LanceDB + LangChain ChatOpenAI + node-cron + Cytoscape.js (frontend)

---

## 代码库关键约定

在开始前，了解以下约定：

- **ID 生成**：`generateTypeId(OBJECT_TYPE.XXX)` from `apps/server/src/utils/id.ts`，每种类型有前缀（如 memo→`m`, user→`u`）
- **DB 访问**：`getDatabase()` from `apps/server/src/db/connection.ts`，返回 Drizzle 实例
- **Schema 定义**：`mysqlTable()` from `drizzle-orm/mysql-core`，VARCHAR PK 长度固定 191（utf8mb4 限制）
- **响应格式**：`ResponseUtil.success(data)` / `ResponseUtil.error(ErrorCode.XXX)` from `apps/server/src/utils/response.ts`
- **依赖注入**：服务类加 `@Service()` 装饰器，控制器构造函数自动注入
- **认证**：受保护端点用 `@CurrentUser() user: UserInfoDto`
- **生成迁移**：必须先 build 再 generate：`cd apps/server && pnpm build && pnpm migrate:generate`
- **测试**：`cd apps/server && pnpm test -- apps/server/src/__tests__/xxx.test.ts`

---

# 功能一：AI 回顾模式（Review Mode）

---

### Task 1: DB Schema — review_sessions & review_items

**Files:**

- Modify: `apps/server/src/models/constant/type.ts`
- Create: `apps/server/src/db/schema/review-sessions.ts`
- Create: `apps/server/src/db/schema/review-items.ts`
- Modify: `apps/server/src/db/schema/index.ts`
- Test: `apps/server/src/__tests__/review-schema.test.ts`

**Step 1: Write the failing test**

```typescript
// apps/server/src/__tests__/review-schema.test.ts
import { reviewSessions, reviewItems } from '../db/schema/review-sessions.js';
import { reviewItems as ri } from '../db/schema/review-items.js';

describe('Review schemas', () => {
  it('reviewSessions has required columns', () => {
    expect(reviewSessions).toBeDefined();
    expect(reviewSessions.sessionId).toBeDefined();
    expect(reviewSessions.uid).toBeDefined();
    expect(reviewSessions.scope).toBeDefined();
    expect(reviewSessions.status).toBeDefined();
  });

  it('reviewItems has required columns', () => {
    expect(ri).toBeDefined();
    expect(ri.itemId).toBeDefined();
    expect(ri.sessionId).toBeDefined();
    expect(ri.memoId).toBeDefined();
    expect(ri.question).toBeDefined();
    expect(ri.mastery).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/server && pnpm test -- apps/server/src/__tests__/review-schema.test.ts
```

Expected: FAIL — "Cannot find module"

**Step 3: Add OBJECT_TYPE constants**

In `apps/server/src/models/constant/type.ts`, add to `OBJECT_TYPE`:

```typescript
REVIEW_SESSION: 'REVIEW_SESSION',
REVIEW_ITEM: 'REVIEW_ITEM',
```

**Step 4: Create review-sessions schema**

```typescript
// apps/server/src/db/schema/review-sessions.ts
import { mysqlTable, varchar, int, timestamp, mysqlEnum, index } from 'drizzle-orm/mysql-core';

export const reviewSessions = mysqlTable(
  'review_sessions',
  {
    sessionId: varchar('session_id', { length: 191 }).primaryKey().notNull(),
    uid: varchar('uid', { length: 191 }).notNull(),
    scope: mysqlEnum('scope', ['all', 'category', 'tag', 'recent']).notNull().default('all'),
    scopeValue: varchar('scope_value', { length: 255 }),
    status: mysqlEnum('status', ['active', 'completed', 'abandoned']).notNull().default('active'),
    score: int('score'),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { mode: 'date', fsp: 3 }),
  },
  (table) => ({
    uidIdx: index('uid_idx').on(table.uid),
    statusIdx: index('status_idx').on(table.status),
  })
);

export type ReviewSession = typeof reviewSessions.$inferSelect;
export type NewReviewSession = typeof reviewSessions.$inferInsert;
```

**Step 5: Create review-items schema**

```typescript
// apps/server/src/db/schema/review-items.ts
import { mysqlTable, varchar, text, int, mysqlEnum, index } from 'drizzle-orm/mysql-core';

export const reviewItems = mysqlTable(
  'review_items',
  {
    itemId: varchar('item_id', { length: 191 }).primaryKey().notNull(),
    sessionId: varchar('session_id', { length: 191 }).notNull(),
    memoId: varchar('memo_id', { length: 191 }).notNull(),
    question: text('question').notNull(),
    userAnswer: text('user_answer'),
    aiFeedback: text('ai_feedback'),
    mastery: mysqlEnum('mastery', ['remembered', 'fuzzy', 'forgot']),
    order: int('order').notNull().default(0),
  },
  (table) => ({
    sessionIdIdx: index('session_id_idx').on(table.sessionId),
  })
);

export type ReviewItem = typeof reviewItems.$inferSelect;
export type NewReviewItem = typeof reviewItems.$inferInsert;
```

**Step 6: Export from schema/index.ts**

Add to `apps/server/src/db/schema/index.ts`:

```typescript
export * from './review-sessions.js';
export * from './review-items.js';
```

**Step 7: Run test to verify it passes**

```bash
cd apps/server && pnpm test -- apps/server/src/__tests__/review-schema.test.ts
```

Expected: PASS

**Step 8: Build and generate migration**

```bash
cd apps/server && pnpm build && pnpm migrate:generate
```

Expected: New migration file created in `drizzle/` folder with CREATE TABLE statements for `review_sessions` and `review_items`.

**Step 9: Commit**

```bash
git add apps/server/src/models/constant/type.ts \
        apps/server/src/db/schema/review-sessions.ts \
        apps/server/src/db/schema/review-items.ts \
        apps/server/src/db/schema/index.ts \
        apps/server/src/__tests__/review-schema.test.ts \
        apps/server/drizzle/
git commit -m "feat: add review_sessions and review_items DB schemas"
```

---

### Task 2: ID 生成 — generateReviewSessionId & generateReviewItemId

**Files:**

- Modify: `apps/server/src/utils/id.ts`
- Test: `apps/server/src/__tests__/review-id.test.ts`

**Step 1: Write the failing test**

```typescript
// apps/server/src/__tests__/review-id.test.ts
import { generateTypeId } from '../utils/id.js';
import { OBJECT_TYPE } from '../models/constant/type.js';

describe('Review ID generation', () => {
  it('generates review session ID with rev prefix', () => {
    const id = generateTypeId(OBJECT_TYPE.REVIEW_SESSION);
    expect(id).toMatch(/^rev/);
    expect(id.length).toBeGreaterThan(3);
  });

  it('generates review item ID with ri prefix', () => {
    const id = generateTypeId(OBJECT_TYPE.REVIEW_ITEM);
    expect(id).toMatch(/^ri/);
    expect(id.length).toBeGreaterThan(2);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/server && pnpm test -- apps/server/src/__tests__/review-id.test.ts
```

Expected: FAIL — "Invalid type: REVIEW_SESSION"

**Step 3: Add cases to generateTypeId switch**

In `apps/server/src/utils/id.ts`, add to the switch statement:

```typescript
case OBJECT_TYPE.REVIEW_SESSION: {
  return `rev${typeid()}`;
}
case OBJECT_TYPE.REVIEW_ITEM: {
  return `ri${typeid()}`;
}
```

**Step 4: Run test to verify it passes**

```bash
cd apps/server && pnpm test -- apps/server/src/__tests__/review-id.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/server/src/utils/id.ts apps/server/src/__tests__/review-id.test.ts
git commit -m "feat: add review session and item ID generators"
```

---

### Task 3: DTOs — Review types in @aimo/dto

**Files:**

- Create: `packages/dto/src/review.ts`
- Modify: `packages/dto/src/index.ts`

**Step 1: Create review.ts DTO file**

```typescript
// packages/dto/src/review.ts

export type ReviewScope = 'all' | 'category' | 'tag' | 'recent';
export type ReviewStatus = 'active' | 'completed' | 'abandoned';
export type MasteryLevel = 'remembered' | 'fuzzy' | 'forgot';

export interface CreateReviewSessionDto {
  scope: ReviewScope;
  /** categoryId, tagName, or number of days (for 'recent') */
  scopeValue?: string;
  /** Number of questions, 5-10. Defaults to 7. */
  questionCount?: number;
}

export interface ReviewItemDto {
  itemId: string;
  sessionId: string;
  memoId: string;
  question: string;
  userAnswer?: string;
  aiFeedback?: string;
  mastery?: MasteryLevel;
  order: number;
}

export interface ReviewSessionDto {
  sessionId: string;
  uid: string;
  scope: ReviewScope;
  scopeValue?: string;
  status: ReviewStatus;
  score?: number;
  items: ReviewItemDto[];
  createdAt: string;
  completedAt?: string;
}

export interface SubmitAnswerDto {
  itemId: string;
  answer: string;
}

export interface SubmitAnswerResponseDto {
  itemId: string;
  aiFeedback: string;
  mastery: MasteryLevel;
}

export interface CompleteSessionResponseDto {
  sessionId: string;
  score: number;
  items: ReviewItemDto[];
}

export interface ReviewHistoryItemDto {
  sessionId: string;
  scope: ReviewScope;
  scopeValue?: string;
  score?: number;
  itemCount: number;
  createdAt: string;
  completedAt?: string;
}
```

**Step 2: Export from packages/dto/src/index.ts**

Add to `packages/dto/src/index.ts`:

```typescript
// Review DTOs
export * from './review.js';
```

**Step 3: Rebuild DTO package**

```bash
pnpm --filter @aimo/dto build
```

Expected: Build succeeds, no TypeScript errors.

**Step 4: Commit**

```bash
git add packages/dto/src/review.ts packages/dto/src/index.ts packages/dto/dist/
git commit -m "feat: add Review DTOs to @aimo/dto"
```

---

### Task 4: ReviewService — core logic

**Files:**

- Create: `apps/server/src/services/review.service.ts`
- Test: `apps/server/src/__tests__/review.service.test.ts`

**Step 1: Write the failing tests**

```typescript
// apps/server/src/__tests__/review.service.test.ts
// Note: Mock MemoService and AIService dependencies

describe('ReviewService', () => {
  describe('calculateScore', () => {
    it('returns 100 when all items remembered', () => {
      const items = [{ mastery: 'remembered' }, { mastery: 'remembered' }];
      // Access private method via (service as any).calculateScore
      const score = (service as any).calculateScore(items);
      expect(score).toBe(100);
    });

    it('returns 0 when all items forgot', () => {
      const items = [{ mastery: 'forgot' }, { mastery: 'forgot' }];
      const score = (service as any).calculateScore(items);
      expect(score).toBe(0);
    });

    it('returns 50 when all items fuzzy', () => {
      const items = [{ mastery: 'fuzzy' }, { mastery: 'fuzzy' }];
      const score = (service as any).calculateScore(items);
      expect(score).toBe(50);
    });
  });

  describe('buildQuestionPrompt', () => {
    it('includes memo content in prompt', () => {
      const prompt = (service as any).buildQuestionPrompt('Today I learned about React hooks.');
      expect(prompt).toContain('React hooks');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/server && pnpm test -- apps/server/src/__tests__/review.service.test.ts
```

Expected: FAIL — "Cannot find module"

**Step 3: Implement ReviewService**

```typescript
// apps/server/src/services/review.service.ts
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

    return {
      sessionId,
      uid,
      scope: dto.scope,
      scopeValue: dto.scopeValue,
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

    return this.toSessionDto(session, items);
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

    const { feedback, mastery } = await this.evaluateAnswer(
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

    const itemDtos = items.map((i) => ({
      itemId: i.itemId,
      sessionId: i.sessionId,
      memoId: i.memoId,
      question: i.question,
      userAnswer: i.userAnswer ?? undefined,
      aiFeedback: i.aiFeedback ?? undefined,
      mastery: i.mastery ?? undefined,
      order: i.order,
    }));

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

  private async selectMemos(uid: string, scope: string, scopeValue?: string, count: number = 7) {
    const options: any = { uid, limit: 50, page: 1 };
    if (scope === 'category' && scopeValue) options.categoryId = scopeValue;
    if (scope === 'tag' && scopeValue) options.tags = [scopeValue];
    if (scope === 'recent' && scopeValue) {
      const days = parseInt(scopeValue, 10) || 7;
      options.startDate = new Date(Date.now() - days * 86400000);
    }
    const result = await this.memoService.listMemos(options);
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
    answer: string,
    memoContent: string,
    question: string
  ): Promise<{ feedback: string; mastery: MasteryLevel }> {
    const response = await this.model.invoke([
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

  private buildQuestionPrompt(content: string): string {
    return `笔记内容：${content}`;
  }

  private toSessionDto(session: any, items: any[]): ReviewSessionDto {
    return {
      sessionId: session.sessionId,
      uid: session.uid,
      scope: session.scope,
      scopeValue: session.scopeValue ?? undefined,
      status: session.status,
      score: session.score ?? undefined,
      items: items.map((i) => ({
        itemId: i.itemId,
        sessionId: i.sessionId,
        memoId: i.memoId,
        question: i.question,
        userAnswer: i.userAnswer ?? undefined,
        aiFeedback: i.aiFeedback ?? undefined,
        mastery: i.mastery ?? undefined,
        order: i.order,
      })),
      createdAt: session.createdAt.toISOString(),
      completedAt: session.completedAt?.toISOString(),
    };
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd apps/server && pnpm test -- apps/server/src/__tests__/review.service.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/server/src/services/review.service.ts apps/server/src/__tests__/review.service.test.ts
git commit -m "feat: implement ReviewService with AI question generation and evaluation"
```

---

### Task 5: ReviewController — REST endpoints

**Files:**

- Create: `apps/server/src/controllers/v1/review.controller.ts`
- Test: `apps/server/src/__tests__/review.controller.test.ts`

**Step 1: Write the failing test**

```typescript
// apps/server/src/__tests__/review.controller.test.ts
import { ReviewController } from '../controllers/v1/review.controller.js';

describe('ReviewController', () => {
  it('is defined', () => {
    expect(ReviewController).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/server && pnpm test -- apps/server/src/__tests__/review.controller.test.ts
```

Expected: FAIL — "Cannot find module"

**Step 3: Implement ReviewController**

```typescript
// apps/server/src/controllers/v1/review.controller.ts
import { JsonController, Post, Get, Body, Param, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { ReviewService } from '../../services/review.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil } from '../../utils/response.js';

import type { UserInfoDto, CreateReviewSessionDto, SubmitAnswerDto } from '@aimo/dto';

@Service()
@JsonController('/api/v1/review')
export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  @Post('/sessions')
  async createSession(@Body() dto: CreateReviewSessionDto, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      const session = await this.reviewService.createSession(user.uid, dto);
      return ResponseUtil.success(session);
    } catch (error) {
      logger.error('Create review session error:', error);
      return ResponseUtil.error(ErrorCode.SYSTEM_ERROR, (error as Error).message);
    }
  }

  @Get('/sessions/:id')
  async getSession(@Param('id') sessionId: string, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      const session = await this.reviewService.getSession(user.uid, sessionId);
      if (!session) return ResponseUtil.error(ErrorCode.NOT_FOUND);
      return ResponseUtil.success(session);
    } catch (error) {
      logger.error('Get review session error:', error);
      return ResponseUtil.error(ErrorCode.SYSTEM_ERROR);
    }
  }

  @Post('/sessions/:id/answer')
  async submitAnswer(
    @Param('id') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      const result = await this.reviewService.submitAnswer(user.uid, sessionId, dto);
      return ResponseUtil.success(result);
    } catch (error) {
      logger.error('Submit answer error:', error);
      return ResponseUtil.error(ErrorCode.SYSTEM_ERROR, (error as Error).message);
    }
  }

  @Post('/sessions/:id/complete')
  async completeSession(@Param('id') sessionId: string, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      const result = await this.reviewService.completeSession(user.uid, sessionId);
      return ResponseUtil.success(result);
    } catch (error) {
      logger.error('Complete review session error:', error);
      return ResponseUtil.error(ErrorCode.SYSTEM_ERROR);
    }
  }

  @Get('/history')
  async getHistory(@CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      const history = await this.reviewService.getHistory(user.uid);
      return ResponseUtil.success({ items: history, total: history.length });
    } catch (error) {
      logger.error('Get review history error:', error);
      return ResponseUtil.error(ErrorCode.SYSTEM_ERROR);
    }
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd apps/server && pnpm test -- apps/server/src/__tests__/review.controller.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/server/src/controllers/v1/review.controller.ts apps/server/src/__tests__/review.controller.test.ts
git commit -m "feat: add ReviewController with 5 REST endpoints"
```

---

### Task 6: Frontend — Review API client and /review page

**Files:**

- Create: `apps/web/src/api/review.ts`
- Create: `apps/web/src/pages/review/index.tsx`
- Modify: `apps/web/src/main.tsx`

**Step 1: Create the API client**

```typescript
// apps/web/src/api/review.ts
import type {
  CreateReviewSessionDto,
  ReviewSessionDto,
  SubmitAnswerDto,
  SubmitAnswerResponseDto,
  CompleteSessionResponseDto,
  ReviewHistoryItemDto,
} from '@aimo/dto';
import request from '../utils/request';

export const createReviewSession = (data: CreateReviewSessionDto) =>
  request.post<unknown, { code: number; data: ReviewSessionDto }>('/api/v1/review/sessions', data);

export const getReviewSession = (sessionId: string) =>
  request.get<unknown, { code: number; data: ReviewSessionDto }>(
    `/api/v1/review/sessions/${sessionId}`
  );

export const submitAnswer = (sessionId: string, data: SubmitAnswerDto) =>
  request.post<unknown, { code: number; data: SubmitAnswerResponseDto }>(
    `/api/v1/review/sessions/${sessionId}/answer`,
    data
  );

export const completeSession = (sessionId: string) =>
  request.post<unknown, { code: number; data: CompleteSessionResponseDto }>(
    `/api/v1/review/sessions/${sessionId}/complete`,
    {}
  );

export const getReviewHistory = () =>
  request.get<unknown, { code: number; data: { items: ReviewHistoryItemDto[]; total: number } }>(
    '/api/v1/review/history'
  );
```

**Step 2: Create the Review page**

Create `apps/web/src/pages/review/index.tsx` — a 3-step wizard:

- **Step 'setup'**: Scope selector (radio: 全部/分类/标签/最近N天) + "开始回顾" button → calls createReviewSession
- **Step 'quiz'**: Shows current question (item[currentIndex]), progress bar (currentIndex/total), textarea for answer, "提交回答" button → calls submitAnswer, shows AI feedback, then "下一题" / "完成回顾"
- **Step 'summary'**: Shows score (0-100), list of items with mastery badges (记得✓ / 模糊~ / 忘了✗), "再来一次" button

```typescript
// apps/web/src/pages/review/index.tsx
import { useState } from 'react';
import * as reviewApi from '../../api/review';
import type { ReviewSessionDto, SubmitAnswerResponseDto } from '@aimo/dto';

type Step = 'setup' | 'quiz' | 'summary';
type Scope = 'all' | 'category' | 'tag' | 'recent';

export function ReviewPage() {
  const [step, setStep] = useState<Step>('setup');
  const [scope, setScope] = useState<Scope>('all');
  const [scopeValue, setScopeValue] = useState('');
  const [session, setSession] = useState<ReviewSessionDto | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<SubmitAnswerResponseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await reviewApi.createReviewSession({ scope, scopeValue: scopeValue || undefined });
      if (res.code === 0) {
        setSession(res.data);
        setStep('quiz');
        setCurrentIndex(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const item = session.items[currentIndex];
      const res = await reviewApi.submitAnswer(session.sessionId, { itemId: item.itemId, answer });
      if (res.code === 0) setFeedback(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!session) return;
    setAnswer('');
    setFeedback(null);
    if (currentIndex + 1 >= session.items.length) {
      handleComplete();
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleComplete = async () => {
    if (!session) return;
    const res = await reviewApi.completeSession(session.sessionId);
    if (res.code === 0) {
      setFinalScore(res.data.score);
      setStep('summary');
    }
  };

  const masteryLabel = (m?: string) => ({ remembered: '记得 ✓', fuzzy: '模糊 ~', forgot: '忘了 ✗' }[m ?? ''] ?? '未回答');
  const masteryColor = (m?: string) => ({ remembered: 'text-green-600', fuzzy: 'text-yellow-600', forgot: 'text-red-600' }[m ?? ''] ?? 'text-gray-400');

  if (step === 'setup') {
    return (
      <div className="max-w-lg mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">AI 回顾模式</h1>
        <div className="space-y-3 mb-6">
          {(['all', 'category', 'tag', 'recent'] as Scope[]).map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value={s} checked={scope === s} onChange={() => setScope(s)} />
              <span>{{ all: '全部笔记', category: '按分类', tag: '按标签', recent: '最近 N 天' }[s]}</span>
            </label>
          ))}
        </div>
        {scope !== 'all' && (
          <input
            className="w-full border rounded px-3 py-2 mb-4"
            placeholder={scope === 'recent' ? '输入天数，如 7' : '输入分类ID或标签名'}
            value={scopeValue}
            onChange={(e) => setScopeValue(e.target.value)}
          />
        )}
        <button
          className="w-full bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
          onClick={handleStart}
          disabled={loading}
        >
          {loading ? '准备中...' : '开始回顾'}
        </button>
      </div>
    );
  }

  if (step === 'quiz' && session) {
    const item = session.items[currentIndex];
    return (
      <div className="max-w-lg mx-auto p-6">
        <div className="flex justify-between text-sm text-gray-500 mb-4">
          <span>第 {currentIndex + 1} / {session.items.length} 题</span>
          <div className="w-40 bg-gray-200 rounded-full h-2 mt-1">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${((currentIndex + 1) / session.items.length) * 100}%` }} />
          </div>
        </div>
        <p className="text-lg font-medium mb-4">{item.question}</p>
        {!feedback ? (
          <>
            <textarea
              className="w-full border rounded px-3 py-2 h-32 mb-4"
              placeholder="输入你的回答..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <button
              className="w-full bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
              onClick={handleSubmitAnswer}
              disabled={loading || !answer.trim()}
            >
              {loading ? '评估中...' : '提交回答'}
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <div className={`font-semibold ${masteryColor(feedback.mastery)}`}>{masteryLabel(feedback.mastery)}</div>
            <p className="text-sm bg-gray-50 rounded p-3">{feedback.aiFeedback}</p>
            <button className="w-full bg-blue-600 text-white rounded px-4 py-2" onClick={handleNext}>
              {currentIndex + 1 >= session.items.length ? '完成回顾' : '下一题'}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (step === 'summary' && session) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <h2 className="text-2xl font-bold mb-2">回顾完成</h2>
        <p className="text-4xl font-bold text-blue-600 mb-6">{finalScore} 分</p>
        <div className="space-y-2 mb-6">
          {session.items.map((item, i) => (
            <div key={item.itemId} className="flex justify-between text-sm border-b py-1">
              <span className="text-gray-600">第 {i + 1} 题</span>
              <span className={masteryColor(item.mastery)}>{masteryLabel(item.mastery)}</span>
            </div>
          ))}
        </div>
        <button className="w-full bg-blue-600 text-white rounded px-4 py-2" onClick={() => { setStep('setup'); setSession(null); setFinalScore(null); }}>
          再来一次
        </button>
      </div>
    );
  }

  return null;
}

export default ReviewPage;
```

**Step 3: Add /review route to main.tsx**

In `apps/web/src/main.tsx`, add import and route:

```typescript
import ReviewPage from './pages/review';

// Inside <Routes>:
<Route
  path="/review"
  element={
    <ProtectedRoute>
      <ReviewPage />
    </ProtectedRoute>
  }
/>
```

**Step 4: Commit**

```bash
git add apps/web/src/api/review.ts apps/web/src/pages/review/index.tsx apps/web/src/main.tsx
git commit -m "feat: add Review page and API client"
```

---

# 功能二：间隔重复推送（Spaced Repetition）

---

### Task 7: DB Schema — spaced_repetition_cards & spaced_repetition_rules

**Files:**

- Modify: `apps/server/src/models/constant/type.ts`
- Create: `apps/server/src/db/schema/spaced-repetition-cards.ts`
- Create: `apps/server/src/db/schema/spaced-repetition-rules.ts`
- Modify: `apps/server/src/db/schema/index.ts`
- Modify: `apps/server/src/utils/id.ts`
- Test: `apps/server/src/__tests__/spaced-repetition-schema.test.ts`

**Step 1: Write the failing test**

```typescript
// apps/server/src/__tests__/spaced-repetition-schema.test.ts
import { spacedRepetitionCards } from '../db/schema/spaced-repetition-cards.js';
import { spacedRepetitionRules } from '../db/schema/spaced-repetition-rules.js';

describe('Spaced repetition schemas', () => {
  it('spacedRepetitionCards has SM-2 columns', () => {
    expect(spacedRepetitionCards.cardId).toBeDefined();
    expect(spacedRepetitionCards.easeFactor).toBeDefined();
    expect(spacedRepetitionCards.interval).toBeDefined();
    expect(spacedRepetitionCards.nextReviewAt).toBeDefined();
  });

  it('spacedRepetitionRules has filter columns', () => {
    expect(spacedRepetitionRules.mode).toBeDefined();
    expect(spacedRepetitionRules.filterType).toBeDefined();
    expect(spacedRepetitionRules.filterValue).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/server && pnpm test -- apps/server/src/__tests__/spaced-repetition-schema.test.ts
```

Expected: FAIL

**Step 3: Add OBJECT_TYPE constants and ID generators**

In `apps/server/src/models/constant/type.ts`:

```typescript
SR_CARD: 'SR_CARD',
SR_RULE: 'SR_RULE',
```

In `apps/server/src/utils/id.ts` switch:

```typescript
case OBJECT_TYPE.SR_CARD: {
  return `src${typeid()}`;
}
case OBJECT_TYPE.SR_RULE: {
  return `srr${typeid()}`;
}
```

**Step 4: Create spaced-repetition-cards schema**

```typescript
// apps/server/src/db/schema/spaced-repetition-cards.ts
import { mysqlTable, varchar, float, int, timestamp, index, unique } from 'drizzle-orm/mysql-core';

export const spacedRepetitionCards = mysqlTable(
  'spaced_repetition_cards',
  {
    cardId: varchar('card_id', { length: 191 }).primaryKey().notNull(),
    uid: varchar('uid', { length: 191 }).notNull(),
    memoId: varchar('memo_id', { length: 191 }).notNull(),
    easeFactor: float('ease_factor').notNull().default(2.5),
    interval: int('interval').notNull().default(1),
    repetitions: int('repetitions').notNull().default(0),
    nextReviewAt: timestamp('next_review_at', { mode: 'date', fsp: 3 }).notNull(),
    lastReviewAt: timestamp('last_review_at', { mode: 'date', fsp: 3 }),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
  },
  (table) => ({
    uidIdx: index('uid_idx').on(table.uid),
    nextReviewIdx: index('next_review_at_idx').on(table.nextReviewAt),
    uidMemoUnique: unique('uid_memo_unique').on(table.uid, table.memoId),
  })
);

export type SpacedRepetitionCard = typeof spacedRepetitionCards.$inferSelect;
export type NewSpacedRepetitionCard = typeof spacedRepetitionCards.$inferInsert;
```

**Step 5: Create spaced-repetition-rules schema**

```typescript
// apps/server/src/db/schema/spaced-repetition-rules.ts
import { mysqlTable, varchar, mysqlEnum, timestamp, index } from 'drizzle-orm/mysql-core';

export const spacedRepetitionRules = mysqlTable(
  'spaced_repetition_rules',
  {
    ruleId: varchar('rule_id', { length: 191 }).primaryKey().notNull(),
    uid: varchar('uid', { length: 191 }).notNull(),
    mode: mysqlEnum('mode', ['include', 'exclude']).notNull(),
    filterType: mysqlEnum('filter_type', ['category', 'tag']).notNull(),
    filterValue: varchar('filter_value', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
  },
  (table) => ({
    uidIdx: index('uid_idx').on(table.uid),
  })
);

export type SpacedRepetitionRule = typeof spacedRepetitionRules.$inferSelect;
export type NewSpacedRepetitionRule = typeof spacedRepetitionRules.$inferInsert;
```

**Step 6: Export from schema/index.ts**

```typescript
export * from './spaced-repetition-cards.js';
export * from './spaced-repetition-rules.js';
```

**Step 7: Run test, build, generate migration**

```bash
cd apps/server && pnpm test -- apps/server/src/__tests__/spaced-repetition-schema.test.ts
cd apps/server && pnpm build && pnpm migrate:generate
```

**Step 8: Commit**

```bash
git add apps/server/src/models/constant/type.ts \
        apps/server/src/utils/id.ts \
        apps/server/src/db/schema/spaced-repetition-cards.ts \
        apps/server/src/db/schema/spaced-repetition-rules.ts \
        apps/server/src/db/schema/index.ts \
        apps/server/src/__tests__/spaced-repetition-schema.test.ts \
        apps/server/drizzle/
git commit -m "feat: add spaced_repetition_cards and rules DB schemas"
```

---

### Task 8: SpacedRepetitionService — SM-2 algorithm

**Files:**

- Create: `apps/server/src/services/spaced-repetition.service.ts`
- Test: `apps/server/src/__tests__/spaced-repetition.service.test.ts`

**Step 1: Write the failing tests**

```typescript
// apps/server/src/__tests__/spaced-repetition.service.test.ts
import { SpacedRepetitionService } from '../services/spaced-repetition.service.js';

describe('SpacedRepetitionService SM-2', () => {
  let service: SpacedRepetitionService;
  beforeEach(() => {
    service = new (SpacedRepetitionService as any)();
  });

  it('remembered: increases interval and keeps easeFactor >= 1.3', () => {
    const card = { easeFactor: 2.5, interval: 1, repetitions: 0 };
    const updated = (service as any).applyReview(card, 'remembered');
    expect(updated.interval).toBeGreaterThan(1);
    expect(updated.easeFactor).toBeGreaterThanOrEqual(1.3);
    expect(updated.repetitions).toBe(1);
  });

  it('forgot: resets interval to 1 and repetitions to 0', () => {
    const card = { easeFactor: 2.5, interval: 10, repetitions: 5 };
    const updated = (service as any).applyReview(card, 'forgot');
    expect(updated.interval).toBe(1);
    expect(updated.repetitions).toBe(0);
  });

  it('fuzzy: increases interval slowly', () => {
    const card = { easeFactor: 2.5, interval: 4, repetitions: 3 };
    const remembered = (service as any).applyReview(card, 'remembered');
    const fuzzy = (service as any).applyReview(card, 'fuzzy');
    expect(fuzzy.interval).toBeLessThan(remembered.interval);
    expect(fuzzy.interval).toBeGreaterThan(1);
  });

  it('easeFactor never drops below 1.3', () => {
    let card = { easeFactor: 1.4, interval: 1, repetitions: 0 };
    for (let i = 0; i < 10; i++) {
      card = (service as any).applyReview(card, 'forgot');
    }
    expect(card.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/server && pnpm test -- apps/server/src/__tests__/spaced-repetition.service.test.ts
```

Expected: FAIL

**Step 3: Implement SpacedRepetitionService**

```typescript
// apps/server/src/services/spaced-repetition.service.ts
import { Service } from 'typedi';
import { eq, and, lte } from 'drizzle-orm';

import { getDatabase } from '../db/connection.js';
import { spacedRepetitionCards } from '../db/schema/spaced-repetition-cards.js';
import { spacedRepetitionRules } from '../db/schema/spaced-repetition-rules.js';
import { memos } from '../db/schema/memos.js';
import { OBJECT_TYPE } from '../models/constant/type.js';
import { generateTypeId } from '../utils/id.js';
import { logger } from '../utils/logger.js';

import type { MasteryLevel } from '@aimo/dto';

interface SM2State {
  easeFactor: number;
  interval: number;
  repetitions: number;
}

const QUALITY_MAP: Record<MasteryLevel, number> = {
  remembered: 5,
  fuzzy: 3,
  forgot: 1,
};

@Service()
export class SpacedRepetitionService {
  /**
   * Apply SM-2 algorithm to update card state based on review quality.
   * SM-2 spec: https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method
   */
  private applyReview(card: SM2State, mastery: MasteryLevel): SM2State {
    const q = QUALITY_MAP[mastery];
    let { easeFactor, interval, repetitions } = card;

    if (q < 3) {
      // Failed — reset
      interval = 1;
      repetitions = 0;
    } else {
      // Passed
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions += 1;
    }

    // Update ease factor: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
    easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    easeFactor = Math.max(1.3, easeFactor);

    return { easeFactor, interval, repetitions };
  }

  async createCardForMemo(uid: string, memoId: string): Promise<void> {
    if (!(await this.shouldTrackMemo(uid, memoId))) return;

    const db = getDatabase();
    // Check if card already exists
    const [existing] = await db
      .select({ cardId: spacedRepetitionCards.cardId })
      .from(spacedRepetitionCards)
      .where(and(eq(spacedRepetitionCards.uid, uid), eq(spacedRepetitionCards.memoId, memoId)));
    if (existing) return;

    const tomorrow = new Date(Date.now() + 86400000);
    await db.insert(spacedRepetitionCards).values({
      cardId: generateTypeId(OBJECT_TYPE.SR_CARD),
      uid,
      memoId,
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewAt: tomorrow,
    });
  }

  async updateCard(uid: string, memoId: string, mastery: MasteryLevel): Promise<void> {
    const db = getDatabase();
    const [card] = await db
      .select()
      .from(spacedRepetitionCards)
      .where(and(eq(spacedRepetitionCards.uid, uid), eq(spacedRepetitionCards.memoId, memoId)));
    if (!card) return;

    const updated = this.applyReview(
      { easeFactor: card.easeFactor, interval: card.interval, repetitions: card.repetitions },
      mastery
    );

    const nextReviewAt = new Date(Date.now() + updated.interval * 86400000);

    await db
      .update(spacedRepetitionCards)
      .set({ ...updated, nextReviewAt, lastReviewAt: new Date() })
      .where(eq(spacedRepetitionCards.cardId, card.cardId));
  }

  async getDueCards(uid: string, limit = 5) {
    const db = getDatabase();
    const now = new Date();
    const cards = await db
      .select()
      .from(spacedRepetitionCards)
      .where(and(eq(spacedRepetitionCards.uid, uid), lte(spacedRepetitionCards.nextReviewAt, now)))
      .limit(limit);

    // Enrich with memo content
    const result = [];
    for (const card of cards) {
      const [memo] = await db.select().from(memos).where(eq(memos.memoId, card.memoId));
      if (memo) result.push({ card, memo });
    }
    return result;
  }

  async shouldTrackMemo(uid: string, memoId: string): Promise<boolean> {
    const db = getDatabase();
    const rules = await db
      .select()
      .from(spacedRepetitionRules)
      .where(eq(spacedRepetitionRules.uid, uid));
    if (rules.length === 0) return true; // No rules = track everything

    const [memo] = await db.select().from(memos).where(eq(memos.memoId, memoId));
    if (!memo) return false;

    const hasInclude = rules.some((r) => r.mode === 'include');
    const excludeRules = rules.filter((r) => r.mode === 'exclude');
    const includeRules = rules.filter((r) => r.mode === 'include');

    // Check excludes first (black list wins)
    for (const rule of excludeRules) {
      if (rule.filterType === 'category' && memo.categoryId === rule.filterValue) return false;
      if (rule.filterType === 'tag' && ((memo.tagIds as string[]) ?? []).includes(rule.filterValue))
        return false;
    }

    // If there are include rules, memo must match at least one
    if (hasInclude) {
      return includeRules.some((rule) => {
        if (rule.filterType === 'category') return memo.categoryId === rule.filterValue;
        if (rule.filterType === 'tag')
          return ((memo.tagIds as string[]) ?? []).includes(rule.filterValue);
        return false;
      });
    }

    return true;
  }

  async getRules(uid: string) {
    return getDatabase()
      .select()
      .from(spacedRepetitionRules)
      .where(eq(spacedRepetitionRules.uid, uid));
  }

  async addRule(
    uid: string,
    mode: 'include' | 'exclude',
    filterType: 'category' | 'tag',
    filterValue: string
  ) {
    await getDatabase()
      .insert(spacedRepetitionRules)
      .values({
        ruleId: generateTypeId(OBJECT_TYPE.SR_RULE),
        uid,
        mode,
        filterType,
        filterValue,
      });
  }

  async removeRule(uid: string, ruleId: string) {
    await getDatabase()
      .delete(spacedRepetitionRules)
      .where(and(eq(spacedRepetitionRules.ruleId, ruleId), eq(spacedRepetitionRules.uid, uid)));
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd apps/server && pnpm test -- apps/server/src/__tests__/spaced-repetition.service.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/server/src/services/spaced-repetition.service.ts \
        apps/server/src/__tests__/spaced-repetition.service.test.ts
git commit -m "feat: implement SpacedRepetitionService with SM-2 algorithm"
```

---

### Task 9: Hook SpacedRepetition into ReviewService and MemoService

**Files:**

- Modify: `apps/server/src/services/review.service.ts`
- Modify: `apps/server/src/services/memo.service.ts`

**Step 1: Update ReviewService.completeSession to update SR cards**

In `apps/server/src/services/review.service.ts`:

- Add `SpacedRepetitionService` to constructor
- After calculating score in `completeSession`, loop through items and call `spacedRepetitionService.updateCard(uid, item.memoId, item.mastery)` for each item that has a mastery value

```typescript
// Add to constructor:
constructor(
  private memoService: MemoService,
  private spacedRepetitionService: SpacedRepetitionService
) { ... }

// In completeSession, after calculating score:
for (const item of items) {
  if (item.mastery) {
    await this.spacedRepetitionService.updateCard(uid, item.memoId, item.mastery).catch((e) =>
      logger.warn(`Failed to update SR card for memo ${item.memoId}:`, e)
    );
  }
}
```

**Step 2: Update MemoService.createMemo to create SR card**

In `apps/server/src/services/memo.service.ts`:

- Add `SpacedRepetitionService` to constructor (use `@Inject()`)
- After successfully inserting the memo, call `this.spacedRepetitionService.createCardForMemo(uid, memoId)` — wrap in try/catch so SR failure doesn't break memo creation

```typescript
// After memo insert succeeds:
this.spacedRepetitionService
  .createCardForMemo(uid, newMemo.memoId)
  .catch((e) => logger.warn('Failed to create SR card for memo:', e));
```

**Step 3: Commit**

```bash
git add apps/server/src/services/review.service.ts apps/server/src/services/memo.service.ts
git commit -m "feat: hook spaced repetition into review completion and memo creation"
```

---

### Task 10: Add SpacedRepetition daily push scheduler task

**Files:**

- Modify: `apps/server/src/services/scheduler.service.ts`

**Step 1: Add SpacedRepetitionService and UserService to SchedulerService constructor**

In `apps/server/src/services/scheduler.service.ts`:

```typescript
// Add to imports:
import { SpacedRepetitionService } from './spaced-repetition.service.js';
import { UserService } from './user.service.js';

// Add to constructor:
@Inject() private spacedRepetitionService: SpacedRepetitionService,
@Inject() private userService: UserService,
```

**Step 2: Add registerSpacedRepetitionTask() method and call it in init()**

```typescript
private registerSpacedRepetitionTask(): void {
  const task = cron.schedule(
    '0 8 * * *', // Every day at 8:00
    async () => {
      try {
        await this.processSpacedRepetitionPushes();
      } catch (error) {
        logger.error('Error processing spaced repetition pushes:', error);
      }
    },
    { timezone: config.locale.timezone || 'Asia/Shanghai' }
  );
  this.tasks.push(task);
  logger.info('Spaced repetition push task scheduled: daily at 08:00');
}

private async processSpacedRepetitionPushes(): Promise<void> {
  const allRules = await this.getAllEnabledRules();
  // Get unique user IDs from push rules
  const userIds = [...new Set(allRules.map((r) => r.uid))];

  for (const uid of userIds) {
    try {
      const dueItems = await this.spacedRepetitionService.getDueCards(uid, 5);
      if (dueItems.length === 0) continue;

      const userRules = allRules.filter((r) => r.uid === uid && r.enabled);
      if (userRules.length === 0) continue;

      for (const rule of userRules) {
        const messages = dueItems.map(({ memo }, i) => {
          const preview = memo.content.slice(0, 100);
          return `${i + 1}. ${preview}${memo.content.length > 100 ? '...' : ''}`;
        });

        const content = {
          title: `📚 今日复习提醒 (${dueItems.length} 条)`,
          msg: messages.join('\n\n'),
        };

        for (const channelConfig of rule.channels) {
          try {
            const channel = this.channelFactory.getChannel(channelConfig);
            await channel.send(content);
          } catch (e) {
            logger.error(`SR push failed for user ${uid}:`, e);
          }
        }
      }
    } catch (e) {
      logger.error(`SR push processing failed for user ${uid}:`, e);
    }
  }
}
```

In `init()`, add: `this.registerSpacedRepetitionTask();`

**Step 3: Commit**

```bash
git add apps/server/src/services/scheduler.service.ts
git commit -m "feat: add daily spaced repetition push scheduler task"
```

---

### Task 11: SpacedRepetition API controller and frontend settings

**Files:**

- Create: `apps/server/src/controllers/v1/spaced-repetition.controller.ts`
- Create: `apps/web/src/api/spaced-repetition.ts`
- Create: `apps/web/src/pages/settings/components/spaced-repetition-settings.tsx`
- Modify: `apps/web/src/main.tsx`

**Step 1: Create SpacedRepetitionController**

```typescript
// apps/server/src/controllers/v1/spaced-repetition.controller.ts
import { JsonController, Get, Post, Delete, Body, Param, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';
import { ErrorCode } from '../../constants/error-codes.js';
import { SpacedRepetitionService } from '../../services/spaced-repetition.service.js';
import { ResponseUtil } from '../../utils/response.js';
import type { UserInfoDto } from '@aimo/dto';

@Service()
@JsonController('/api/v1/spaced-repetition')
export class SpacedRepetitionController {
  constructor(private srService: SpacedRepetitionService) {}

  @Get('/rules')
  async getRules(@CurrentUser() user: UserInfoDto) {
    if (!user?.uid) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
    const rules = await this.srService.getRules(user.uid);
    return ResponseUtil.success({ items: rules, total: rules.length });
  }

  @Post('/rules')
  async addRule(
    @Body()
    body: { mode: 'include' | 'exclude'; filterType: 'category' | 'tag'; filterValue: string },
    @CurrentUser() user: UserInfoDto
  ) {
    if (!user?.uid) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
    await this.srService.addRule(user.uid, body.mode, body.filterType, body.filterValue);
    return ResponseUtil.success(null);
  }

  @Delete('/rules/:id')
  async removeRule(@Param('id') ruleId: string, @CurrentUser() user: UserInfoDto) {
    if (!user?.uid) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
    await this.srService.removeRule(user.uid, ruleId);
    return ResponseUtil.success(null);
  }
}
```

**Step 2: Create frontend API client**

```typescript
// apps/web/src/api/spaced-repetition.ts
import request from '../utils/request';

export const getSRRules = () =>
  request.get<unknown, { code: number; data: { items: any[]; total: number } }>(
    '/api/v1/spaced-repetition/rules'
  );

export const addSRRule = (data: {
  mode: 'include' | 'exclude';
  filterType: 'category' | 'tag';
  filterValue: string;
}) => request.post<unknown, { code: number; data: null }>('/api/v1/spaced-repetition/rules', data);

export const deleteSRRule = (ruleId: string) =>
  request.delete<unknown, { code: number; data: null }>(
    `/api/v1/spaced-repetition/rules/${ruleId}`
  );
```

**Step 3: Create settings component**

Create `apps/web/src/pages/settings/components/spaced-repetition-settings.tsx` — a simple settings panel showing:

- Explanation text about spaced repetition
- List of current rules (mode badge + filterType + filterValue + delete button)
- Form to add new rule (mode select, filterType select, filterValue input, add button)

**Step 4: Add route to main.tsx**

```typescript
import { SpacedRepetitionSettings } from './pages/settings/components/spaced-repetition-settings';

// Inside /settings Routes:
<Route path="spaced-repetition" element={<SpacedRepetitionSettings />} />
```

**Step 5: Commit**

```bash
git add apps/server/src/controllers/v1/spaced-repetition.controller.ts \
        apps/web/src/api/spaced-repetition.ts \
        apps/web/src/pages/settings/components/spaced-repetition-settings.tsx \
        apps/web/src/main.tsx
git commit -m "feat: add SpacedRepetition controller and settings UI"
```

---

# 功能三：周期摘要报告（Digest Report）

---

### Task 12: DB Schema — digest_reports

**Files:**

- Modify: `apps/server/src/models/constant/type.ts`
- Create: `apps/server/src/db/schema/digest-reports.ts`
- Modify: `apps/server/src/db/schema/index.ts`
- Modify: `apps/server/src/utils/id.ts`
- Test: `apps/server/src/__tests__/digest-schema.test.ts`

**Step 1: Write the failing test**

```typescript
// apps/server/src/__tests__/digest-schema.test.ts
import { digestReports } from '../db/schema/digest-reports.js';

describe('Digest reports schema', () => {
  it('has required columns', () => {
    expect(digestReports.reportId).toBeDefined();
    expect(digestReports.period).toBeDefined();
    expect(digestReports.topTopics).toBeDefined();
    expect(digestReports.summary).toBeDefined();
    expect(digestReports.status).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/server && pnpm test -- apps/server/src/__tests__/digest-schema.test.ts
```

**Step 3: Add OBJECT_TYPE.DIGEST_REPORT and ID generator**

In `type.ts`: `DIGEST_REPORT: 'DIGEST_REPORT'`
In `id.ts` switch: `case OBJECT_TYPE.DIGEST_REPORT: return \`dr${typeid()}\`;`

**Step 4: Create digest-reports schema**

```typescript
// apps/server/src/db/schema/digest-reports.ts
import {
  mysqlTable,
  varchar,
  int,
  text,
  json,
  date,
  mysqlEnum,
  timestamp,
  index,
} from 'drizzle-orm/mysql-core';

export const digestReports = mysqlTable(
  'digest_reports',
  {
    reportId: varchar('report_id', { length: 191 }).primaryKey().notNull(),
    uid: varchar('uid', { length: 191 }).notNull(),
    period: mysqlEnum('period', ['weekly', 'monthly']).notNull(),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }).notNull(),
    memoCount: int('memo_count').notNull().default(0),
    topTopics:
      json('top_topics').$type<Array<{ topic: string; count: number; memoIds: string[] }>>(),
    topTags: json('top_tags').$type<Array<{ tag: string; count: number }>>(),
    topCategories: json('top_categories').$type<Array<{ category: string; count: number }>>(),
    highlights: json('highlights').$type<string[]>(),
    summary: text('summary'),
    status: mysqlEnum('status', ['generating', 'ready', 'failed']).notNull().default('generating'),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
  },
  (table) => ({
    uidIdx: index('uid_idx').on(table.uid),
    statusIdx: index('status_idx').on(table.status),
  })
);

export type DigestReport = typeof digestReports.$inferSelect;
export type NewDigestReport = typeof digestReports.$inferInsert;
```

**Step 5: Export from schema/index.ts, run test, build, generate migration**

```bash
cd apps/server && pnpm test -- apps/server/src/__tests__/digest-schema.test.ts
cd apps/server && pnpm build && pnpm migrate:generate
```

**Step 6: Commit**

```bash
git add apps/server/src/models/constant/type.ts \
        apps/server/src/utils/id.ts \
        apps/server/src/db/schema/digest-reports.ts \
        apps/server/src/db/schema/index.ts \
        apps/server/src/__tests__/digest-schema.test.ts \
        apps/server/drizzle/
git commit -m "feat: add digest_reports DB schema"
```

---

### Task 13: DigestService — report generation

**Files:**

- Create: `apps/server/src/services/digest.service.ts`
- Test: `apps/server/src/__tests__/digest.service.test.ts`

**Step 1: Write the failing tests**

```typescript
// apps/server/src/__tests__/digest.service.test.ts
import { DigestService } from '../services/digest.service.js';

describe('DigestService', () => {
  describe('getPeriodDates', () => {
    it('returns correct weekly date range for a Monday', () => {
      // 2026-03-02 is a Monday
      const service = new (DigestService as any)();
      const { startDate, endDate } = (service as any).getPreviousPeriodDates('weekly');
      expect(startDate).toBeDefined();
      expect(endDate).toBeDefined();
      expect(new Date(startDate) < new Date(endDate)).toBe(true);
    });

    it('returns correct monthly date range', () => {
      const service = new (DigestService as any)();
      const { startDate, endDate } = (service as any).getPreviousPeriodDates('monthly');
      expect(startDate).toMatch(/^\d{4}-\d{2}-01$/); // starts on 1st
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/server && pnpm test -- apps/server/src/__tests__/digest.service.test.ts
```

**Step 3: Implement DigestService**

```typescript
// apps/server/src/services/digest.service.ts
import { Service } from 'typedi';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { ChatOpenAI } from '@langchain/openai';

import { config } from '../config/config.js';
import { getDatabase } from '../db/connection.js';
import { digestReports } from '../db/schema/digest-reports.js';
import { memos } from '../db/schema/memos.js';
import { OBJECT_TYPE } from '../models/constant/type.js';
import { generateTypeId } from '../utils/id.js';
import { logger } from '../utils/logger.js';

@Service()
export class DigestService {
  private model: ChatOpenAI;

  constructor() {
    this.model = new ChatOpenAI({
      modelName: config.openai.model || 'gpt-4o-mini',
      apiKey: config.openai.apiKey,
      configuration: { baseURL: config.openai.baseURL },
      temperature: 0.5,
    });
  }

  async generateReport(uid: string, period: 'weekly' | 'monthly'): Promise<string> {
    const db = getDatabase();
    const { startDate, endDate } = this.getPreviousPeriodDates(period);
    const reportId = generateTypeId(OBJECT_TYPE.DIGEST_REPORT);

    // Insert placeholder
    await db.insert(digestReports).values({
      reportId,
      uid,
      period,
      startDate,
      endDate,
      status: 'generating',
    });

    try {
      // Query memos for period
      const periodMemos = await db
        .select()
        .from(memos)
        .where(
          and(
            eq(memos.uid, uid),
            eq(memos.deletedAt, 0),
            gte(memos.createdAt, new Date(startDate)),
            lte(memos.createdAt, new Date(endDate + 'T23:59:59'))
          )
        );

      if (periodMemos.length === 0) {
        await db
          .update(digestReports)
          .set({ status: 'ready', memoCount: 0 })
          .where(eq(digestReports.reportId, reportId));
        return reportId;
      }

      // Compute tag/category stats
      const tagCounts: Record<string, number> = {};
      const categoryCounts: Record<string, number> = {};
      for (const memo of periodMemos) {
        for (const tagId of (memo.tagIds as string[]) ?? []) {
          tagCounts[tagId] = (tagCounts[tagId] ?? 0) + 1;
        }
        if (memo.categoryId)
          categoryCounts[memo.categoryId] = (categoryCounts[memo.categoryId] ?? 0) + 1;
      }

      const topTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));
      const topCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, count]) => ({ category, count }));

      // AI topic clustering and summary
      const contentSample = periodMemos
        .slice(0, 30)
        .map((m) => m.content.slice(0, 200))
        .join('\n---\n');
      const aiResponse = await this.model.invoke([
        {
          role: 'system',
          content:
            '你是一个知识管理助手。分析用户的笔记内容，提取主题并生成摘要。\n\n输出格式（严格JSON）：\n{"topics": [{"topic": "主题名", "count": 数量}], "highlights": ["memoId1", "memoId2", "memoId3"], "summary": "100-200字总结"}\n\ntopics 最多5个，highlights 选3个最有价值的笔记的索引（0-based）。',
        },
        {
          role: 'user',
          content: `笔记数量：${periodMemos.length}\n\n笔记内容样本：\n${contentSample}`,
        },
      ]);

      let topTopics: any[] = [];
      let highlights: string[] = [];
      let summary = '';

      try {
        const parsed = JSON.parse(aiResponse.content as string);
        topTopics = parsed.topics ?? [];
        highlights = (parsed.highlights ?? [])
          .map((idx: number) => periodMemos[idx]?.memoId)
          .filter(Boolean);
        summary = parsed.summary ?? '';
      } catch {
        summary = aiResponse.content as string;
      }

      await db
        .update(digestReports)
        .set({
          memoCount: periodMemos.length,
          topTopics,
          topTags,
          topCategories,
          highlights,
          summary,
          status: 'ready',
        })
        .where(eq(digestReports.reportId, reportId));
    } catch (error) {
      logger.error('Digest report generation failed:', error);
      await db
        .update(digestReports)
        .set({ status: 'failed' })
        .where(eq(digestReports.reportId, reportId));
    }

    return reportId;
  }

  async getReports(uid: string, period?: 'weekly' | 'monthly') {
    const db = getDatabase();
    const conditions = [eq(digestReports.uid, uid)];
    if (period) conditions.push(eq(digestReports.period, period));
    return db
      .select()
      .from(digestReports)
      .where(and(...conditions))
      .orderBy(desc(digestReports.createdAt))
      .limit(24);
  }

  async getReport(uid: string, reportId: string) {
    const db = getDatabase();
    const [report] = await db
      .select()
      .from(digestReports)
      .where(and(eq(digestReports.reportId, reportId), eq(digestReports.uid, uid)));
    return report ?? null;
  }

  private getPreviousPeriodDates(period: 'weekly' | 'monthly'): {
    startDate: string;
    endDate: string;
  } {
    const now = new Date();
    if (period === 'weekly') {
      const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
      const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const lastMonday = new Date(now);
      lastMonday.setDate(now.getDate() - daysToLastMonday - 7);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      return {
        startDate: lastMonday.toISOString().split('T')[0],
        endDate: lastSunday.toISOString().split('T')[0],
      };
    } else {
      const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDate: firstOfLastMonth.toISOString().split('T')[0],
        endDate: lastOfLastMonth.toISOString().split('T')[0],
      };
    }
  }
}
```

**Step 4: Run test, verify pass, commit**

```bash
cd apps/server && pnpm test -- apps/server/src/__tests__/digest.service.test.ts
git add apps/server/src/services/digest.service.ts apps/server/src/__tests__/digest.service.test.ts
git commit -m "feat: implement DigestService with AI topic clustering"
```

---

### Task 14: Digest scheduler task and controller

**Files:**

- Modify: `apps/server/src/services/scheduler.service.ts`
- Create: `apps/server/src/controllers/v1/digest.controller.ts`

**Step 1: Add digest tasks to SchedulerService**

Add `DigestService` to constructor and add `registerDigestTask()`:

```typescript
private registerDigestTask(): void {
  // Weekly: every Monday at 9:00
  const weeklyTask = cron.schedule('0 9 * * 1', async () => {
    try {
      const userIds = await this.getAllUserIds();
      for (const uid of userIds) {
        await this.digestService.generateReport(uid, 'weekly').catch((e) =>
          logger.error(`Weekly digest failed for ${uid}:`, e)
        );
      }
    } catch (e) { logger.error('Weekly digest task error:', e); }
  }, { timezone: config.locale.timezone || 'Asia/Shanghai' });

  // Monthly: 1st of each month at 9:00
  const monthlyTask = cron.schedule('0 9 1 * *', async () => {
    try {
      const userIds = await this.getAllUserIds();
      for (const uid of userIds) {
        await this.digestService.generateReport(uid, 'monthly').catch((e) =>
          logger.error(`Monthly digest failed for ${uid}:`, e)
        );
      }
    } catch (e) { logger.error('Monthly digest task error:', e); }
  }, { timezone: config.locale.timezone || 'Asia/Shanghai' });

  this.tasks.push(weeklyTask, monthlyTask);
  logger.info('Digest tasks scheduled: weekly Monday 09:00 + monthly 1st 09:00');
}
```

Add `getAllUserIds()` helper: query distinct UIDs from users table.
Call `this.registerDigestTask()` in `init()`.

**Step 2: Create DigestController**

```typescript
// apps/server/src/controllers/v1/digest.controller.ts
import { JsonController, Get, Param, QueryParam, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';
import { ErrorCode } from '../../constants/error-codes.js';
import { DigestService } from '../../services/digest.service.js';
import { ResponseUtil } from '../../utils/response.js';
import type { UserInfoDto } from '@aimo/dto';

@Service()
@JsonController('/api/v1/digest')
export class DigestController {
  constructor(private digestService: DigestService) {}

  @Get('/reports')
  async getReports(
    @QueryParam('period') period: 'weekly' | 'monthly' | undefined,
    @CurrentUser() user: UserInfoDto
  ) {
    if (!user?.uid) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
    const reports = await this.digestService.getReports(user.uid, period);
    return ResponseUtil.success({ items: reports, total: reports.length });
  }

  @Get('/reports/:id')
  async getReport(@Param('id') reportId: string, @CurrentUser() user: UserInfoDto) {
    if (!user?.uid) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
    const report = await this.digestService.getReport(user.uid, reportId);
    if (!report) return ResponseUtil.error(ErrorCode.NOT_FOUND);
    return ResponseUtil.success(report);
  }
}
```

**Step 3: Commit**

```bash
git add apps/server/src/services/scheduler.service.ts \
        apps/server/src/controllers/v1/digest.controller.ts
git commit -m "feat: add digest scheduler tasks and DigestController"
```

---

### Task 15: Frontend — Digest API and Insights page extension

**Files:**

- Create: `apps/web/src/api/digest.ts`
- Modify or create: `apps/web/src/pages/insights/index.tsx` (check if insights page exists, if not create it)
- Modify: `apps/web/src/main.tsx`

**Step 1: Create API client**

```typescript
// apps/web/src/api/digest.ts
import request from '../utils/request';

export const getDigestReports = (period?: 'weekly' | 'monthly') =>
  request.get<unknown, { code: number; data: { items: any[]; total: number } }>(
    '/api/v1/digest/reports',
    { params: period ? { period } : {} }
  );

export const getDigestReport = (reportId: string) =>
  request.get<unknown, { code: number; data: any }>(`/api/v1/digest/reports/${reportId}`);
```

**Step 2: Create Insights page with digest reports**

Check if `apps/web/src/pages/insights/` exists. If not, create `apps/web/src/pages/insights/index.tsx` showing:

- Tab selector: 周报 / 月报
- Report list (card per report: period label, date range, memoCount, status badge, click to expand)
- Expanded report: AI summary, top topics chips, highlighted memos (3 cards), top tags

**Step 3: Add /insights route to main.tsx**

```typescript
import InsightsPage from './pages/insights';

<Route path="/insights" element={<ProtectedRoute><InsightsPage /></ProtectedRoute>} />
```

**Step 4: Commit**

```bash
git add apps/web/src/api/digest.ts apps/web/src/pages/insights/ apps/web/src/main.tsx
git commit -m "feat: add Insights page with digest report viewer"
```

---

# 功能四：知识图谱可视化（Knowledge Graph）

---

### Task 16: GraphService — build graph data

**Files:**

- Create: `apps/server/src/services/graph.service.ts`
- Test: `apps/server/src/__tests__/graph.service.test.ts`

**Step 1: Write the failing tests**

```typescript
// apps/server/src/__tests__/graph.service.test.ts
import { GraphService } from '../services/graph.service.js';

describe('GraphService', () => {
  describe('buildSemanticEdges', () => {
    it('filters out edges below similarity threshold', () => {
      const service = new (GraphService as any)();
      const similarities = [
        { memoId: 'a', targetId: 'b', score: 0.9 },
        { memoId: 'a', targetId: 'c', score: 0.7 }, // below 0.8
        { memoId: 'a', targetId: 'd', score: 0.85 },
      ];
      const edges = (service as any).filterSemanticEdges(similarities, 0.8);
      expect(edges).toHaveLength(2);
      expect(edges.every((e: any) => e.score >= 0.8)).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/server && pnpm test -- apps/server/src/__tests__/graph.service.test.ts
```

**Step 3: Implement GraphService**

```typescript
// apps/server/src/services/graph.service.ts
import { Service } from 'typedi';
import { eq, and } from 'drizzle-orm';

import { getDatabase } from '../db/connection.js';
import { memos } from '../db/schema/memos.js';
import { memoRelations } from '../db/schema/memo-relations.js';
import { logger } from '../utils/logger.js';

import { MemoService } from './memo.service.js';
import { EmbeddingService } from './embedding.service.js';

interface GraphNode {
  id: string;
  label: string;
  category?: string;
  tags: string[];
  linkCount: number;
  createdAt: string;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'reference' | 'semantic';
  weight: number;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// In-memory cache for semantic edges (TTL: 1 hour)
const semanticEdgeCache = new Map<string, { data: GraphEdge[]; expiresAt: number }>();

@Service()
export class GraphService {
  constructor(
    private memoService: MemoService,
    private embeddingService: EmbeddingService
  ) {}

  async buildGraph(uid: string, limit = 200): Promise<GraphData> {
    const db = getDatabase();

    // Get memos
    const userMemos = await db
      .select()
      .from(memos)
      .where(and(eq(memos.uid, uid), eq(memos.deletedAt, 0)))
      .orderBy(memos.createdAt)
      .limit(limit);

    if (userMemos.length === 0) return { nodes: [], edges: [] };

    const memoIds = new Set(userMemos.map((m) => m.memoId));

    // Get reference edges from memo_relations
    const relations = await db.select().from(memoRelations).where(eq(memoRelations.uid, uid));

    const referenceEdges: GraphEdge[] = relations
      .filter((r) => memoIds.has(r.sourceMemoId) && memoIds.has(r.targetMemoId))
      .map((r) => ({
        source: r.sourceMemoId,
        target: r.targetMemoId,
        type: 'reference' as const,
        weight: 1,
      }));

    // Count incoming references for node sizing
    const linkCounts: Record<string, number> = {};
    for (const edge of referenceEdges) {
      linkCounts[edge.target] = (linkCounts[edge.target] ?? 0) + 1;
    }

    // Build nodes
    const nodes: GraphNode[] = userMemos.map((m) => ({
      id: m.memoId,
      label: m.content.slice(0, 20),
      category: m.categoryId ?? undefined,
      tags: (m.tagIds as string[]) ?? [],
      linkCount: linkCounts[m.memoId] ?? 0,
      createdAt: m.createdAt.toISOString(),
    }));

    // Get semantic edges (from cache or compute)
    const semanticEdges = await this.getSemanticEdges(uid, userMemos);

    return { nodes, edges: [...referenceEdges, ...semanticEdges] };
  }

  private async getSemanticEdges(uid: string, userMemos: any[]): Promise<GraphEdge[]> {
    const cacheKey = uid;
    const cached = semanticEdgeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const edges: GraphEdge[] = [];
    // Sample up to 50 memos for semantic similarity (performance)
    const sample = userMemos.slice(0, 50);

    for (const memo of sample) {
      try {
        const similar = await this.memoService.vectorSearchMemos({
          uid,
          query: memo.content.slice(0, 500),
          limit: 4,
        });

        for (const result of similar.items) {
          if (result.memoId === memo.memoId) continue;
          const score = (result as any).score ?? 0;
          if (score >= 0.8) {
            edges.push({
              source: memo.memoId,
              target: result.memoId,
              type: 'semantic',
              weight: score,
            });
          }
        }
      } catch (e) {
        logger.warn(`Failed to get semantic edges for memo ${memo.memoId}:`, e);
      }
    }

    // Cache for 1 hour
    semanticEdgeCache.set(cacheKey, { data: edges, expiresAt: Date.now() + 3600000 });
    return edges;
  }

  private filterSemanticEdges(
    similarities: Array<{ memoId: string; targetId: string; score: number }>,
    threshold: number
  ) {
    return similarities.filter((s) => s.score >= threshold);
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd apps/server && pnpm test -- apps/server/src/__tests__/graph.service.test.ts
```

**Step 5: Commit**

```bash
git add apps/server/src/services/graph.service.ts apps/server/src/__tests__/graph.service.test.ts
git commit -m "feat: implement GraphService with reference and semantic edges"
```

---

### Task 17: GraphController — REST endpoint

**Files:**

- Create: `apps/server/src/controllers/v1/graph.controller.ts`

**Step 1: Implement GraphController**

```typescript
// apps/server/src/controllers/v1/graph.controller.ts
import { JsonController, Get, QueryParam, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';
import { ErrorCode } from '../../constants/error-codes.js';
import { GraphService } from '../../services/graph.service.js';
import { ResponseUtil } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import type { UserInfoDto } from '@aimo/dto';

@Service()
@JsonController('/api/v1/graph')
export class GraphController {
  constructor(private graphService: GraphService) {}

  @Get('/')
  async getGraph(@QueryParam('limit') limit: number = 200, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      const validLimit = Math.min(Math.max(limit, 10), 500);
      const graph = await this.graphService.buildGraph(user.uid, validLimit);
      return ResponseUtil.success(graph);
    } catch (error) {
      logger.error('Get graph error:', error);
      return ResponseUtil.error(ErrorCode.SYSTEM_ERROR);
    }
  }
}
```

**Step 2: Commit**

```bash
git add apps/server/src/controllers/v1/graph.controller.ts
git commit -m "feat: add GraphController GET /api/v1/graph"
```

---

### Task 18: Frontend — Knowledge Graph page with Cytoscape.js

**Files:**

- Create: `apps/web/src/api/graph.ts`
- Create: `apps/web/src/pages/graph/index.tsx`
- Modify: `apps/web/src/main.tsx`

**Step 1: Install Cytoscape.js**

```bash
cd apps/web && pnpm add cytoscape @types/cytoscape
```

**Step 2: Create API client**

```typescript
// apps/web/src/api/graph.ts
import request from '../utils/request';

export interface GraphNode {
  id: string;
  label: string;
  category?: string;
  tags: string[];
  linkCount: number;
  createdAt: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'reference' | 'semantic';
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const getGraph = (limit = 200) =>
  request.get<unknown, { code: number; data: GraphData }>('/api/v1/graph', { params: { limit } });
```

**Step 3: Create Graph page**

```typescript
// apps/web/src/pages/graph/index.tsx
import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { getGraph, type GraphNode } from '../../api/graph';

export function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [highlightMode, setHighlightMode] = useState<'none' | 'islands' | 'hubs'>('none');

  useEffect(() => {
    let isMounted = true;
    getGraph(200).then((res) => {
      if (!isMounted || !containerRef.current || res.code !== 0) return;
      const { nodes, edges } = res.data;

      // Build category color map
      const categories = [...new Set(nodes.map((n) => n.category).filter(Boolean))];
      const colors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];
      const categoryColor: Record<string, string> = {};
      categories.forEach((c, i) => { if (c) categoryColor[c] = colors[i % colors.length]; });

      const cy = cytoscape({
        container: containerRef.current,
        elements: [
          ...nodes.map((n) => ({
            data: {
              id: n.id,
              label: n.label,
              category: n.category,
              tags: n.tags,
              linkCount: n.linkCount,
              createdAt: n.createdAt,
              color: n.category ? (categoryColor[n.category] ?? '#94a3b8') : '#94a3b8',
              size: Math.max(20, Math.min(60, 20 + n.linkCount * 8)),
            },
          })),
          ...edges.map((e, i) => ({
            data: {
              id: `e${i}`,
              source: e.source,
              target: e.target,
              edgeType: e.type,
              weight: e.weight,
            },
          })),
        ],
        style: [
          {
            selector: 'node',
            style: {
              'background-color': 'data(color)',
              'width': 'data(size)',
              'height': 'data(size)',
              'label': 'data(label)',
              'font-size': '10px',
              'color': '#374151',
              'text-valign': 'bottom',
              'text-margin-y': 4,
            },
          },
          {
            selector: 'edge[edgeType = "reference"]',
            style: { 'line-color': '#6366f1', 'width': 2, 'line-style': 'solid', 'opacity': 0.7 },
          },
          {
            selector: 'edge[edgeType = "semantic"]',
            style: { 'line-color': '#10b981', 'width': 1, 'line-style': 'dashed', 'opacity': 0.4 },
          },
          {
            selector: '.highlighted',
            style: { 'border-width': 3, 'border-color': '#f59e0b' },
          },
          {
            selector: '.dimmed',
            style: { 'opacity': 0.2 },
          },
        ],
        layout: { name: 'cose', animate: true, randomize: true } as any,
      });

      cy.on('tap', 'node', (evt) => {
        const nodeData = evt.target.data();
        setSelectedNode({
          id: nodeData.id,
          label: nodeData.label,
          category: nodeData.category,
          tags: nodeData.tags,
          linkCount: nodeData.linkCount,
          createdAt: nodeData.createdAt,
        });
      });

      cy.on('tap', (evt) => {
        if (evt.target === cy) setSelectedNode(null);
      });

      cyRef.current = cy;
      setLoading(false);
    });

    return () => { isMounted = false; cyRef.current?.destroy(); };
  }, []);

  const highlightIslands = () => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass('highlighted dimmed');
    if (highlightMode === 'islands') { setHighlightMode('none'); return; }
    const islands = cy.nodes().filter((n) => n.connectedEdges().length === 0);
    cy.nodes().not(islands).addClass('dimmed');
    islands.addClass('highlighted');
    setHighlightMode('islands');
  };

  const highlightHubs = () => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass('highlighted dimmed');
    if (highlightMode === 'hubs') { setHighlightMode('none'); return; }
    const sorted = cy.nodes().sort((a, b) => b.data('linkCount') - a.data('linkCount'));
    const hubs = sorted.slice(0, 10);
    cy.nodes().not(hubs).addClass('dimmed');
    hubs.addClass('highlighted');
    setHighlightMode('hubs');
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <span className="text-gray-500">加载知识图谱中...</span>
          </div>
        )}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <button
            className={`px-3 py-1 rounded text-sm ${highlightMode === 'islands' ? 'bg-yellow-500 text-white' : 'bg-white border text-gray-700'}`}
            onClick={highlightIslands}
          >
            孤岛笔记
          </button>
          <button
            className={`px-3 py-1 rounded text-sm ${highlightMode === 'hubs' ? 'bg-yellow-500 text-white' : 'bg-white border text-gray-700'}`}
            onClick={highlightHubs}
          >
            枢纽笔记
          </button>
        </div>
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {selectedNode && (
        <div className="w-80 border-l bg-white p-4 overflow-y-auto">
          <button className="text-gray-400 text-sm mb-3" onClick={() => setSelectedNode(null)}>✕ 关闭</button>
          <p className="font-medium text-sm mb-2">{selectedNode.label}</p>
          <p className="text-xs text-gray-500 mb-1">被引用：{selectedNode.linkCount} 次</p>
          {selectedNode.category && <p className="text-xs text-gray-500 mb-1">分类：{selectedNode.category}</p>}
          {selectedNode.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedNode.tags.map((t) => (
                <span key={t} className="text-xs bg-gray-100 rounded px-2 py-0.5">{t}</span>
              ))}
            </div>
          )}
          <a href={`/home?memoId=${selectedNode.id}`} className="mt-4 block text-xs text-blue-600 hover:underline">
            查看完整笔记 →
          </a>
        </div>
      )}
    </div>
  );
}

export default GraphPage;
```

**Step 4: Add /graph route to main.tsx**

```typescript
import GraphPage from './pages/graph';

// Inside <Routes>:
<Route
  path="/graph"
  element={
    <ProtectedRoute>
      <GraphPage />
    </ProtectedRoute>
  }
/>
```

**Step 5: Commit**

```bash
git add apps/web/src/api/graph.ts apps/web/src/pages/graph/index.tsx apps/web/src/main.tsx
git commit -m "feat: add Knowledge Graph page with Cytoscape.js"
```

---

# 完成检查清单

实现完所有功能后，运行以下检查：

```bash
# 1. 所有测试通过
cd apps/server && pnpm test

# 2. 类型检查通过
cd apps/server && pnpm typecheck
cd apps/web && pnpm typecheck

# 3. Lint 检查
pnpm lint

# 4. 构建成功
pnpm build
```

## 新增文件汇总

**后端 DB Schemas:**

- `apps/server/src/db/schema/review-sessions.ts`
- `apps/server/src/db/schema/review-items.ts`
- `apps/server/src/db/schema/spaced-repetition-cards.ts`
- `apps/server/src/db/schema/spaced-repetition-rules.ts`
- `apps/server/src/db/schema/digest-reports.ts`

**后端 Services:**

- `apps/server/src/services/review.service.ts`
- `apps/server/src/services/spaced-repetition.service.ts`
- `apps/server/src/services/digest.service.ts`
- `apps/server/src/services/graph.service.ts`

**后端 Controllers:**

- `apps/server/src/controllers/v1/review.controller.ts`
- `apps/server/src/controllers/v1/spaced-repetition.controller.ts`
- `apps/server/src/controllers/v1/digest.controller.ts`
- `apps/server/src/controllers/v1/graph.controller.ts`

**前端:**

- `apps/web/src/api/review.ts`
- `apps/web/src/api/spaced-repetition.ts`
- `apps/web/src/api/digest.ts`
- `apps/web/src/api/graph.ts`
- `apps/web/src/pages/review/index.tsx`
- `apps/web/src/pages/insights/index.tsx`
- `apps/web/src/pages/graph/index.tsx`
- `apps/web/src/pages/settings/components/spaced-repetition-settings.tsx`

**DTO:**

- `packages/dto/src/review.ts`
