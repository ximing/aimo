import { FastifyInstance } from 'fastify';
import {
  register,
  login,
  githubAuth,
  googleAuth,
  getProviders,
} from './controller.js';
import {
  registerSchema,
  loginSchema,
  RegisterInput,
  LoginInput,
} from './schema.js';
import { withUser } from '@/utils/route-wrapper.js';

export async function authRoutes(app: FastifyInstance) {
  app.post<{
    Body: RegisterInput;
  }>(
    '/register',
    {
      schema: registerSchema,
    },
    register
  );

  app.post<{
    Body: LoginInput;
  }>(
    '/login',
    {
      schema: loginSchema,
    },
    login
  );

  app.get<{
    Querystring: {
      code?: string;
    };
  }>(
    '/github',
    {},
    githubAuth
  );

  app.get<{
    Querystring: {
      code?: string;
    };
  }>(
    '/github/callback',
    {},
    githubAuth
  );

  app.get<{
    Querystring: {
      code?: string;
    };
  }>(
    '/google',
    {},
    googleAuth
  );

  app.get<{
    Querystring: {
      code?: string;
    };
  }>(
    '/google/callback',
    {},
    googleAuth
  );

  app.get(
    '/providers',
    {},
    getProviders
  );

  app.get(
    '/profile',
    { preValidation: [app.authenticate] },
    withUser<{
      Body: never;
    }>(getProfile)
  );
}
