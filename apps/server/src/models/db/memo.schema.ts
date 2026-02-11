/**
 * Memo data model for LanceDB
 * Includes embedding vector for semantic search capabilities
 */

export interface Memo {
  id?: number;
  memoId: string; // Unique memo ID (nanoid)
  uid: string; // User ID who owns this memo
  content: string; // Memo text content
  embedding: number[]; // Vector embedding for semantic search
  createdAt: Date;
  updatedAt: Date;
}

export type NewMemo = Omit<Memo, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt?: Date;
  updatedAt?: Date;
};
