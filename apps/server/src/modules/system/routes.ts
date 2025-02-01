import { FastifyInstance } from 'fastify';
import { initSystem } from './init.js';
import { initSchema } from './schema.js';

export async function systemRoutes(app: FastifyInstance) {
  app.post('/init', { schema: initSchema }, initSystem);
}
