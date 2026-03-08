import { Service } from '@rabjs/react';
import type {
  ReviewSessionDto,
  SubmitAnswerResponseDto,
  CompleteSessionResponseDto,
  ReviewHistoryItemDto,
  ReviewItemDto,
  ReviewProfileDto,
  ProfileFilterRule,
} from '@aimo/dto';
import type { SRCard } from '../../api/spaced-repetition';
import * as reviewApi from '../../api/review';
import * as srApi from '../../api/spaced-repetition';
import * as categoryApi from '../../api/category';
import * as tagApi from '../../api/tag';

// Storage key for persisting selected session
const STORAGE_KEY = 'aimo-review-session';

// Type definitions
export type Step = 'setup' | 'quiz' | 'summary';
export type Scope = 'all' | 'category' | 'tag' | 'recent';
export type ReviewType = 'ai' | 'sr';
export type DetailMode = 'none' | 'new' | string;

export type SRQuality = 'mastered' | 'remembered' | 'fuzzy' | 'forgot' | 'skip';

export interface SRStats {
  mastered: number;
  remembered: number;
  fuzzy: number;
  forgot: number;
}

/**
 * Review Service
 * Manages all review-related state and business logic
 */
export class ReviewService extends Service {
  // ========== AI Review State ==========
  step: Step = 'setup';
  reviewType: ReviewType = 'ai';
  session: ReviewSessionDto | null = null;
  currentIndex = 0;
  answer = '';
  feedback: SubmitAnswerResponseDto | null = null;
  loading = false;
  finalScore: number | null = null;
  finalSession: CompleteSessionResponseDto | null = null;

  // ========== Spaced Repetition State ==========
  srCards: SRCard[] = [];
  srCurrentIndex = 0;
  srCardFlipped = false;
  skippedCards: SRCard[] = [];
  srLoading = false;
  srStats: SRStats = {
    mastered: 0,
    remembered: 0,
    fuzzy: 0,
    forgot: 0,
  };
  srTotalCards = 0;
  srTotalDue = 0;
  srDailyLimit = 0;
  srImporting = false;

  // ========== History State ==========
  history: ReviewHistoryItemDto[] = [];
  historyLoading = false;
  selectedHistorySession: string | null = null;

  // ========== Profile State ==========
  profiles: ReviewProfileDto[] = [];
  categories: { id: string; name: string }[] = [];
  tags: { id: string; name: string }[] = [];

  // ========== Profile Detail State ==========
  detailMode: DetailMode = 'none';
  detailName = '';
  detailRules: ProfileFilterRule[] = [];
  detailQuestionCount = 10;
  detailSaving = false;
  detailDirty = false;

  // ========== Computed Properties ==========
  get currentItem(): ReviewItemDto | undefined {
    return this.session?.items[this.currentIndex];
  }

  get currentSRCard(): SRCard | undefined {
    return this.srCards[this.srCurrentIndex];
  }

  get answeredCount(): number {
    return this.session?.items.filter(item => item.mastery !== undefined).length || 0;
  }

  get totalCount(): number {
    return this.session?.items.length || 0;
  }

  // ========== Actions ==========

  /**
   * Initialize service - load initial data
   */
  async initialize(): Promise<void> {
    await Promise.all([
      this.loadHistory(),
      this.loadProfiles(),
      this.loadCategoriesAndTags(),
    ]);
    await this.restoreSession();
  }

  /**
   * Change review type and reset states
   */
  changeReviewType(type: ReviewType): void {
    if (type === this.reviewType) return;

    // Reset AI Review states
    this.step = 'setup';
    this.session = null;
    this.currentIndex = 0;
    this.answer = '';
    this.feedback = null;
    this.finalScore = null;
    this.finalSession = null;
    this.selectedHistorySession = null;

    // Reset SR states
    this.srCards = [];
    this.srCurrentIndex = 0;
    this.srCardFlipped = false;
    this.skippedCards = [];
    this.srStats = { mastered: 0, remembered: 0, fuzzy: 0, forgot: 0 };

    // Set new type
    this.reviewType = type;
  }

  // ========== History Methods ==========

  async loadHistory(): Promise<void> {
    this.historyLoading = true;
    try {
      const res = await reviewApi.getReviewHistory();
      if (res.code === 0) {
        this.history = res.data.items;
      }
    } finally {
      this.historyLoading = false;
    }
  }

