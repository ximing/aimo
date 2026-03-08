// Mock DB dependencies so the pure calculateNextReview logic can be tested without a real DB
jest.mock('../db/connection.js', () => ({
  getDatabase: jest.fn(),
}));

jest.mock('../config/config.js', () => ({
  config: {
    lancedb: { storageType: 'local', path: './lancedb_data' },
    mysql: {},
  },
}));

import { SpacedRepetitionService, MAX_INTERVAL_DAYS } from '../services/spaced-repetition.service.js';

describe('SpacedRepetitionService', () => {
  let service: SpacedRepetitionService;

  beforeEach(() => {
    service = new SpacedRepetitionService();
  });

  describe('calculateNextReview', () => {
    const baseCard = { easeFactor: 2.5, interval: 1, repetitions: 0, lapseCount: 0 };

    describe('quality=1 (forgot)', () => {
      it('resets repetitions to 0 and interval to 1', () => {
        const result = service.calculateNextReview(baseCard, 1);
        expect(result.repetitions).toBe(0);
        expect(result.interval).toBe(1);
      });

      it('applies SM-2 formula: EF + (0.1 - 4*(0.08+4*0.02)) = EF - 0.54', () => {
        // q=1: 0.1 - (5-1)*(0.08 + (5-1)*0.02) = 0.1 - 4*(0.08+0.08) = 0.1 - 0.64 = -0.54
        const result = service.calculateNextReview(baseCard, 1);
        expect(result.easeFactor).toBeCloseTo(1.96, 5);
      });

      it('does not let easeFactor drop below 1.3', () => {
        const card = { easeFactor: 1.4, interval: 1, repetitions: 0, lapseCount: 0 };
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

      it('applies SM-2 formula: EF + (0.1 - 2*(0.08+2*0.02)) = EF - 0.14', () => {
        // q=3: 0.1 - (5-3)*(0.08 + (5-3)*0.02) = 0.1 - 2*(0.08+0.04) = 0.1 - 0.24 = -0.14
        const result = service.calculateNextReview(baseCard, 3);
        expect(result.easeFactor).toBeCloseTo(2.36, 5);
      });

      it('does not let easeFactor drop below 1.3', () => {
        const card = { easeFactor: 1.35, interval: 6, repetitions: 2, lapseCount: 0 };
        const result = service.calculateNextReview(card, 3);
        expect(result.easeFactor).toBeCloseTo(1.3, 5);
      });

      it('sets interval to 1 on first repetition (after reset)', () => {
        const result = service.calculateNextReview(baseCard, 3);
        expect(result.interval).toBe(1);
      });

      it('sets interval to 6 on second repetition', () => {
        const card = { easeFactor: 2.5, interval: 1, repetitions: 1, lapseCount: 0 };
        const result = service.calculateNextReview(card, 3);
        expect(result.interval).toBe(6);
      });

      it('uses old easeFactor for interval formula (no double penalty)', () => {
        // US-002: interval uses OLD easeFactor (2.5), not new (2.36)
        const card = { easeFactor: 2.5, interval: 6, repetitions: 2, lapseCount: 0 };
        const result = service.calculateNextReview(card, 3);
        // interval = round(6 * 2.5) = 15 (using old EF, not new 2.36)
        const expected = Math.round(6 * 2.5);
        expect(result.interval).toBe(expected);
      });
    });

    describe('quality=4 (remembered)', () => {
      it('increments repetitions', () => {
        const result = service.calculateNextReview(baseCard, 4);
        expect(result.repetitions).toBe(1);
      });

      it('applies SM-2 formula: EF + (0.1 - 1*(0.08+1*0.02)) = EF + 0 = EF unchanged', () => {
        // q=4: 0.1 - (5-4)*(0.08 + (5-4)*0.02) = 0.1 - 1*(0.08+0.02) = 0.1 - 0.1 = 0
        const result = service.calculateNextReview(baseCard, 4);
        expect(result.easeFactor).toBeCloseTo(2.5, 5);
      });

      it('sets interval to 1 on first repetition', () => {
        const result = service.calculateNextReview(baseCard, 4);
        expect(result.interval).toBe(1);
      });

      it('sets interval to 6 on second repetition', () => {
        const card = { easeFactor: 2.5, interval: 1, repetitions: 1, lapseCount: 0 };
        const result = service.calculateNextReview(card, 4);
        expect(result.interval).toBe(6);
      });

      it('uses formula round(prevInterval * EF) for repetitions >= 3', () => {
        const card = { easeFactor: 2.5, interval: 6, repetitions: 2, lapseCount: 0 };
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

      it('applies SM-2 formula: EF + (0.1 - 0*(0.08+0)) = EF + 0.1', () => {
        // q=5: 0.1 - (5-5)*(0.08 + (5-5)*0.02) = 0.1 - 0 = 0.1
        const result = service.calculateNextReview(baseCard, 5);
        expect(result.easeFactor).toBeCloseTo(2.6, 5);
      });

      it('sets interval to 1 on first repetition', () => {
        const result = service.calculateNextReview(baseCard, 5);
        expect(result.interval).toBe(1);
      });

      it('sets interval to 6 on second repetition', () => {
        const card = { easeFactor: 2.5, interval: 1, repetitions: 1, lapseCount: 0 };
        const result = service.calculateNextReview(card, 5);
        expect(result.interval).toBe(6);
      });

      it('uses formula round(prevInterval * EF * 1.3) for repetitions >= 3', () => {
        const card = { easeFactor: 2.5, interval: 6, repetitions: 2, lapseCount: 0 };
        const result = service.calculateNextReview(card, 5);
        const expected = Math.round(6 * 2.5 * 1.3); // 19 (rounded from 19.5)
        expect(result.interval).toBe(expected);
      });
    });

    describe('MAX_INTERVAL_DAYS cap', () => {
      it('caps interval at 365 days for very long intervals', () => {
        // easeFactor=3.0, interval=300, mastered: round(300*3.0*1.3) = 1170 -> capped to 365
        const card = { easeFactor: 3.0, interval: 300, repetitions: 5, lapseCount: 0 };
        const result = service.calculateNextReview(card, 5);
        expect(result.interval).toBe(365);
      });

      it('does not cap interval when below 365', () => {
        // easeFactor=3.0, interval=80, mastered: round(80*3.0*1.3) = 312 -> not capped
        const card = { easeFactor: 3.0, interval: 80, repetitions: 5, lapseCount: 0 };
        const result = service.calculateNextReview(card, 5);
        expect(result.interval).toBe(312);
      });

      it('exports MAX_INTERVAL_DAYS constant as 365', () => {
        expect(MAX_INTERVAL_DAYS).toBe(365);
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

    describe('lapseCount tracking', () => {
      it('increments lapseCount on forgot (quality=1)', () => {
        const card = { easeFactor: 2.5, interval: 6, repetitions: 3, lapseCount: 2 };
        const result = service.calculateNextReview(card, 1);
        expect(result.lapseCount).toBe(3);
      });

      it('keeps lapseCount unchanged on fuzzy (quality=3)', () => {
        const card = { easeFactor: 2.5, interval: 6, repetitions: 3, lapseCount: 2 };
        const result = service.calculateNextReview(card, 3);
        expect(result.lapseCount).toBe(2);
      });

      it('keeps lapseCount unchanged on remembered (quality=4)', () => {
        const card = { easeFactor: 2.5, interval: 6, repetitions: 3, lapseCount: 2 };
        const result = service.calculateNextReview(card, 4);
        expect(result.lapseCount).toBe(2);
      });

      it('keeps lapseCount unchanged on mastered (quality=5)', () => {
        const card = { easeFactor: 2.5, interval: 6, repetitions: 3, lapseCount: 2 };
        const result = service.calculateNextReview(card, 5);
        expect(result.lapseCount).toBe(2);
      });
    });
  });
});
