import {
  mergeReviewDaySources,
  memoCardPreview,
  parseReviewWindow,
} from '../services/review-day.js';

describe('review day window', () => {
  it('accepts a local day range', () => {
    const window = parseReviewWindow('2026-10-14T00:00:00.000+08:00', '2026-10-15T00:00:00.000+08:00');
    expect(window).not.toBeNull();
    expect(window!.to.getTime() - window!.from.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('rejects an empty or oversized range', () => {
    expect(parseReviewWindow(undefined, '2026-10-15T00:00:00.000Z')).toBeNull();
    expect(parseReviewWindow('2026-10-15T00:00:00.000Z', '2026-10-14T00:00:00.000Z')).toBeNull();
    expect(parseReviewWindow('2026-10-01T00:00:00.000Z', '2026-10-14T00:00:00.000Z')).toBeNull();
  });
});

describe('review day cards', () => {
  const morning = new Date('2026-10-14T01:00:00.000Z');
  const evening = new Date('2026-10-14T10:00:00.000Z');

  it('keeps one card per memo and prefers a completed review', () => {
    const cards = mergeReviewDaySources([
      { memoId: 'm1', status: 'due' },
      { memoId: 'm1', cardId: 'c1', status: 'reviewed', reviewedAt: morning },
      { memoId: 'm2', cardId: 'c2', status: 'reviewed', reviewedAt: evening },
    ]);
    expect(cards.map((card) => card.memoId)).toEqual(['m2', 'm1']);
    expect(cards[1]?.status).toBe('reviewed');
    expect(cards[1]?.cardId).toBe('c1');
  });

  it('uses the first line as the title', () => {
    expect(memoCardPreview('<p>周报</p>\n补充')).toEqual({
      title: '周报',
      content: '周报\n补充',
    });
  });
});