  async selectHistorySession(sessionId: string): Promise<void> {
    this.loading = true;
    this.selectedHistorySession = sessionId;
    localStorage.setItem(STORAGE_KEY, sessionId);

    try {
      const res = await reviewApi.getReviewSession(sessionId);
      if (res.code === 0 && res.data) {
        const firstUnanswered = res.data.items.findIndex(item => item.mastery === undefined);
        if (res.data.status === 'completed') {
          this.session = res.data;
          this.step = 'summary';
          this.finalScore = res.data.score ?? 0;
          this.finalSession = {
            sessionId: res.data.sessionId,
            score: res.data.score ?? 0,
            items: res.data.items,
          };
        } else if (firstUnanswered !== -1) {
          this.session = res.data;
          this.step = 'quiz';
          this.currentIndex = firstUnanswered;
          this.answer = '';
          this.feedback = null;
        } else {
          this.session = res.data;
          this.step = 'quiz';
          this.currentIndex = 0;
          this.answer = '';
          this.feedback = null;
        }
      }
    } finally {
      this.loading = false;
    }
  }

  private async restoreSession(): Promise<void> {
    const savedSessionId = localStorage.getItem(STORAGE_KEY);
    if (!savedSessionId) return;

    this.loading = true;
    this.selectedHistorySession = savedSessionId;

    try {
      const res = await reviewApi.getReviewSession(savedSessionId);
      if (res.code === 0 && res.data) {
        const firstUnanswered = res.data.items.findIndex(item => item.mastery === undefined);
        if (res.data.status === 'completed') {
          this.session = res.data;
          this.step = 'summary';
          this.finalScore = res.data.score ?? 0;
          this.finalSession = {
            sessionId: res.data.sessionId,
            score: res.data.score ?? 0,
            items: res.data.items,
          };
        } else if (firstUnanswered !== -1) {
          this.session = res.data;
          this.step = 'quiz';
          this.currentIndex = firstUnanswered;
          this.answer = '';
          this.feedback = null;
        } else {
          this.session = res.data;
          this.step = 'quiz';
          this.currentIndex = 0;
          this.answer = '';
          this.feedback = null;
        }
      }
    } finally {
      this.loading = false;
    }
  }

  // ========== Profile Methods ==========

