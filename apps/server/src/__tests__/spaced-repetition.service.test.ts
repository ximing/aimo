import { SpacedRepetitionService } from '../services/spaced-repetition.service.js';

describe('SpacedRepetitionService', () => {
  let service: SpacedRepetitionService;

  beforeEach(() => {
    service = new SpacedRepetitionService();
  });

  describe('calculateNextReview', () => {
    const baseCard = { easeFactor: 2.5, interval: 1, repetitions: 0 };

    describe('quality=1 (forgot)', () => {
      it('resets repetitions to 0 and interval to 1', () => {
        const result = service.calculateNextReview(baseCard, 1);
        expect(result.repetitions).toBe(0);
        expect(result.interval).toBe(1);
      });

      it('decreases easeFactor by 0.2', () => {
        const result = service.calculateNextReview(baseCard, 1);
        expect(result.easeFactor).toBeCloseTo(2.3, 5);
      });

      it('does not let easeFactor drop below 1.3', () => {
        const card = { easeFactor: 1.4, interval: 1, repetitions: 0 };
        const result = service.calculateNextReview(card, 1);
        expect(result.easeFactor).toBeCloseTo(1.3, 5);
      });

      it('sets nextReviewAt to tomorrow', () => {
        const before = new Date();
        const result = service.calculateNextReview(baseCard, 1);
        const after = new Date();

        const expectedMin = new Date(before);
        expectedMin.setDate(expectedMin.getDate() + 1);
        const expectedMax = new Date(after);
        expectedMax.setDate(expectedMax.getDate() + 1);

        expect(result.nextReviewAt.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
        expect(result.nextReviewAt.getTime()).toBeLessThanOrEqual(expectedMax.getTime() + 1000);
      });
    });

    describe('quality=3 (fuzzy)', () => {
      it('increments repetitions', () => {
        const result = service.calculateNextReview(baseCard, 3);
        expect(result.repetitions).toBe(1);
      });

      it('decreases easeFactor by 0.08', () => {
        const result = service.calculateNextReview(baseCard, 3);
        expect(result.easeFactor).toBeCloseTo(2.42, 5);
      });

      it('does not let easeFactor drop below 1.3', () => {
        const card = { easeFactor: 1.35, interval: 6, repetitions: 2 };
        const result = service.calculateNextReview(card, 3);
        expect(result.easeFactor).toBeCloseTo(1.3, 5);
      });

      it('sets interval to 1 on first repetition (after reset)', () => {
        const result = service.calculateNextReview(baseCard, 3);
        expect(result.interval).toBe(1);
      });

      it('sets interval to 6 on second repetition', () => {
        const card = { easeFactor: 2.5, interval: 1, repetitions: 1 };
        const result = service.calculateNextReview(card, 3);
        expect(result.interval).toBe(6);
      });

      it('uses formula for repetitions >= 3', () => {
        const card = { easeFactor: 2.5, interval: 6, repetitions: 2 };
        const result = service.calculateNextReview(card, 3);
        const newEF = Math.max(1.3, 2.5 - 0.08); // 2.42
        const expected = Math.round(6 * newEF);
        expect(result.interval).toBe(expected);
      });
    });

    describe('quality=4 (remembered)', () => {
      it('increments repetitions', () => {
        const result = service.calculateNextReview(baseCard, 4);
        expect(result.repetitions).toBe(1);
      });

      it('increases easeFactor by 0.1', () => {
        const result = service.calculateNextReview(baseCard, 4);
        expect(result.easeFactor).toBeCloseTo(2.6, 5);
      });

      it('sets interval to 1 on first repetition', () => {
        const result = service.calculateNextReview(baseCard, 4);
        expect(result.interval).toBe(1);
      });

      it('sets interval to 6 on second repetition', () => {
        const card = { easeFactor: 2.5, interval: 1, repetitions: 1 };
        const result = service.calculateNextReview(card, 4);
        expect(result.interval).toBe(6);
      });

      it('uses formula round(prevInterval * EF) for repetitions >= 3', () => {
        const card = { easeFactor: 2.5, interval: 6, repetitions: 2 };
        const result = service.calculateNextReview(card, 4);
        const expected = Math.round(6 * 2.5); // 15
        expect(result.interval).toBe(expected);
      });
    });

    describe('quality=5 (mastered)', () => {
      it('increments repetitions', () => {
        const result = service.calculateNextReview(baseCard, 5);
        expect(result.repetitions).toBe(1);
      });

      it('increases easeFactor by 0.15', () => {
        const result = service.calculateNextReview(baseCard, 5);
        expect(result.easeFactor).toBeCloseTo(2.65, 5);
      });

      it('sets interval to 1 on first repetition', () => {
        const result = service.calculateNextReview(baseCard, 5);
        expect(result.interval).toBe(1);
      });

      it('sets interval to 6 on second repetition', () => {
        const card = { easeFactor: 2.5, interval: 1, repetitions: 1 };
        const result = service.calculateNextReview(card, 5);
        expect(result.interval).toBe(6);
      });

      it('uses formula round(prevInterval * EF * 1.3) for repetitions >= 3', () => {
        const card = { easeFactor: 2.5, interval: 6, repetitions: 2 };
        const result = service.calculateNextReview(card, 5);
        const expected = Math.round(6 * 2.5 * 1.3); // 19 (rounded from 19.5)
        expect(result.interval).toBe(expected);
      });
    });

    describe('interval progression after forgot reset', () => {
      it('follows 1 -> 6 -> formula progression after reset', () => {
        // Start fresh card, forgot once
        let card = baseCard;
        card = service.calculateNextReview(card, 1); // forgot
        expect(card.repetitions).toBe(0);
        expect(card.interval).toBe(1);

        // First review after reset
        card = service.calculateNextReview(card, 4); // remembered
        expect(card.repetitions).toBe(1);
        expect(card.interval).toBe(1);

        // Second review after reset
        card = service.calculateNextReview(card, 4); // remembered
        expect(card.repetitions).toBe(2);
        expect(card.interval).toBe(6);

        // Third review: formula kicks in
        card = service.calculateNextReview(card, 4); // remembered
        expect(card.repetitions).toBe(3);
        expect(card.interval).toBeGreaterThan(6);
      });
    });
  });
});
