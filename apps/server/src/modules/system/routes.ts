import { FastifyInstance } from 'fastify';
import {
  getSystemInfo,
  getSystemStats,
} from './controller.js';
import { schemas } from './schema.js';

export async function systemRoutes(app: FastifyInstance) {
  app.get('/info', { schema: schemas.getInfo }, getSystemInfo);
  app.get('/stats', { schema: schemas.getStats }, getSystemStats);
}
