import { z } from 'zod';
import { FastifySchema } from 'fastify';
import { Static, Type } from '@sinclair/typebox';

const initBodySchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

// Fastify schema
export const initSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['email', 'password', 'name'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 },
      name: { type: 'string', minLength: 2 },
    },
  },
};

// Types for request validation
export type InitInput = z.infer<typeof initBodySchema>;

// Response type
export interface InitResponse {
  user: {
    id: number;
    email: string;
    name: string | null;
    role: string;
    createdAt: Date;
  };
  token: string;
}

// Export Zod schema for runtime validation
export const zodSchemas = {
  init: initBodySchema,
};

export interface SystemSettingsResponse {
  initialized: boolean;
  version: string;
  adminEmail?: string;
}

// 基础类型定义
export const SystemInfo = Type.Object({
  version: Type.String(),
  nodeVersion: Type.String(),
  platform: Type.String(),
  uptime: Type.Number(),
  memoryUsage: Type.Object({
    total: Type.Number(),
    free: Type.Number(),
    used: Type.Number(),
  }),
  cpuUsage: Type.Array(Type.Number()),
});

export const SystemStats = Type.Object({
  totalUsers: Type.Number(),
  totalNotes: Type.Number(),
  totalAttachments: Type.Number(),
  storageUsage: Type.Number(),
});

// 导出类型
export type SystemInfoType = Static<typeof SystemInfo>;
export type SystemStatsType = Static<typeof SystemStats>;

// 路由 schema 定义
export const schemas = {
  getInfo: {
    response: {
      200: SystemInfo,
    },
  },
  getStats: {
    response: {
      200: SystemStats,
    },
  },
};
