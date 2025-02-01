import { FastifyInstance } from 'fastify';
import { register, login, githubAuth, googleAuth } from './controller.js';
import { registerSchema, loginSchema } from './schema.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', { schema: registerSchema }, register);
  app.post('/login', { schema: loginSchema }, login);
  app.get('/github', githubAuth);
  app.get('/github/callback', githubAuth);
  app.get('/google', googleAuth);
  app.get('/google/callback', googleAuth);
}
