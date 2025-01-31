import { z } from "zod";
import { FastifySchema } from "fastify";

const createNoteBodySchema = z.object({
  content: z.string().min(1, "Content is required"),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
});

const updateNoteBodySchema = z.object({
  content: z.string().min(1, "Content is required").optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
});

const searchNoteQuerySchema = z.object({
  q: z.string().min(1, "Search query is required"),
  tag: z.string().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().min(0).optional(),
});

// Fastify schemas
export const createNoteSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["content"],
    properties: {
      content: { type: "string", minLength: 1 },
      tags: {
        type: "array",
        items: { type: "string" },
      },
      isPublic: { type: "boolean" },
    },
  },
};

export const updateNoteSchema: FastifySchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
    },
  },
  body: {
    type: "object",
    properties: {
      content: { type: "string", minLength: 1 },
      tags: {
        type: "array",
        items: { type: "string" },
      },
      isPublic: { type: "boolean" },
    },
  },
};

export const searchNoteSchema: FastifySchema = {
  querystring: {
    type: "object",
    required: ["q"],
    properties: {
      q: { type: "string", minLength: 1 },
      tag: { type: "string" },
      limit: { type: "number", minimum: 1 },
      offset: { type: "number", minimum: 0 },
    },
  },
};

export const getNoteByShareTokenSchema: FastifySchema = {
  params: {
    type: "object",
    required: ["token"],
    properties: {
      token: { type: "string" },
    },
  },
};

// Types for request validation
export type CreateNoteInput = z.infer<typeof createNoteBodySchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteBodySchema>;
export type SearchNoteInput = z.infer<typeof searchNoteQuerySchema>;

// Response type
export interface NoteResponse {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  userId: number;
  isPublic: boolean;
  shareToken: string | null;
  vectorEmbedding?: string | null;
  tags: string[];
}

// Export Zod schemas for runtime validation
export const zodSchemas = {
  createNote: createNoteBodySchema,
  updateNote: updateNoteBodySchema,
  searchNote: searchNoteQuerySchema,
};

// 添加热力图相关的 schema
const heatmapQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
});

const getNotesQuerySchema = z.object({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  sortBy: z.enum(["newest", "oldest"]).optional(),
});

// Fastify schemas
export const getNotesSchema: FastifySchema = {
  querystring: {
    type: "object",
    properties: {
      page: { type: "number", minimum: 1 },
      pageSize: { type: "number", minimum: 1, maximum: 100 },
      sortBy: { type: "string", enum: ["newest", "oldest"] },
    },
  },
};

export const heatmapSchema: FastifySchema = {
  querystring: {
    type: "object",
    required: ["startDate", "endDate"],
    properties: {
      startDate: { type: "string", format: "date" },
      endDate: { type: "string", format: "date" },
    },
  },
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          count: { type: "number" },
        },
      },
    },
  },
};

// Types for request validation
export type GetNotesQuery = z.infer<typeof getNotesQuerySchema>;
export type HeatmapQuery = z.infer<typeof heatmapQuerySchema>;

// 统一的查询参数 schema
const noteQuerySchema = z.object({
  // 分页参数
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),

  // 排序
  sortBy: z.enum(["newest", "oldest"]).optional(),

  // 过滤条件
  tag: z.string().optional(),
  search: z.string().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type NoteQueryParams = z.infer<typeof noteQuerySchema>;

export const getNoteSchema: FastifySchema = {
  querystring: {
    type: "object",
    properties: {
      page: { type: "number", minimum: 1 },
      pageSize: { type: "number", minimum: 1, maximum: 100 },
      sortBy: { type: "string", enum: ["newest", "oldest"] },
      tag: { type: "string" },
      search: { type: "string" },
      startDate: { type: "string", format: "date" },
      endDate: { type: "string", format: "date" },
    },
  },
};
