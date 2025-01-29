import { z } from "zod";
import { FastifySchema } from "fastify";

const updateProfileBodySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional(),
});

const updateUserBodySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  role: z.enum(["user", "admin"]).optional(),
  isActive: z.boolean().optional(),
});

// Fastify schemas
export const updateProfileSchema: FastifySchema = {
  body: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 2 },
      password: { type: "string", minLength: 6 },
    },
  },
};

export const updateUserSchema: FastifySchema = {
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
      name: { type: "string", minLength: 2 },
      role: { type: "string", enum: ["user", "admin"] },
      isActive: { type: "boolean" },
    },
  },
};

// Types for request validation
export type UpdateProfileInput = z.infer<typeof updateProfileBodySchema>;
export type UpdateUserInput = z.infer<typeof updateUserBodySchema>;

// Response type
export interface UserResponse {
  id: number;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date;
  isActive: boolean;
}

// Export Zod schemas for runtime validation
export const zodSchemas = {
  updateProfile: updateProfileBodySchema,
  updateUser: updateUserBodySchema,
};
