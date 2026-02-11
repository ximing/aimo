/**
 * LanceDB Schema Definitions
 * Explicitly define table schemas using Apache Arrow types
 */

import {
  Schema,
  Field,
  Int32,
  Utf8,
  FixedSizeList,
  Float32,
  TimestampMicrosecond,
} from 'apache-arrow';

/**
 * Users table schema
 * Stores user account information with explicit type definitions
 */
export const usersSchema = new Schema([
  new Field('id', new Int32(), true), // nullable id
  new Field('uid', new Utf8(), false), // non-nullable unique user id
  new Field('email', new Utf8(), true), // nullable email
  new Field('phone', new Utf8(), true), // nullable phone
  new Field('password', new Utf8(), false), // non-nullable hashed password
  new Field('salt', new Utf8(), false), // non-nullable password salt
  new Field('nickname', new Utf8(), true), // nullable nickname
  new Field('avatar', new Utf8(), true), // nullable avatar URL
  new Field('status', new Int32(), false), // non-nullable status
  new Field('createdAt', new TimestampMicrosecond(), false), // non-nullable creation timestamp (microsecond precision)
  new Field('updatedAt', new TimestampMicrosecond(), false), // non-nullable update timestamp (microsecond precision)
]);

/**
 * Memos table schema
 * Stores memo content with embedding vectors for semantic search
 */
export const memosSchema = new Schema([
  new Field('id', new Int32(), true), // nullable id
  new Field('memoId', new Utf8(), false), // non-nullable unique memo id
  new Field('uid', new Utf8(), false), // non-nullable user id
  new Field('content', new Utf8(), false), // non-nullable memo content
  new Field('attachments', new Utf8(), true), // nullable attachment IDs (JSON array string)
  new Field('embedding', new FixedSizeList(1536, new Field('item', new Float32(), true)), false), // 1536-dim embedding vector
  new Field('createdAt', new TimestampMicrosecond(), false), // non-nullable creation timestamp (microsecond precision)
  new Field('updatedAt', new TimestampMicrosecond(), false), // non-nullable update timestamp (microsecond precision)
]);

/**
 * Type definitions for records
 */
export interface UserRecord {
  id?: number;
  uid: string;
  email?: string;
  phone?: string;
  password: string;
  salt: string;
  nickname?: string;
  avatar?: string;
  status: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoRecord {
  id?: number;
  memoId: string;
  uid: string;
  content: string;
  attachments?: string; // JSON string of attachment IDs array
  embedding: number[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Embedding cache table schema
 * Stores cached embeddings to avoid redundant API calls for the same content
 */
export const embeddingCacheSchema = new Schema([
  new Field('id', new Int32(), true), // nullable id
  new Field('modelHash', new Utf8(), false), // non-nullable model identifier hash
  new Field('contentHash', new Utf8(), false), // non-nullable content hash
  new Field('embedding', new FixedSizeList(1536, new Field('item', new Float32(), true)), false), // 1536-dim embedding vector
  new Field('createdAt', new TimestampMicrosecond(), false), // non-nullable creation timestamp
]);

/**
 * Type definition for embedding cache records
 */
export interface EmbeddingCacheRecord {
  id?: number;
  modelHash: string;
  contentHash: string;
  embedding: number[];
  createdAt: Date;
}

/**
 * Attachments table schema
 * Stores file attachments with metadata
 */
export const attachmentsSchema = new Schema([
  new Field('id', new Int32(), true), // nullable id
  new Field('attachmentId', new Utf8(), false), // non-nullable unique attachment id
  new Field('uid', new Utf8(), false), // non-nullable user id
  new Field('filename', new Utf8(), false), // non-nullable original filename
  new Field('url', new Utf8(), false), // non-nullable S3 address or local relative path
  new Field('type', new Utf8(), false), // non-nullable MIME type
  new Field('size', new Int32(), false), // non-nullable file size in bytes
  new Field('storageType', new Utf8(), false), // non-nullable storage type: 'local' | 's3'
  new Field('createdAt', new TimestampMicrosecond(), false), // non-nullable creation timestamp
]);

/**
 * Type definition for attachment records
 */
export interface AttachmentRecord {
  id?: number;
  attachmentId: string;
  uid: string;
  filename: string;
  url: string;
  type: string;
  size: number;
  storageType: 'local' | 's3';
  createdAt: Date;
}