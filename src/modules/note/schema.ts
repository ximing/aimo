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
