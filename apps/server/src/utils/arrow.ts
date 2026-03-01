/**
 * Apache Arrow utility functions for LanceDB data conversion
 * Reference: .catpaw/rules/dancedb.md
 */

/**
 * Convert Apache Arrow List<Utf8> to JavaScript string array
 * LanceDB returns List fields as Arrow List objects, not plain arrays
 *
 * @param value - Arrow List object or array
 * @returns JavaScript array of strings
 *
 * @example
 * ```ts
 * const memo = await memosTable.query().toArray()[0];
 * const attachmentIds = toStringList(memo.attachments);
 * const tagIds = toStringList(memo.tagIds);
 * ```
 */
export const toStringList = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value.toArray) return value.toArray();
  if (value.data && Array.isArray(value.data)) return value.data;
  return [];
};

/**
 * Convert Apache Arrow List<Struct> to JavaScript object array
 * Used for complex nested structures like sources in AI messages
 *
 * @param value - Arrow List<Struct> object or array
 * @returns JavaScript array of objects
 *
 * @example
 * ```ts
 * const message = await messagesTable.query().toArray()[0];
 * const sources = toStructList(message.sources);
 * ```
 */
export const toStructList = (value: any) => {
  if (!value) return [];
  const array = value.toArray ? value.toArray() : Array.isArray(value) ? value : [];
  return array.map((item: any) => ({
    memoId: item?.memoId ?? undefined,
    content: item?.content ?? undefined,
    similarity: item?.similarity ?? undefined,
    relevanceScore: item?.relevanceScore ?? undefined,
    createdAt: item?.createdAt ?? undefined,
  }));
};

/**
 * Check if a value is an Arrow List object
 * Arrow List objects have a toArray method
 *
 * @param value - Value to check
 * @returns true if value is an Arrow List
 */
export const isArrowList = (value: any): boolean => {
  return value && typeof value.toArray === 'function';
};

/**
 * Convert Arrow timestamp to JavaScript number (milliseconds)
 * Arrow timestamps may be in different units
 *
 * @param value - Arrow timestamp or number
 * @returns Timestamp in milliseconds
 */
export const toTimestamp = (value: any): number => {
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  // Arrow timestamp might have a valueOf method
  if (value && typeof value.valueOf === 'function') {
    const num = value.valueOf();
    if (typeof num === 'number') return num;
  }
  return Date.now();
};
