/**
 * Attachment Repository
 * Handles Drizzle database operations for attachments
 * Scalar data only - multimodal embeddings remain in LanceDB
 */

import { Service } from 'typedi';

import { DrizzleAdapter, getAttachmentsTable } from '../sources/database/index.js';
import type { AttachmentsSelect, AttachmentsInsert } from '../sources/database/schema/attachments.js';

import type { AttachmentDto } from '@aimo/dto';

export interface CreateAttachmentData {
  attachmentId: string;
  uid: string;
  filename: string;
  type: string;
  size: number;
  storageType: string;
  path: string;
  bucket?: string;
  prefix?: string;
  endpoint?: string;
  region?: string;
  isPublicBucket?: string;
  properties?: string;
  createdAt?: number;
}

export interface AttachmentSearchOptions {
  uid: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

@Service()
export class AttachmentRepository {
  constructor(private drizzleAdapter: DrizzleAdapter) {}

  /**
   * Get the database client and table
   */
  private getTable() {
    const db = this.drizzleAdapter.getDb() as any;
    const dbType = this.drizzleAdapter.getDbType();
    return getAttachmentsTable(dbType);
  }

  /**
   * Create a new attachment
   */
  async create(data: CreateAttachmentData): Promise<AttachmentDto> {
    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();
    const now = data.createdAt || Date.now();

    const insertData: Omit<AttachmentsInsert, 'id'> = {
      attachmentId: data.attachmentId,
      uid: data.uid,
      filename: data.filename,
      type: data.type,
      size: data.size,
      storageType: data.storageType,
      path: data.path,
      bucket: data.bucket || null,
      prefix: data.prefix || null,
      endpoint: data.endpoint || null,
      region: data.region || null,
      isPublicBucket: data.isPublicBucket || null,
      properties: data.properties || null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };

    await db.insert(table).values(insertData);

    return this.mapToDto(insertData as AttachmentsSelect);
  }

  /**
   * Find attachment by ID
   */
  async findById(attachmentId: string): Promise<AttachmentDto | null> {
    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();

    const { eq } = await import('drizzle-orm');

    const results = await db
      .select()
      .from(table)
      .where(eq(table.attachmentId, attachmentId))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    return this.mapToDto(results[0]);
  }

  /**
   * Find attachment by ID and UID
   */
  async findByIdAndUid(attachmentId: string, uid: string): Promise<AttachmentDto | null> {
    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();

    const { eq, and } = await import('drizzle-orm');

    const results = await db
      .select()
      .from(table)
      .where(and(eq(table.attachmentId, attachmentId), eq(table.uid, uid)))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    return this.mapToDto(results[0]);
  }

  /**
   * Find attachments by user ID with pagination
   */
  async findByUserId(options: AttachmentSearchOptions): Promise<{
    items: AttachmentDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();

    const { eq, desc, asc, and } = await import('drizzle-orm');

    const { uid, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await db
      .select()
      .from(table)
      .where(eq(table.uid, uid));

    const total = countResult.length;

    // Get paginated results
    const orderColumn = sortBy === 'createdAt' ? table.createdAt : table.createdAt;
    const orderFn = sortOrder === 'desc' ? desc : asc;

    const results = await db
      .select()
      .from(table)
      .where(eq(table.uid, uid))
      .orderBy(orderFn(orderColumn))
      .limit(limit)
      .offset(offset);

    return {
      items: results.map((r) => this.mapToDto(r)),
      total,
      page,
      limit,
    };
  }

  /**
   * Find attachments by multiple IDs (batch fetch)
   */
  async findByIds(attachmentIds: string[], uid: string): Promise<AttachmentDto[]> {
    if (!attachmentIds || attachmentIds.length === 0) {
      return [];
    }

    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();

    const { inArray, and, eq } = await import('drizzle-orm');

    const results = await db
      .select()
      .from(table)
      .where(and(inArray(table.attachmentId, attachmentIds), eq(table.uid, uid)));

    // Preserve order of attachmentIds
    const attachmentMap = new Map<string, AttachmentDto>();
    for (const r of results) {
      attachmentMap.set(r.attachmentId, this.mapToDto(r));
    }

    return attachmentIds
      .map((id) => attachmentMap.get(id))
      .filter((a): a is AttachmentDto => a !== undefined);
  }

  /**
   * Update attachment properties
   */
  async updateProperties(
    attachmentId: string,
    uid: string,
    properties: Record<string, unknown>
  ): Promise<AttachmentDto | null> {
    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();

    const { eq, and } = await import('drizzle-orm');

    // Get existing properties
    const existing = await this.findByIdAndUid(attachmentId, uid);
    if (!existing) {
      return null;
    }

    // Merge properties
    const existingProps = existing.properties || {};
    const mergedProperties = { ...existingProps, ...properties };
    const propertiesJson = JSON.stringify(mergedProperties);

    await db
      .update(table)
      .set({ properties: propertiesJson, updatedAt: new Date() })
      .where(and(eq(table.attachmentId, attachmentId), eq(table.uid, uid)));

    return this.findByIdAndUid(attachmentId, uid);
  }

  /**
   * Delete attachment
   */
  async delete(attachmentId: string, uid: string): Promise<boolean> {
    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();

    const { eq, and } = await import('drizzle-orm');

    await db
      .delete(table)
      .where(and(eq(table.attachmentId, attachmentId), eq(table.uid, uid)));

    return true;
  }

  /**
   * Map database row to AttachmentDto
   */
  private mapToDto(row: AttachmentsSelect): AttachmentDto {
    let properties: Record<string, unknown> = {};
    if (row.properties) {
      try {
        if (typeof row.properties === 'string') {
          properties = JSON.parse(row.properties);
        } else {
          properties = row.properties as Record<string, unknown>;
        }
      } catch {
        properties = {};
      }
    }

    return {
      attachmentId: row.attachmentId,
      filename: row.filename,
      url: row.path, // URL will be generated by the service
      type: row.type,
      size: row.size,
      createdAt: row.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
      properties: Object.keys(properties).length > 0 ? properties : undefined,
    };
  }
}
