import { Static, Type } from '@sinclair/typebox';

// 基础类型定义
export const User = Type.Object({
  id: Type.Number(),
  email: Type.String({ format: 'email' }),
  name: Type.Optional(Type.String()),
  role: Type.String(),
  createdAt: Type.Number(),
  isActive: Type.Boolean(),
  githubId: Type.Optional(Type.String()),
  googleId: Type.Optional(Type.String()),
});

export const UpdateProfileSchema = Type.Object({
  name: Type.Optional(Type.String()),
  password: Type.Optional(Type.String({ minLength: 6 })),
});

export const UpdateUserSchema = Type.Object({
  name: Type.Optional(Type.String()),
  role: Type.Optional(Type.String()),
  isActive: Type.Optional(Type.Boolean()),
});

export const UserQuerySchema = Type.Object({
  limit: Type.Optional(Type.Number()),
  offset: Type.Optional(Type.Number()),
});

// 导出类型
export type UserType = Static<typeof User>;
export type UpdateProfileInput = Static<typeof UpdateProfileSchema>;
export type UpdateUserInput = Static<typeof UpdateUserSchema>;
export type UserQueryParams = Static<typeof UserQuerySchema>;
export type UserResponse = UserType;

// 路由 schema 定义
export const schemas = {
  getProfile: {
    response: {
      200: User,
    },
  },
  updateProfile: {
    body: UpdateProfileSchema,
    response: {
      200: User,
    },
  },
  listUsers: {
    querystring: UserQuerySchema,
    response: {
      200: Type.Array(User),
    },
  },
  updateUser: {
    params: Type.Object({
      id: Type.String(),
    }),
    body: UpdateUserSchema,
    response: {
      200: User,
    },
  },
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