  async loadProfiles(): Promise<void> {
    try {
      const res = await reviewApi.getReviewProfiles();
      if (res.code === 0) {
        this.profiles = res.data.profiles;
      }
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  }

  async loadCategoriesAndTags(): Promise<void> {
    try {
      const [catRes, tagRes] = await Promise.all([
        categoryApi.getCategories(),
        tagApi.getTags(),
      ]);
      if (catRes.code === 0) {
        this.categories = (catRes.data?.categories || []).map((c: any) => ({
          id: c.categoryId,
          name: c.name,
        }));
      }
      if (tagRes.code === 0) {
        this.tags = (tagRes.data?.tags || []).map((t: any) => ({
          id: t.tagId,
          name: t.name,
        }));
      }
    } catch (error) {
      console.error('Failed to load categories/tags:', error);
    }
  }

  // ========== Profile Detail Methods ==========

  openNewProfile(): void {
    this.step = 'setup';
    this.detailMode = 'new';
    this.detailName = '';
    this.detailRules = [];
    this.detailQuestionCount = 10;
    this.detailDirty = false;
  }

  openProfile(profile: ReviewProfileDto): void {
    this.step = 'setup';
    this.detailMode = profile.profileId;
    this.detailName = profile.name;
    this.detailRules = profile.filterRules ?? [];
    this.detailQuestionCount = profile.questionCount;
    this.detailDirty = false;
  }

  updateDetailName(name: string): void {
    this.detailName = name;
    this.detailDirty = true;
  }

  updateDetailRules(rules: ProfileFilterRule[]): void {
    this.detailRules = rules;
    this.detailDirty = true;
  }

  updateDetailQuestionCount(count: number): void {
    this.detailQuestionCount = count;
    this.detailDirty = true;
  }

  async saveDetail(): Promise<string | null> {
    if (!this.detailName.trim()) return null;
    this.detailSaving = true;

    try {
      if (this.detailMode === 'new') {
        const res = await reviewApi.createReviewProfile({
          name: this.detailName.trim(),
          filterRules: this.detailRules,
          questionCount: this.detailQuestionCount,
        });
        if (res.code === 0) {
          this.profiles = [res.data, ...this.profiles];
          this.detailMode = res.data.profileId;
          this.detailDirty = false;
          return res.data.profileId;
        }
      } else {
        const res = await reviewApi.updateReviewProfile(this.detailMode, {
          name: this.detailName.trim(),
          filterRules: this.detailRules,
          questionCount: this.detailQuestionCount,
        });
        if (res.code === 0) {
          this.profiles = this.profiles.map(p =>
            p.profileId === this.detailMode ? res.data : p
          );
          this.detailDirty = false;
          return this.detailMode;
        }
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      this.detailSaving = false;
    }
    return null;
  }

  async deleteProfile(profileId: string): Promise<void> {
    if (!window.confirm('确定要删除这个回顾模式吗？')) return;

    try {
      const res = await reviewApi.deleteReviewProfile(profileId);
      if (res.code === 0) {
        this.profiles = this.profiles.filter(p => p.profileId !== profileId);
        if (this.detailMode === profileId) {
          this.detailMode = 'none';
        }
      }
    } catch (error) {
      console.error('Failed to delete profile:', error);
    }
  }

  async startWithDetail(): Promise<void> {
    let profileId: string | null =
      this.detailMode === 'new' ? null : this.detailMode;

    if (this.detailMode === 'new' || this.detailDirty) {
      profileId = await this.saveDetail();
    }
    if (!profileId) return;

    await this.startWithProfile(profileId);
  }

  // ========== AI Review Session Methods ==========

  async startWithProfile(profileId: string): Promise<void> {
    this.loading = true;
    try {
      const res = await reviewApi.createReviewSession({ profileId });
      if (res.code === 0) {
        this.session = res.data;
        this.step = 'quiz';
        this.currentIndex = 0;
        this.answer = '';
        this.feedback = null;
        const newSessionId = res.data.sessionId;
        this.selectedHistorySession = newSessionId;
        localStorage.setItem(STORAGE_KEY, newSessionId);
        await this.loadHistory();
      }
    } finally {
      this.loading = false;
    }
  }

  async submitAnswer(skipAnswer = false): Promise<void> {
    if (!this.session) return;
    this.loading = true;

    try {
      const item = this.session.items[this.currentIndex];
      const answerText = skipAnswer ? '我忘记了' : this.answer;
      const res = await reviewApi.submitAnswer(this.session.sessionId, {
        itemId: item.itemId,
        answer: answerText,
      });
      if (res.code === 0) {
        this.feedback = res.data;
        // Update session with the new answer/mastery
        const updatedItems = [...this.session.items];
        updatedItems[this.currentIndex] = {
          ...updatedItems[this.currentIndex],
          userAnswer: answerText,
          aiFeedback: res.data.aiFeedback,
          mastery: res.data.mastery,
        };
        this.session = { ...this.session, items: updatedItems };
      }
    } finally {
      this.loading = false;
    }
  }

  goToNext(): void {
    if (!this.session) return;

    if (this.currentIndex + 1 >= this.session.items.length) {
      this.complete();
    } else {
      this.currentIndex = this.currentIndex + 1;
      // Check if next item already has an answer
      const nextItem = this.session.items[this.currentIndex];
      if (nextItem.mastery !== undefined) {
        this.feedback = {
          itemId: nextItem.itemId,
          aiFeedback: nextItem.aiFeedback || '',
          mastery: nextItem.mastery,
        };
        this.answer = nextItem.userAnswer || '';
      } else {
        this.answer = '';
        this.feedback = null;
      }
    }
  }

  goToPrev(): void {
    if (!this.session || this.currentIndex === 0) return;

    this.currentIndex = this.currentIndex - 1;
    // Check if previous item has an answer
    const prevItem = this.session.items[this.currentIndex];
    if (prevItem.mastery !== undefined) {
      this.feedback = {
        itemId: prevItem.itemId,
        aiFeedback: prevItem.aiFeedback || '',
        mastery: prevItem.mastery,
      };
      this.answer = prevItem.userAnswer || '';
    } else {
      this.answer = '';
      this.feedback = null;
    }
  }

  jumpToItem(index: number): void {
    if (!this.session) return;

    this.currentIndex = index;
    const item = this.session.items[index];
    if (item.mastery !== undefined) {
      this.feedback = {
        itemId: item.itemId,
        aiFeedback: item.aiFeedback || '',
        mastery: item.mastery,
      };
      this.answer = item.userAnswer || '';
    } else {
      this.answer = '';
      this.feedback = null;
    }
  }

  async complete(): Promise<void> {
    if (!this.session) return;

    const res = await reviewApi.completeSession(this.session.sessionId);
    if (res.code === 0) {
      this.finalScore = res.data.score;
      this.finalSession = res.data;
      this.step = 'summary';
      await this.loadHistory();
    }
  }

  // ========== Spaced Repetition Methods ==========

  async startSR(): Promise<void> {
    this.srLoading = true;
    this.skippedCards = [];
    this.srStats = { mastered: 0, remembered: 0, fuzzy: 0, forgot: 0 };

    try {
      const [dueRes, statsRes] = await Promise.all([
        srApi.getDueCards(),
        srApi.getSRStats(),
      ]);

      if (dueRes.code === 0 && dueRes.data?.cards) {
        if (statsRes.code === 0 && statsRes.data) {
          this.srTotalCards = statsRes.data.totalCards;
        }

        this.srTotalDue = dueRes.data.totalDue ?? dueRes.data.cards.length;
        this.srDailyLimit = dueRes.data.dailyLimit ?? 0;

        if (dueRes.data.cards.length === 0) {
          this.srCards = [];
          this.srCurrentIndex = 0;
          this.finalScore = null;
          this.finalSession = null;
          this.step = 'summary';
        } else {
          this.srCards = dueRes.data.cards;
          this.srCurrentIndex = 0;
          this.step = 'quiz';
        }
      }
    } finally {
      this.srLoading = false;
    }
  }

  async importExistingMemos(): Promise<void> {
    this.srImporting = true;
    try {
      const res = await srApi.importExistingMemos();
      if (res.code === 0 && res.data) {
        const { imported, skipped } = res.data;
        alert(`已导入 ${imported} 条笔记，跳过 ${skipped} 条`);
        await this.startSR();
      }
    } finally {
      this.srImporting = false;
    }
  }

  flipSRCard(): void {
    this.srCardFlipped = true;
  }

  async reviewSRCard(quality: SRQuality): Promise<void> {
    if (this.srCurrentIndex >= this.srCards.length) return;

    const card = this.srCards[this.srCurrentIndex];

    if (quality === 'skip') {
      this.skippedCards = [...this.skippedCards, card];
      this.moveToNextSR();
      return;
    }

    this.srLoading = true;
    try {
      const res = await srApi.reviewCard(card.cardId, quality);
      if (res.code === 0) {
        const updatedCards = [...this.srCards];
        updatedCards[this.srCurrentIndex] = res.data.card;
        this.srCards = updatedCards;

        // Update stats
        this.srStats = {
          ...this.srStats,
          [quality]: (this.srStats[quality as keyof SRStats] as number) + 1,
        };

        this.moveToNextSR();
      }
    } finally {
      this.srLoading = false;
    }
  }

  private moveToNextSR(): void {
    this.srCardFlipped = false;
    const remainingCards = this.srCards.length - this.srCurrentIndex - 1;
    const totalSkipped = this.skippedCards.length;

    if (remainingCards <= 0 && totalSkipped <= 0) {
      this.step = 'summary';
      this.finalScore = null;
      this.finalSession = null;
    } else if (remainingCards <= 0 && totalSkipped > 0) {
      this.srCards = [...this.skippedCards];
      this.skippedCards = [];
      this.srCurrentIndex = 0;
    } else {
      this.srCurrentIndex = this.srCurrentIndex + 1;
    }
  }

  // ========== Summary Reset ==========

  resetToSetup(): void {
    this.step = 'setup';
    this.session = null;
    this.finalScore = null;
    this.finalSession = null;
    this.selectedHistorySession = null;
    this.reviewType = 'ai';
  }

  resetSR(): void {
    this.step = 'setup';
    this.srCards = [];
    this.skippedCards = [];
    this.srCurrentIndex = 0;
  }
}