import { FastifyReply, FastifyRequest } from 'fastify';
import { db } from '@/lib/db.js';
import { notes, tags, noteTags, attachments } from '@/config/schema.js';
import { eq, and, sql, like, desc, asc, inArray } from 'drizzle-orm';
import {
  CreateNoteInput,
  UpdateNoteInput,
  NoteResponse,
  HeatmapQuery,
  NoteQueryParams,
} from './schema.js';
import { generateEmbedding } from '@/lib/openai.js';
import { nanoid } from 'nanoid';
import { triggerWebhook } from '@/lib/webhook.js';
import { getStorageService } from '@/lib/storage.js';
import path from 'path';

interface TagCount {
  name: string;
  count: number;
}

export async function createNote(
  request: FastifyRequest<{
    Body: CreateNoteInput;
  }>,
  reply: FastifyReply
): Promise<NoteResponse> {
  const {
    content,
    tags: tagNames = [],
    isPublic = false,
    attachments = [],
  } = request.body;
  const userId = request.user.id;

  // Generate vector embedding
  const embedding = await generateEmbedding(content);

  // Create note
  const [note] = await db
    .insert(notes)
    .values({
      userId,
      content,
      vectorEmbedding: embedding,
      isPublic,
      shareToken: isPublic ? nanoid() : null,
      attachments: JSON.stringify(attachments),
    })
    .returning();

  // Handle tags
  const tagList = [];
  if (tagNames.length > 0) {
    for (const tagName of tagNames) {
      // Find or create tag
      let tag = await db.query.tags.findFirst({
        where: eq(tags.name, tagName),
      });

      if (!tag) {
        [tag] = await db.insert(tags).values({ name: tagName }).returning();
      }

      // Create note-tag relation
      await db.insert(noteTags).values({
        noteId: note.id,
        tagId: tag.id,
      });

      tagList.push(tagName);
    }
  }

  // Trigger webhook
  await triggerWebhook(userId, 'note.created', {
    noteId: note.id,
    content: note.content,
    tags: tagList,
  });

  return {
    ...note,
    shareToken: note.shareToken || '',
    createdAt: note.createdAt.getTime(),
    updatedAt: note.updatedAt.getTime(),
    tags: tagList,
  } as NoteResponse;
}

export async function updateNote(
  request: FastifyRequest<{
    Params: { id: string };
    Body: UpdateNoteInput;
  }>,
  reply: FastifyReply
): Promise<NoteResponse> {
  const { id } = request.params;
  const { content, tags: tagNames, isPublic, attachments } = request.body;
  const userId = request.user.id;

  // Check note ownership
  const existingNote = await db.query.notes.findFirst({
    where: and(eq(notes.id, parseInt(id)), eq(notes.userId, userId)),
  });

  if (!existingNote) {
    throw reply.status(404).send({ message: 'Note not found' });
  }

  // Update note
  const updateData: any = {};
  if (content !== undefined) {
    updateData.content = content;
    updateData.vectorEmbedding = await generateEmbedding(content);
  }
  if (isPublic !== undefined) {
    updateData.isPublic = isPublic;
    updateData.shareToken = isPublic
      ? existingNote.shareToken || nanoid()
      : null;
  }

  if (attachments !== undefined) {
    updateData.attachments = JSON.stringify(attachments);
  }

  const [note] = await db
    .update(notes)
    .set(updateData)
    .where(eq(notes.id, parseInt(id)))
    .returning();

  // Update tags if provided
  const tagList = [];
  if (tagNames) {
    // Remove existing tags
    await db.delete(noteTags).where(eq(noteTags.noteId, note.id));

    // Add new tags
    for (const tagName of tagNames) {
      let tag = await db.query.tags.findFirst({
        where: eq(tags.name, tagName),
      });

      if (!tag) {
        [tag] = await db.insert(tags).values({ name: tagName }).returning();
      }

      await db.insert(noteTags).values({
        noteId: note.id,
        tagId: tag.id,
      });

      tagList.push(tagName);
    }
  }

  // Trigger webhook
  await triggerWebhook(userId, 'note.updated', {
    noteId: note.id,
    content: note.content,
    tags: tagList,
  });

  return {
    ...note,
    shareToken: note.shareToken || '',
    createdAt: note.createdAt.getTime(),
    updatedAt: note.updatedAt.getTime(),
    tags: tagList,
  } as NoteResponse;
}

export async function deleteNote(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const userId = request.user.id;

  const [deletedNote] = await db
    .delete(notes)
    .where(and(eq(notes.id, parseInt(id)), eq(notes.userId, userId)))
    .returning();

  if (!deletedNote) {
    throw reply.status(404).send({ message: 'Note not found' });
  }

  // Trigger webhook
  await triggerWebhook(userId, 'note.deleted', {
    noteId: parseInt(id),
  });

  return { success: true };
}

