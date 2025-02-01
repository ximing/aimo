import { FastifyInstance } from 'fastify';
import {
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhooks,
  getWebhook,
} from './controller.js';
import {
  schemas,
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhookQueryParams,
} from './schema.js';

export async function webhookRoutes(app: FastifyInstance) {
  // Add authentication to all routes
  app.addHook('onRequest', app.authenticate);

  app.post<{
    Body: CreateWebhookInput;
  }>('/webhooks', { schema: schemas.createWebhook }, createWebhook);

  app.put<{
    Params: { id: string };
    Body: UpdateWebhookInput;
  }>('/webhooks/:id', { schema: schemas.updateWebhook }, updateWebhook);

  app.get<{
    Querystring: WebhookQueryParams;
  }>('/webhooks', { schema: schemas.getWebhooks }, getWebhooks);

  app.get<{
    Params: { id: string };
  }>('/webhooks/:id', { schema: schemas.getWebhook }, getWebhook);

  app.delete<{
    Params: { id: string };
  }>('/webhooks/:id', { schema: schemas.deleteWebhook }, deleteWebhook);
}
