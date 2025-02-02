import { FastifyReply, FastifyRequest } from 'fastify';
import os from 'os';
import { db } from '@/lib/db.js';
import { users, notes, attachments, noteTags, tags } from '@/config/schema.js';
import { count, sql } from 'drizzle-orm';
import { SystemInfoType, SystemStatsType } from './schema.js';
import { backupService } from '@/lib/backup.js';
import { generateEmbedding } from '@/lib/openai.js';
import { eq } from 'drizzle-orm';

export async function getSystemInfo(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<SystemInfoType> {
  return {
    version: process.env.npm_package_version || '0.0.0',
    nodeVersion: process.version,
    platform: process.platform,
    uptime: process.uptime(),
    memoryUsage: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
    },
    cpuUsage: os.loadavg(),
  };
}

export async function getSystemStats(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<SystemStatsType> {
  const [{ value: totalUsers }] = await db
    .select({ value: count() })
    .from(users);

  const [{ value: totalNotes }] = await db
    .select({ value: count() })
    .from(notes);

  const [{ value: totalAttachments }] = await db
    .select({ value: count() })
    .from(attachments);

  const [{ storageUsage }] = await db
    .select({
      storageUsage: sql<number>`sum(size)::bigint`,
    })
    .from(attachments);

  return {
    totalUsers,
    totalNotes,
    totalAttachments,
    storageUsage: storageUsage || 0,
  };
}

export async function createBackup(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (request.user.role !== 'admin') {
    throw reply.status(403).send({
      message: 'Forbidden',
      code: 'FORBIDDEN',
    });
  }

  await backupService.backup();
  return { success: true };
}

export async function listBackups(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (request.user.role !== 'admin') {
    throw reply.status(403).send({
      message: 'Forbidden',
      code: 'FORBIDDEN',
    });
  }

  return backupService.listBackups();
}

export async function importNotes(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const file = await request.file();
  if (!file) {
    throw reply.status(400).send({
      message: 'No file uploaded',
      code: 'NO_FILE',
    });
  }

  try {
    const buffer = await file.toBuffer();
    const content = buffer.toString('utf-8');
    const data = JSON.parse(content);
    console.log(data);
    if (!Array.isArray(data)) {
      throw reply.status(400).send({
        message: 'Invalid file format',
        code: 'INVALID_FORMAT',
      });
    }

    const importedNotes = [];
    for (const item of data) {
      // 生成向量嵌入
      const embedding = await generateEmbedding(item.content);

      // 创建笔记
      const [note] = await db
        .insert(notes)
        .values({
          userId: request.user.id,
          content: item.content,
          vectorEmbedding: embedding,
          isPublic: item.isPublic || false,
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
        })
        .returning();

      // 处理标签
      if (Array.isArray(item.tags)) {
        for (const tagName of item.tags) {
          // 查找或创建标签
          let tag = await db.query.tags.findFirst({
            where: eq(tags.name, tagName),
          });

          if (!tag) {
            [tag] = await db.insert(tags).values({ name: tagName }).returning();
          }

          // 创建笔记-标签关联
          await db.insert(noteTags).values({
            noteId: note.id,
            tagId: tag.id,
          });
        }
      }

      importedNotes.push(note);
    }

    return {
      success: true,
      imported: importedNotes.length,
    };
  } catch (error) {
    console.error('Import failed:', error);
    throw reply.status(500).send({
      message: 'Import failed',
      code: 'IMPORT_FAILED',
    });
  }
}
