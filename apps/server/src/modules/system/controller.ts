import { FastifyReply, FastifyRequest } from 'fastify';
import os from 'os';
import { db } from '@/lib/db.js';
import { users, notes, attachments } from '@/config/schema.js';
import { count, sql } from 'drizzle-orm';
import { SystemInfoType, SystemStatsType } from './schema.js';

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