const MAX_WINDOW_MS = 48 * 60 * 60 * 1000;

export type ReviewDayStatus = 'reviewed' | 'due';

export interface ReviewDaySource {
  memoId: string;
  cardId?: string | null;
  reviewedAt?: Date | null;
  status: ReviewDayStatus;
}

export interface ReviewDayCard {
  memoId: string;
  cardId: string | null;
  title: string;
  content: string;
  reviewedAt: string | null;
  status: ReviewDayStatus;
}

/** Accept a single local calendar day, passed as an ISO half-open range. */
export function parseReviewWindow(
  fromRaw: string | undefined,
  toRaw: string | undefined
): { from: Date; to: Date } | null {
  if (!fromRaw || !toRaw) return null;
  const from = new Date(fromRaw);
  const to = new Date(toRaw);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  const span = to.getTime() - from.getTime();
  if (span <= 0 || span > MAX_WINDOW_MS) return null;
  return { from, to };
}

/**
 * One card per memo. A completed review wins over a card that was only assigned that day.
 * Reviewed cards sort by time, newest first. Assigned cards follow.
 */
export function mergeReviewDaySources(sources: ReviewDaySource[]): ReviewDaySource[] {
  const byMemo = new Map<string, ReviewDaySource>();
  for (const source of sources) {
    if (!source.memoId) continue;
    const existing = byMemo.get(source.memoId);
    if (!existing) {
      byMemo.set(source.memoId, source);
      continue;
    }
    if (existing.status !== 'reviewed' && source.status === 'reviewed') {
      byMemo.set(source.memoId, source);
    }
  }
  return [...byMemo.values()].sort((left, right) => {
    if (left.status !== right.status) return left.status === 'reviewed' ? -1 : 1;
    return (right.reviewedAt?.getTime() ?? 0) - (left.reviewedAt?.getTime() ?? 0);
  });
}

export function memoCardPreview(content: string): { title: string; content: string } {
  const plain = content.replace(/<[^>]*>/g, '').trim();
  const firstLine = plain
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  const titleSource = firstLine ?? '';
  const title = titleSource.length > 80 ? `${titleSource.slice(0, 80)}...` : titleSource || '无标题';
  const body = plain.length > 180 ? `${plain.slice(0, 180)}...` : plain;
  return { title, content: body };
}

export function toReviewDayCard(
  source: ReviewDaySource,
  content: string
): ReviewDayCard {
  const preview = memoCardPreview(content);
  return {
    memoId: source.memoId,
    cardId: source.cardId ?? null,
    title: preview.title,
    content: preview.content,
    reviewedAt: source.reviewedAt ? source.reviewedAt.toISOString() : null,
    status: source.status,
  };
}
