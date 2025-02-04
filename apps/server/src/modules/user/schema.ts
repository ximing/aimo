import { Type } from '@sinclair/typebox';
import { FastifySchema } from 'fastify';

// 基础类型定义
export const UserResponseSchema = Type.Object({
  id: Type.Number(),
  email: Type.String({ format: 'email' }),
  name: Type.Optional(Type.String()),
  nickname: Type.Optional(Type.String()),
  avatar: Type.Optional(Type.String()),
  role: Type.Union([Type.Literal('admin'), Type.Literal('user')]),
  createdAt: Type.Number(),
  isActive: Type.Boolean(),
  githubId: Type.Optional(Type.String()),
  googleId: Type.Optional(Type.String()),
});

export type UserResponse = typeof UserResponseSchema.static;

export const UpdateUserParamsSchema = Type.Object({
  id: Type.String(),
});

export const UpdateUserBodySchema = Type.Object({
  name: Type.Optional(Type.String()),
  role: Type.Optional(
    Type.Union([Type.Literal('admin'), Type.Literal('user')])
  ),
  isActive: Type.Optional(Type.Boolean()),
});

export const UpdateUserSchema: FastifySchema = {
  params: UpdateUserParamsSchema,
  body: UpdateUserBodySchema,
  response: {
    200: UserResponseSchema,
  },
};

export const UserQuerySchema = Type.Object({
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
  offset: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
});

export type UserQueryParams = typeof UserQuerySchema.static;
export type UpdateUserInput = typeof UpdateUserBodySchema.static;

// 路由 schema 定义
export const schemas = {
  getProfile: {
    response: {
      200: UserResponseSchema,
    },
  },
  listUsers: {
    querystring: UserQuerySchema,
    response: {
      200: Type.Array(UserResponseSchema),
    },
  },
  updateUser: UpdateUserSchema,
  deleteUser: {
    params: Type.Object({
      id: Type.String(),
    }),
    response: {
      200: Type.Object({
        success: Type.Boolean(),
      }),
    },
  },
};
