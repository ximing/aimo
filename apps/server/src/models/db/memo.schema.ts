/**
 * Memo data model for LanceDB
 * Includes embedding vector for semantic search capabilities
 */

export interface Memo {
  memoId: string; // Unique memo ID (generateTypeId)
  uid: string; // User ID who owns this memo
  categoryId?: string; // Optional category ID
  content: string; // Memo text content
  attachments?: string[]; // Attachment IDs
  embedding: number[]; // Vector embedding for semantic search
  createdAt: number; // timestamp in milliseconds
  updatedAt: number; // timestamp in milliseconds
}

export type NewMemo = Omit<Memo, 'createdAt' | 'updatedAt'> & {
  createdAt?: number;
  updatedAt?: number;
};