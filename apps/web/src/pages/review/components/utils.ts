// ─── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (timestamp: string): string => {
  const now = Date.now();
  const date = new Date(timestamp);
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
};

/**
 * Scope labels
 */
export const scopeLabels: Record<string, string> = {
  all: '全部笔记',
  category: '按分类',
  tag: '按标签',
  recent: '最近 N 天',
};

/**
 * Get item status icon
 */
export const getItemStatus = (item: {
  mastery?: string;
}): 'remembered' | 'fuzzy' | 'forgot' | 'pending' => {
  if (item.mastery === 'remembered') return 'remembered';
  if (item.mastery === 'fuzzy') return 'fuzzy';
  if (item.mastery === 'forgot') return 'forgot';
  return 'pending';
};

export const masteryLabel = (m?: string) =>
  ({ remembered: '记得', fuzzy: '模糊', forgot: '忘了' })[m ?? ''] ?? '未回答';

export const masteryColor = (m?: string) =>
  ({
    remembered: 'text-green-600 dark:text-green-400',
    fuzzy: 'text-yellow-600 dark:text-yellow-400',
    forgot: 'text-red-600 dark:text-red-400',
  })[m ?? ''] ?? 'text-gray-400';
