/**
 * LanceDB Schema Definitions
 * Explicitly define table schemas using Apache Arrow types
 * Embedding dimensions are configured dynamically from environment variables
 */

import {
  Schema,
  Field,
  Int32,
  Utf8,
  FixedSizeList,
  Float32,
  List,
  Struct,
  Timestamp,
  TimeUnit,
} from 'apache-arrow';
import { config } from '../../config/config.js';

/**
 * Get embedding dimensions from config
 * Fallback to 1536 if not configured
 */
const getEmbeddingDimensions = (): number => {
  return config.openai.embeddingDimensions || 1536;
};

/**
 * Users table schema
 * Stores user account information with explicit type definitions
 */
export const usersSchema = new Schema([
  new Field('uid', new Utf8(), false), // non-nullable unique user id
  new Field('email', new Utf8(), true), // nullable email
  new Field('phone', new Utf8(), true), // nullable phone
  new Field('password', new Utf8(), false), // non-nullable hashed password
  new Field('salt', new Utf8(), false), // non-nullable password salt
  new Field('nickname', new Utf8(), true), // nullable nickname
  new Field('avatar', new Utf8(), true), // nullable avatar URL
  new Field('status', new Int32(), false), // non-nullable status
  new Field('createdAt', new Timestamp(TimeUnit.MILLISECOND), false), // non-nullable creation timestamp in milliseconds
  new Field('updatedAt', new Timestamp(TimeUnit.MILLISECOND), false), // non-nullable update timestamp in milliseconds
]);

/**
 * Memos table schema
 * Stores memo content with embedding vectors for semantic search
 * Attachments are denormalized as a list of objects for performance (immutable after creation)
 * Embedding dimensions are configured from OPENAI_EMBEDDING_DIMENSIONS environment variable
 */
export const memosSchema = new Schema([
  new Field('memoId', new Utf8(), false), // non-nullable unique memo id
  new Field('uid', new Utf8(), false), // non-nullable user id
  new Field('categoryId', new Utf8(), true), // nullable category id (undefined = uncategorized)
  new Field('content', new Utf8(), false), // non-nullable memo content
  new Field(
    'attachments',
    new List(
      new Field(
        'item',
        new Struct([
          new Field('attachmentId', new Utf8(), false),
          new Field('filename', new Utf8(), false),
          new Field('url', new Utf8(), false),
          new Field('type', new Utf8(), false),
          new Field('size', new Int32(), false),
          new Field('createdAt', new Timestamp(TimeUnit.MILLISECOND), false), // timestamp in milliseconds
        ]),
        true
      )
    ),
    true
  ), // nullable list of denormalized attachment objects
  new Field(
    'embedding',
    new FixedSizeList(getEmbeddingDimensions(), new Field('item', new Float32(), true)),
    false
  ), // dynamic-dim embedding vector
  new Field('createdAt', new Timestamp(TimeUnit.MILLISECOND), false), // non-nullable creation timestamp in milliseconds
  new Field('updatedAt', new Timestamp(TimeUnit.MILLISECOND), false), // non-nullable update timestamp in milliseconds
]);

/**
 * Type definitions for records
 */
export interface UserRecord {
  uid: string;
  email?: string;
  phone?: string;
  password: string;
  salt: string;
  nickname?: string;
  avatar?: string;
  status: number;
  createdAt: number; // timestamp in milliseconds
  updatedAt: number; // timestamp in milliseconds
}

export interface DenormalizedAttachment {
  attachmentId: string;
  filename: string;
  url: string;
  type: string;
  size: number;
  createdAt: number; // timestamp in milliseconds
}

export interface MemoRecord {
  memoId: string;
  uid: string;
  categoryId?: string; // optional category id (undefined = uncategorized)
  content: string;
  attachments?: DenormalizedAttachment[]; // denormalized attachment objects array (immutable)
  embedding: number[];
  createdAt: number; // timestamp in milliseconds
  updatedAt: number; // timestamp in milliseconds
}

/**
 * Embedding cache table schema
 * Stores cached embeddings to avoid redundant API calls for the same content
 * Embedding dimensions are configured from OPENAI_EMBEDDING_DIMENSIONS environment variable
 */
export const embeddingCacheSchema = new Schema([
  new Field('modelHash', new Utf8(), false), // non-nullable model identifier hash
  new Field('contentHash', new Utf8(), false), // non-nullable content hash
  new Field(
    'embedding',
    new FixedSizeList(getEmbeddingDimensions(), new Field('item', new Float32(), true)),
    false
  ), // dynamic-dim embedding vector
  new Field('createdAt', new Timestamp(TimeUnit.MILLISECOND), false), // non-nullable creation timestamp in milliseconds
]);

