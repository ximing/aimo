import { Static, Type } from '@sinclair/typebox';

// 基础类型定义
export const Webhook = Type.Object({
  id: Type.Number(),
  userId: Type.Number(),
  url: Type.String({ format: 'uri' }),
  secret: Type.String(),
  events: Type.Array(Type.String()),
  isActive: Type.Boolean(),
  createdAt: Type.Number(),
  updatedAt: Type.Number(),
});

export const CreateWebhookSchema = Type.Object({
  url: Type.String({ format: 'uri' }),
  events: Type.Array(Type.String()),
  secret: Type.Optional(Type.String()),
});

export const UpdateWebhookSchema = Type.Object({
  url: Type.Optional(Type.String({ format: 'uri' })),
  events: Type.Optional(Type.Array(Type.String())),
  secret: Type.Optional(Type.String()),
  isActive: Type.Optional(Type.Boolean()),
});

export const WebhookQuerySchema = Type.Object({
  limit: Type.Optional(Type.Number()),
  offset: Type.Optional(Type.Number()),
});

// 导出类型
export type WebhookType = Static<typeof Webhook>;
export type CreateWebhookInput = Static<typeof CreateWebhookSchema>;
export type UpdateWebhookInput = Static<typeof UpdateWebhookSchema>;
export type WebhookQueryParams = Static<typeof WebhookQuerySchema>;

// 路由 schema 定义
export const schemas = {
  createWebhook: {
    body: CreateWebhookSchema,
    response: {
      200: Webhook,
    },
  },
  updateWebhook: {
    params: Type.Object({
      id: Type.String(),
    }),
    body: UpdateWebhookSchema,
    response: {
      200: Webhook,
    },
  },
  getWebhooks: {
    querystring: WebhookQuerySchema,
    response: {
      200: Type.Array(Webhook),
    },
  },
  getWebhook: {
    params: Type.Object({
      id: Type.String(),
    }),
    response: {
      200: Webhook,
    },
  },
  deleteWebhook: {
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
