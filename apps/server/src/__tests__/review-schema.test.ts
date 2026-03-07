import { reviewSessions } from '../db/schema/review-sessions.js';
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
