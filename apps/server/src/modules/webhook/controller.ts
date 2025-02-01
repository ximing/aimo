import { FastifyReply, FastifyRequest } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';

import { db } from '@/lib/db.js';
import { webhooks } from '@/config/schema.js';
import {
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhookQueryParams,
  WebhookType,
} from './schema.js';

export async function createWebhook(
  request: FastifyRequest<{
    Body: CreateWebhookInput;
  }>,
  reply: FastifyReply
): Promise<WebhookType> {
  const { url, events, secret } = request.body;
  const userId = request.user.id;

  const [webhook] = await db
    .insert(webhooks)
    .values({
      userId,
      url,
      events,
      isActive: true,
      secret: secret || generateSecret(),
    } as typeof webhooks.$inferInsert)
    .returning({
      id: webhooks.id,
      userId: webhooks.userId,
      url: webhooks.url,
      events: webhooks.events,
      isActive: webhooks.isActive,
      secret: webhooks.secret,
      createdAt: webhooks.createdAt,
      updatedAt: webhooks.updatedAt,
    });

  return {
    ...webhook,
    createdAt: webhook.createdAt.getTime(),
    updatedAt: webhook.updatedAt.getTime(),
  } as WebhookType;
}

export async function updateWebhook(
  request: FastifyRequest<{
    Params: { id: string };
    Body: UpdateWebhookInput;
  }>,
  reply: FastifyReply
): Promise<WebhookType> {
  const { id } = request.params;
  const userId = request.user.id;

  const [webhook] = await db
    .update(webhooks)
    .set(request.body)
    .where(and(eq(webhooks.id, parseInt(id)), eq(webhooks.userId, userId)))
    .returning();

  if (!webhook) {
    throw reply.status(404).send({
      message: 'Webhook not found',
      code: 'WEBHOOK_NOT_FOUND',
    });
  }

  return {
    ...webhook,
    createdAt: webhook.createdAt.getTime(),
    updatedAt: webhook.updatedAt.getTime(),
  } as WebhookType;
}

export async function getWebhooks(
  request: FastifyRequest<{
    Querystring: WebhookQueryParams;
  }>,
  reply: FastifyReply
): Promise<WebhookType[]> {
  const { limit = 20, offset = 0 } = request.query;
  const userId = request.user.id;

  const webhookList = await db.query.webhooks.findMany({
    where: eq(webhooks.userId, userId),
    limit,
    offset,
    orderBy: (webhooks, { desc }) => [desc(webhooks.createdAt)],
    columns: {
      id: true,
      userId: true,
      url: true,
      events: true,
      isActive: true,
      secret: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return webhookList.map(
    (webhook) =>
      ({
        ...webhook,
        secret: webhook.secret || '',
        createdAt: webhook.createdAt.getTime(),
        updatedAt: webhook.updatedAt.getTime(),
      }) as WebhookType
  );
}

export async function getWebhook(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
): Promise<WebhookType> {
  const { id } = request.params;
  const userId = request.user.id;

  const webhook = await db.query.webhooks.findFirst({
    where: and(eq(webhooks.id, parseInt(id)), eq(webhooks.userId, userId)),
    columns: {
      id: true,
      userId: true,
      url: true,
      events: true,
      isActive: true,
      secret: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!webhook) {
    throw reply.status(404).send({
      message: 'Webhook not found',
      code: 'WEBHOOK_NOT_FOUND',
    });
  }

  return {
    ...webhook,
    secret: webhook.secret || '',
    createdAt: webhook.createdAt.getTime(),
    updatedAt: webhook.updatedAt.getTime(),
  } as WebhookType;
}

export async function deleteWebhook(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const userId = request.user.id;

  const [webhook] = await db
    .delete(webhooks)
    .where(and(eq(webhooks.id, parseInt(id)), eq(webhooks.userId, userId)))
    .returning();

  if (!webhook) {
    throw reply.status(404).send({
      message: 'Webhook not found',
      code: 'WEBHOOK_NOT_FOUND',
    });
  }

  return { success: true };
}

function generateSecret(): string {
  return randomBytes(32).toString('hex');
}
