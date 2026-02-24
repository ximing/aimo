/**
 * Memo data model for LanceDB
 * Includes embedding vector for semantic search capabilities
 */

export interface Memo {
  memoId: string; // Unique memo ID (generateTypeId)
  uid: string; // User ID who owns this memo
  categoryId?: string; // Optional category ID
  content: string; // Memo text content
  type?: string; // Optional memo type: 'text' | 'audio' | 'video' (defaults to 'text' if not set)
  attachments?: string[]; // Attachment IDs
  tags?: string[]; // Optional array of tag strings
  embedding: number[]; // Vector embedding for semantic search
  isPublic?: boolean; // Whether this memo is public (visible to others without auth)
  createdAt: number; // timestamp in milliseconds
  updatedAt: number; // timestamp in milliseconds
}

export type NewMemo = Omit<Memo, 'createdAt' | 'updatedAt'> & {
  createdAt?: number;
  updatedAt?: number;
};
