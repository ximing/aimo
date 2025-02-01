import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "@/lib/db.js";
import { notes, tags, noteTags, attachments } from "@/config/schema.js";
import { eq, and, sql, like, desc, asc, inArray } from "drizzle-orm";
import {
  CreateNoteInput,
  UpdateNoteInput,
  NoteResponse,
  HeatmapQuery,
  NoteQueryParams,
} from "./schema.js";
import { generateEmbedding } from "@/lib/openai.js";
import { nanoid } from "nanoid";
import { triggerWebhook } from "@/lib/webhook.js";
import { FastifyJWT } from "@fastify/jwt";
import { getStorageService } from "@/lib/storage.js";
import path from "path";

interface TagCount {
  name: string;
  count: number;
}

interface HeatmapData {
  date: string;
  count: number;
}

export async function createNote(
  request: FastifyRequest<{
    Body: CreateNoteInput;
  }> & { user: FastifyJWT["user"] },
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
  await triggerWebhook(userId, "note.created", {
    noteId: note.id,
    content: note.content,
    tags: tagList,
  });

  return {
    ...note,
    tags: tagList,
  };
}

export async function updateNote(
  request: FastifyRequest<{
    Params: { id: string };
    Body: UpdateNoteInput;
  }> & { user: FastifyJWT["user"] },
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
    throw reply.status(404).send({ message: "Note not found" });
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
  await triggerWebhook(userId, "note.updated", {
    noteId: note.id,
    content: note.content,
    tags: tagList,
  });

  return {
    ...note,
    tags: tagList,
  };
}

export async function deleteNote(
  request: FastifyRequest<{
    Params: { id: string };
  }> & { user: FastifyJWT["user"] },
  reply: FastifyReply
) {
  const { id } = request.params;
  const userId = request.user.id;

  const [deletedNote] = await db
    .delete(notes)
    .where(and(eq(notes.id, parseInt(id)), eq(notes.userId, userId)))
    .returning();

  if (!deletedNote) {
    throw reply.status(404).send({ message: "Note not found" });
  }

  // Trigger webhook
  await triggerWebhook(userId, "note.deleted", {
    noteId: parseInt(id),
  });

  return { success: true };
}

export async function getNotes(
  request: FastifyRequest<{
    Querystring: NoteQueryParams;
  }> & { user: FastifyJWT["user"] },
  reply: FastifyReply
) {
  const {
    page = 1,
    pageSize = 20,
    sortBy = "newest",
    tag,
    search,
    startDate,
    endDate,
    searchMode,
  } = request.query;
  const userId = request.user.id;

  // 基础查询
  let query = db
    .select({
      id: notes.id,
      content: notes.content,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
      userId: notes.userId,
      isPublic: notes.isPublic,
      shareToken: notes.shareToken,
      attachments: notes.attachments,
      tags: sql<string[]>`
        array_agg(distinct ${tags.name})
        filter (where ${tags.name} is not null)
      `.as("tags"),
    })
    .from(notes)
    .leftJoin(noteTags, eq(notes.id, noteTags.noteId))
    .leftJoin(tags, eq(noteTags.tagId, tags.id))
    .where(eq(notes.userId, userId));

  // 添加标签过滤
  if (tag) {
    query = query.where(sql`${tags.name} = ${tag}`);
  }

  // 添加日期范围过滤
  if (startDate && endDate) {
    query = query.where(
      sql`${notes.createdAt}::date BETWEEN ${startDate}::date AND ${endDate}::date`
    );
  }

  // 处理搜索和排序
  if (search) {
    if (searchMode === "similarity") {
      // 相似度搜索：使用余弦距离
      const embedding = await generateEmbedding(search);
      query = query
        .orderBy(sql`${notes.vectorEmbedding} <=> ${JSON.stringify(embedding)}`)
        .limit(pageSize);
    } else {
      // 全文检索
      query = query
        .where(sql`${notes.content} ILIKE ${`%${search}%`}`)
        .orderBy(desc(notes.createdAt))
        .offset((page - 1) * pageSize)
        .limit(pageSize);
    }
  } else {
    // 如果不是搜索，使用普通排序和分页
    query = query
      .orderBy(
        sortBy === "newest" ? desc(notes.createdAt) : asc(notes.createdAt)
      )
      .offset((page - 1) * pageSize)
      .limit(pageSize);
  }

  // 执行查询并分组
  const result = await query.groupBy(notes.id);

  // 处理结果
  const noteResults = result.map((note) => ({
    ...note,
    tags: note.tags || [],
  }));

  // 获取总数（用于分页）
  const [{ count }] = await db
    .select({
      count: sql<number>`count(distinct ${notes.id})::int`,
    })
    .from(notes)
    .where(eq(notes.userId, userId))
    .execute();

  // 返回结果
  return {
    notes: noteResults,
    pagination: {
      total: Number(count),
      page,
      pageSize,
      hasMore: page * pageSize < Number(count),
    },
  };
}

export async function getNoteByShareToken(
  request: FastifyRequest<{ Params: { token: string } }>,
  reply: FastifyReply
) {
  const { token } = request.params;

  const note = await db.query.notes.findFirst({
    where: and(eq(notes.shareToken, token), eq(notes.isPublic, true)),
    with: {
      tags: {
        with: {
          tag: true,
        },
      },
    },
  });

  if (!note) {
    throw reply.status(404).send({ message: "Note not found" });
  }

  return {
    ...note,
    tags: note.tags.map((t) => t.tag.name),
  };
}

export async function getTags(
  request: FastifyRequest & { user: { id: number } },
  reply: FastifyReply
): Promise<TagCount[]> {
  const { id: userId } = request.user;

  const userNotes = await db
    .select({
      id: notes.id,
      tags: sql<string[]>`
        array_agg(distinct ${tags.name})
        filter (where ${tags.name} is not null)
      `.as("tags"),
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
  }> & { user: FastifyJWT["user"] },
  reply: FastifyReply
): Promise<HeatmapData[]> {
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
  request: FastifyRequest<{}>,
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
      console.error("File upload failed:", error);
      throw new Error("File upload failed");
    }
  }

  return results;
}
