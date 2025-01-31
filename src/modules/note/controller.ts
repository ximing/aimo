import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "@/lib/db.js";
import { notes, tags, noteTags } from "@/config/schema.js";
import { eq, and, sql, like, desc, asc } from "drizzle-orm";
import {
  CreateNoteInput,
  UpdateNoteInput,
  SearchNoteInput,
  NoteResponse,
  GetNotesQuery,
  HeatmapQuery,
} from "./schema.js";
import { generateEmbedding } from "@/lib/openai.js";
import { nanoid } from "nanoid";
import { triggerWebhook } from "@/lib/webhook.js";
import { FastifyJWT } from "@fastify/jwt";

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
  const { content, tags: tagNames = [], isPublic = false } = request.body;
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
  const { content, tags: tagNames, isPublic } = request.body;
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
    Querystring: GetNotesQuery;
  }> & { user: FastifyJWT["user"] },
  reply: FastifyReply
) {
  const userId = request.user.id;
  const page = request.query.page || 1;
  const pageSize = request.query.pageSize || 20;
  const sortBy = request.query.sortBy || "newest";

  // 计算偏移量
  const offset = (page - 1) * pageSize;

  const userNotes = await db
    .select({
      id: notes.id,
      content: notes.content,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
      userId: notes.userId,
      isPublic: notes.isPublic,
      shareToken: notes.shareToken,
      vectorEmbedding: notes.vectorEmbedding,
      tags: sql<string[]>`
        array_agg(distinct ${tags.name})
        filter (where ${tags.name} is not null)
      `.as("tags"),
    })
    .from(notes)
    .leftJoin(noteTags, eq(notes.id, noteTags.noteId))
    .leftJoin(tags, eq(noteTags.tagId, tags.id))
    .where(eq(notes.userId, userId))
    .groupBy(notes.id)
    .orderBy(sortBy === "newest" ? desc(notes.createdAt) : asc(notes.createdAt))
    .limit(pageSize)
    .offset(offset);

  return userNotes.map((note) => ({
    ...note,
    tags: note.tags || [],
  }));
}

export async function searchNotes(
  request: FastifyRequest<{ Querystring: SearchNoteInput }>,
  reply: FastifyReply
) {
  const { q, tag, limit = 10, offset = 0 } = request.query;
  const userId = request.user.id;

  const embedding = await generateEmbedding(q);

  // Build query based on search criteria
  let query = db.select().from(notes).where(eq(notes.userId, userId));

  if (tag) {
    query = query
      .innerJoin(noteTags, eq(notes.id, noteTags.noteId))
      .innerJoin(tags, eq(noteTags.tagId, tags.id))
      .where(eq(tags.name, tag));
  }

  // Add vector similarity search
  const results = await query
    .orderBy(sql`(notes.vector_embedding <-> ${embedding})`)
    .limit(limit)
    .offset(offset);

  return results;
}

export async function getNotesByTag(
  request: FastifyRequest<{ Params: { tag: string } }>,
  reply: FastifyReply
) {
  const { tag } = request.params;
  const userId = request.user.id;

  const taggedNotes = await db.query.notes.findMany({
    where: and(
      eq(notes.userId, userId),
      sql`EXISTS (
        SELECT 1 FROM note_tags nt
        INNER JOIN tags t ON nt.tag_id = t.id
        WHERE nt.note_id = notes.id AND t.name = ${tag}
      )`
    ),
    with: {
      tags: {
        with: {
          tag: true,
        },
      },
    },
    orderBy: [desc(notes.createdAt)],
  });

  return taggedNotes.map((note) => ({
    ...note,
    tags: note.tags.map((t) => t.tag.name),
  }));
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