export async function getNotes(
  request: FastifyRequest<{
    Querystring: NoteQueryParams;
  }>,
  reply: FastifyReply
) {
  const {
    page = 1,
    pageSize = 20,
    sortBy = 'newest',
    tag,
    search,
    startDate,
    endDate,
    searchMode,
  } = request.query;
  const userId = request.user.id;

  // 构建基础条件
  const conditions = [eq(notes.userId, userId)];

  if (tag) {
    conditions.push(eq(tags.name, tag));
  }

  if (startDate && endDate) {
    conditions.push(
      sql`${notes.createdAt}::date BETWEEN ${startDate}::date AND ${endDate}::date`
    );
  }

  if (search && searchMode !== 'similarity') {
    conditions.push(sql`${notes.content} ILIKE ${`%${search}%`}`);
  }

  // 构建查询
  const baseSelect = {
    id: notes.id,
    content: notes.content,
    createdAt: notes.createdAt,
    updatedAt: notes.updatedAt,
    userId: notes.userId,
    isPublic: notes.isPublic,
    shareToken: notes.shareToken,
    attachments: notes.attachments,
    vectorEmbedding: notes.vectorEmbedding,
    tagNames: sql<string[]>`
      array_agg(distinct ${tags.name})
      filter (where ${tags.name} is not null)
    `.as('tag_names'),
  };

  // 处理相似度搜索
  if (search && searchMode === 'similarity') {
    const embedding = await generateEmbedding(search);
    const result = await db
      .select(baseSelect)
      .from(notes)
      .leftJoin(noteTags, eq(notes.id, noteTags.noteId))
      .leftJoin(tags, eq(noteTags.tagId, tags.id))
      .where(and(...conditions))
      .groupBy(notes.id)
      .orderBy(sql`${notes.vectorEmbedding} <=> ${JSON.stringify(embedding)}`)
      .limit(pageSize)
      .execute();

    return {
      notes: result.map((note) => ({
        ...note,
        tags: note.tagNames || [],
      })),
      pagination: {
        total: result.length,
        page: 1,
        pageSize,
        hasMore: false,
      },
    };
  }

  // 常规查询
  const result = await db
    .select(baseSelect)
    .from(notes)
    .leftJoin(noteTags, eq(notes.id, noteTags.noteId))
    .leftJoin(tags, eq(noteTags.tagId, tags.id))
    .where(and(...conditions))
    .groupBy(notes.id)
    .orderBy(sortBy === 'newest' ? desc(notes.createdAt) : asc(notes.createdAt))
    .offset((page - 1) * pageSize)
    .limit(pageSize)
    .execute();

  // 获取总数
  const [{ count }] = await db
    .select({
      count: sql<number>`count(distinct ${notes.id})::int`,
    })
    .from(notes)
    .where(and(...conditions))
    .execute();

  return {
    notes: result.map((note) => ({
      ...note,
      tags: note.tagNames || [],
    })),
    pagination: {
      total: Number(count),
      page,
      pageSize,
      hasMore: page * pageSize < Number(count),
    },
  };
}

export async function getNoteByShareToken(
  request: FastifyRequest<{
    Params: { token: string };
  }>,
  reply: FastifyReply
) {
  const { token } = request.params;

  const result = await db
    .select({
      id: notes.id,
      content: notes.content,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
      userId: notes.userId,
      isPublic: notes.isPublic,
      shareToken: notes.shareToken,
      attachments: notes.attachments,
      vectorEmbedding: notes.vectorEmbedding,
      tagNames: sql<string[]>`
        array_agg(distinct ${tags.name})
        filter (where ${tags.name} is not null)
      `.as('tag_names'),
    })
    .from(notes)
    .leftJoin(noteTags, eq(notes.id, noteTags.noteId))
    .leftJoin(tags, eq(noteTags.tagId, tags.id))
    .where(and(eq(notes.shareToken, token), eq(notes.isPublic, true)))
    .groupBy(notes.id)
    .execute();

  if (!result || result.length === 0) {
    throw reply.status(404).send({ message: 'Note not found' });
  }

  return {
    ...result[0],
    tags: result[0].tagNames || [],
  };
}

export async function getTags(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<TagCount[]> {
  const { id: userId } = request.user;

  const userNotes = await db
    .select({
      id: notes.id,
      tags: sql<string[]>`
        array_agg(distinct ${tags.name})
        filter (where ${tags.name} is not null)
      `.as('tags'),
    })
    .from(notes)
    .leftJoin(noteTags, eq(notes.id, noteTags.noteId))
    .leftJoin(tags, eq(noteTags.tagId, tags.id))
    .where(eq(notes.userId, userId))
    .groupBy(notes.id);

  // 统计每个标签的数量
  const tagCounts = userNotes.reduce(
    (acc, note) => {
      (note.tags || []).forEach((tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    },
    {} as Record<string, number>
  );

  // 转换为数组格式
  return Object.entries(tagCounts).map(([name, count]) => ({
    name,
    count,
  }));
}

export async function getNotesHeatmap(
  request: FastifyRequest<{
    Querystring: HeatmapQuery;
  }>,
  reply: FastifyReply
) {
  const { startDate, endDate } = request.query;
  const userId = request.user.id;

  const result = await db
    .select({
      date: sql<string>`DATE(${notes.createdAt})::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(notes)
    .where(
      and(
        eq(notes.userId, userId),
        sql`${notes.createdAt}::date BETWEEN ${startDate}::date AND ${endDate}::date`
      )
    )
    .groupBy(sql`DATE(${notes.createdAt})`)
    .orderBy(sql`DATE(${notes.createdAt})`);

  return result;
}

export async function uploadAttachments(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const files = await request.files();

  const storage = getStorageService();
  const results = [];

  for await (const file of files) {
    // 生成文件名
    const filename = `${nanoid(64)}${path.extname(file.filename)}`;

    try {
      // 保存文件
      const { path: filePath, size } = await storage.saveFile(file, filename);

      // 保存附件记录到数据库
      const [attachment] = await db
        .insert(attachments)
        .values({
          filename: file.filename,
          url: filePath,
          size,
          mimeType: file.mimetype,
        })
        .returning();

      results.push({
        url: filePath,
        filename: file.filename,
        size,
        mimeType: file.mimetype,
      });
    } catch (error) {
      console.error('File upload failed:', error);
      throw new Error('File upload failed');
    }
  }

  return results;
}
