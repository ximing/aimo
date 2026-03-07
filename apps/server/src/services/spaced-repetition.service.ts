import { Service } from 'typedi';

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
}
