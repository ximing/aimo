import { FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db.js";
import { webhooks } from "@/config/schema.js";
import { CreateWebhookInput } from "./schema.js";

export async function createWebhook(
  request: FastifyRequest<{ Body: CreateWebhookInput }>,
  reply: FastifyReply,
) {
  const { url, events } = request.body;
  const userId = request.user.id;

  const [webhook] = await db
    .insert(webhooks)
    .values({
      userId,
      url,
      events,
      isActive: true,
    })
    .returning();

  return webhook;
}

export async function listWebhooks(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userId = request.user.id;

  const userWebhooks = await db.query.webhooks.findMany({
    where: eq(webhooks.userId, userId),
  });

  return userWebhooks;
}

export async function deleteWebhook(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { id } = request.params;
  const userId = request.user.id;

  await db.delete(webhooks).where(eq(webhooks.id, parseInt(id)));

  return { success: true };
}
