import { FastifyInstance } from 'fastify';
import {
  getProfile,
  updateProfile,
  listUsers,
  updateUser,
  deleteUser,
} from './controller.js';
import {
  schemas,
  UpdateProfileInput,
  UpdateUserInput,
  UserQueryParams,
} from './schema.js';

export async function userRoutes(app: FastifyInstance) {
  // Add authentication to all routes
  app.addHook('onRequest', app.authenticate);

  app.get('/profile', { schema: schemas.getProfile }, getProfile);

  app.put<{
    Body: UpdateProfileInput;
  }>('/profile', { schema: schemas.updateProfile }, updateProfile);

  app.get<{
    Querystring: UserQueryParams;
  }>('/', { schema: schemas.listUsers }, listUsers);

  app.put<{
    Params: { id: string };
    Body: UpdateUserInput;
  }>('/:id', { schema: schemas.updateUser }, updateUser);

  app.delete<{
    Params: { id: string };
  }>('/:id', { schema: schemas.deleteUser }, deleteUser);
}
