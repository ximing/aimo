import { z } from "zod";
import { FastifySchema } from "fastify";

const initBodySchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

// Fastify schema
export const initSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["email", "password", "name"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 6 },
      name: { type: "string", minLength: 2 },
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
