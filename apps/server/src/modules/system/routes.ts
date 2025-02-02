import { FastifyInstance } from 'fastify';
import {
  getSystemInfo,
  getSystemStats,
  createBackup,
  listBackups,
  importNotes,
} from './controller.js';
import { schemas } from './schema.js';

export async function systemRoutes(app: FastifyInstance) {
  // 添加认证中间件
  app.addHook('onRequest', app.authenticate);

  app.get('/info', { schema: schemas.getInfo }, getSystemInfo);
  app.get('/stats', { schema: schemas.getStats }, getSystemStats);
  app.post('/backups', createBackup);
  app.get('/backups', listBackups);
  app.post('/import', importNotes);
}
