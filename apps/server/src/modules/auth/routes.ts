import { FastifyInstance } from 'fastify';
import {
  register,
  login,
  githubAuth,
  googleAuth,
  getProviders,
  getProfile,
} from './controller.js';
import { schemas, RegisterInput, LoginInput } from './schema.js';

export async function authRoutes(app: FastifyInstance) {
  app.post<{
    Body: RegisterInput;
  }>('/register', { schema: schemas.register }, register);

  app.post<{
    Body: LoginInput;
  }>('/login', { schema: schemas.login }, login);

  app.get<{
    Querystring: {
      code?: string;
    };
  }>('/github', {}, githubAuth);

  app.get<{
    Querystring: {
      code?: string;
    };
  }>('/github/callback', {}, githubAuth);

  app.get<{
    Querystring: {
      code?: string;
    };
  }>('/google', {}, googleAuth);

  app.get<{
    Querystring: {
      code?: string;
    };
  }>('/google/callback', {}, googleAuth);

  app.get('/providers', { schema: schemas.getProviders }, getProviders);

  app.get(
    '/profile',
    {
      schema: schemas.getProfile,
      preValidation: [app.authenticate],
    },
    getProfile
  );
}
