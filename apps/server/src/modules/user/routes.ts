import { FastifyInstance } from 'fastify';
import {
  getProfile,
  updateProfile,
  listUsers,
  updateUser,
  deleteUser,
} from './controller.js';
import { updateProfileSchema, updateUserSchema } from './schema.js';

export async function userRoutes(app: FastifyInstance) {
  // Add authentication check middleware
  app.addHook('preHandler', app.authenticate);

  // Regular user routes
  app.get('/profile', getProfile);
  app.put('/profile', { schema: updateProfileSchema }, updateProfile);

  // Admin only routes
  app.get('/', listUsers);
  app.put('/:id', { schema: updateUserSchema }, updateUser);
  app.delete('/:id', deleteUser);
}
