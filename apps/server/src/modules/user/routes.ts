import { FastifyInstance } from 'fastify';
import {
  getProfile,
  updateProfile,
  listUsers,
  updateUser,
  deleteUser,
} from './controller.js';
import {
  updateProfileSchema,
  updateUserSchema,
  UpdateProfileInput,
  UpdateUserInput,
} from './schema.js';

export async function userRoutes(app: FastifyInstance) {
  // Add authentication to all routes
  app.addHook('onRequest', app.authenticate);

  app.get(
    '/profile',
    {},
    getProfile
  );

  app.put<{
    Body: UpdateProfileInput;
  }>(
    '/profile',
    { schema: updateProfileSchema },
    updateProfile
  );

  app.get<{
    Querystring: {
      limit?: number;
      offset?: number;
    };
  }>(
    '/',
    {},
    listUsers
  );

  app.put<{
    Params: { id: string };
    Body: UpdateUserInput;
  }>(
    '/:id',
    { schema: updateUserSchema },
    updateUser
  );

  app.delete<{
    Params: { id: string };
  }>(
    '/:id',
    {},
    deleteUser
  );
}
