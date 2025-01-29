import { z } from "zod";
import { FastifySchema } from "fastify";

const registerBodySchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
});

const loginBodySchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

// Fastify schemas
export const registerSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 6 },
      name: { type: "string", minLength: 2 },
    },
  },
};

export const loginSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 1 },
    },
  },
};

// Types for request validation
export type RegisterInput = z.infer<typeof registerBodySchema>;
export type LoginInput = z.infer<typeof loginBodySchema>;

// Response types
export interface AuthResponse {
  user: {
    id: number;
    email: string;
    name: string | null;
    role: string;
    createdAt: Date;
  };
  token: string;
}

// Export Zod schemas for runtime validation
export const zodSchemas = {
  register: registerBodySchema,
  login: loginBodySchema,
};
