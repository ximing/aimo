import { Static, Type } from '@sinclair/typebox';

// 基础类型定义
export const User = Type.Object({
  id: Type.Number(),
  email: Type.String({ format: 'email' }),
  name: Type.Optional(Type.String()),
  role: Type.String(),
  createdAt: Type.Number(),
  isActive: Type.Boolean(),
});

export const RegisterSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 6 }),
  name: Type.Optional(Type.String()),
});

export const LoginSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String(),
});

export const AuthResponseSchema = Type.Object({
  user: User,
  token: Type.String(),
});

// 导出类型
export type UserType = Static<typeof User>;
export type RegisterInput = Static<typeof RegisterSchema>;
export type LoginInput = Static<typeof LoginSchema>;
export type AuthResponse = Static<typeof AuthResponseSchema>;

// 路由 schema 定义
export const schemas = {
  register: {
    body: RegisterSchema,
    response: {
      200: AuthResponseSchema,
    },
  },
  login: {
    body: LoginSchema,
    response: {
      200: AuthResponseSchema,
    },
  },
  getProviders: {
    response: {
      200: Type.Array(Type.String()),
    },
  },
  getProfile: {
    response: {
      200: User,
    },
  },
};