/**
 * Type definition for embedding cache records
 */
export interface EmbeddingCacheRecord {
  modelHash: string;
  contentHash: string;
  embedding: number[];
  createdAt: number; // timestamp in milliseconds
}

/**
 * Multimodal embedding cache table schema
 * Stores cached multimodal embeddings to avoid redundant API calls
 * Supports text, image, and video modalities
 */
export const multimodalEmbeddingCacheSchema = new Schema([
  new Field('modelHash', new Utf8(), false), // non-nullable model identifier hash
  new Field('contentHash', new Utf8(), false), // non-nullable content hash
  new Field('modalityType', new Utf8(), false), // non-nullable modality type: 'text' | 'image' | 'video'
  new Field('embedding', new FixedSizeList(1024, new Field('item', new Float32(), true)), false), // fixed 1024-dim multimodal embedding
  new Field('createdAt', new Timestamp(TimeUnit.MILLISECOND), false), // non-nullable creation timestamp in milliseconds
]);

/**
 * Type definition for multimodal embedding cache records
 */
export interface MultimodalEmbeddingCacheRecord {
  modelHash: string;
  contentHash: string;
  modalityType: 'text' | 'image' | 'video';
  embedding: number[];
  createdAt: number; // timestamp in milliseconds
}

/**
 * Memo relations table schema
 * Stores directed relations between memos (A -> B means A is related to B)
 */
export const memoRelationsSchema = new Schema([
  new Field('relationId', new Utf8(), false), // non-nullable unique relation id
  new Field('uid', new Utf8(), false), // non-nullable user id (for permission isolation)
  new Field('sourceMemoId', new Utf8(), false), // non-nullable source memo id (who initiates the relation)
  new Field('targetMemoId', new Utf8(), false), // non-nullable target memo id (what is being related)
  new Field('createdAt', new Timestamp(TimeUnit.MILLISECOND), false), // non-nullable creation timestamp in milliseconds
]);

/**
 * Categories table schema
 * Stores memo categories per user
 */
export const categoriesSchema = new Schema([
  new Field('categoryId', new Utf8(), false), // non-nullable unique category id
  new Field('uid', new Utf8(), false), // non-nullable user id
  new Field('name', new Utf8(), false), // non-nullable category name
  new Field('color', new Utf8(), true), // nullable color hex code for UI display
  new Field('createdAt', new Timestamp(TimeUnit.MILLISECOND), false), // non-nullable creation timestamp in milliseconds
  new Field('updatedAt', new Timestamp(TimeUnit.MILLISECOND), false), // non-nullable update timestamp in milliseconds
]);

/**
 * Attachments table schema
 * Stores file attachments with metadata
 * For images and videos, multimodalEmbedding stores the fusion vector from multimodal embedding service
 */
export const attachmentsSchema = new Schema([
  new Field('attachmentId', new Utf8(), false), // non-nullable unique attachment id
  new Field('uid', new Utf8(), false), // non-nullable user id
  new Field('filename', new Utf8(), false), // non-nullable original filename
  new Field('url', new Utf8(), false), // non-nullable S3 address or local relative path
  new Field('type', new Utf8(), false), // non-nullable MIME type
  new Field('size', new Int32(), false), // non-nullable file size in bytes
  new Field('storageType', new Utf8(), false), // non-nullable storage type: 'local' | 's3'
  new Field(
    'multimodalEmbedding',
    new FixedSizeList(1024, new Field('item', new Float32(), true)),
    true
  ), // nullable multimodal embedding vector (1024-dim)
  new Field('multimodalModelHash', new Utf8(), true), // nullable model hash for multimodal embedding
  new Field('createdAt', new Timestamp(TimeUnit.MILLISECOND), false), // non-nullable creation timestamp in milliseconds
]);

/**
 * Type definition for category records
 */
export interface CategoryRecord {
  categoryId: string;
  uid: string;
  name: string;
  color?: string; // optional color hex code for UI display
  createdAt: number; // timestamp in milliseconds
  updatedAt: number; // timestamp in milliseconds
}

/**
 * Type definition for memo relation records
 */
export interface MemoRelationRecord {
  relationId: string;
  uid: string;
  sourceMemoId: string;
  targetMemoId: string;
  createdAt: number; // timestamp in milliseconds
}

/**
 * Type definition for attachment records
 */
export interface AttachmentRecord {
  attachmentId: string;
  uid: string;
  filename: string;
  url: string;
  type: string;
  size: number;
  storageType: 'local' | 's3';
  multimodalEmbedding?: number[]; // optional multimodal embedding vector for images and videos
  multimodalModelHash?: string; // optional model hash for multimodal embedding
  createdAt: number; // timestamp in milliseconds
}
