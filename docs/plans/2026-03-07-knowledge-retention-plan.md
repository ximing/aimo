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
import {
  mysqlTable, varchar, int, timestamp, mysqlEnum, index
} from 'drizzle-orm/mysql-core';

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
import {
  mysqlTable, varchar, text, int, mysqlEnum, index
} from 'drizzle-orm/mysql-core';

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
      const items = [
        { mastery: 'remembered' },
        { mastery: 'remembered' },
      ];
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
import {
  JsonController, Post, Get, Body, Param, CurrentUser
} from 'routing-controllers';
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
  CreateReviewSessionDto, ReviewSessionDto, SubmitAnswerDto,
  SubmitAnswerResponseDto, CompleteSessionResponseDto, ReviewHistoryItemDto
} from '@aimo/dto';
import request from '../utils/request';

export const createReviewSession = (data: CreateReviewSessionDto) =>
  request.post<unknown, { code: number; data: ReviewSessionDto }>('/api/v1/review/sessions', data);

export const getReviewSession = (sessionId: string) =>
  request.get<unknown, { code: number; data: ReviewSessionDto }>(`/api/v1/review/sessions/${sessionId}`);

export const submitAnswer = (sessionId: string, data: SubmitAnswerDto) =>
  request.post<unknown, { code: number; data: SubmitAnswerResponseDto }>(
    `/api/v1/review/sessions/${sessionId}/answer`, data
  );

export const completeSession = (sessionId: string) =>
  request.post<unknown, { code: number; data: CompleteSessionResponseDto }>(
    `/api/v1/review/sessions/${sessionId}/complete`, {}
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

