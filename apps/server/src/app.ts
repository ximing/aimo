import { join } from 'path';
import { fileURLToPath } from 'url';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import jwt, { FastifyJWT } from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql, eq } from 'drizzle-orm';
import { initDatabase } from './lib/init-db.js';

import { authRoutes } from './modules/auth/routes.js';
import { noteRoutes } from './modules/note/routes.js';
import { userRoutes } from './modules/user/routes.js';
import { systemRoutes } from './modules/system/routes.js';
import { env } from './config/env.js';
import { db } from './lib/db.js';
import { redisClient } from './lib/redis.js';
import { users } from './config/schema.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Add this type declaration
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: number; email: string; role: string }; // payload type is used for signing and verifying
    user: {
      id: number;
      email: string;
      role: string;
      isActive: boolean;
      name?: string;
    };
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    user: FastifyJWT['user'];
    routerPath?: string; // 添加 routerPath 定义
  }
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

async function checkDependencies() {
  try {
    // 检查数据库连接
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection successful');

    // 检查 Redis 连接
    await redisClient.ping();
    console.log('✅ Redis connection successful');

    return true;
  } catch (error) {
    console.error('❌ Dependency check failed:', error);
    return false;
  }
}

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    await migrate(db, {
      migrationsFolder: join(__dirname, '../migrations'),
    });
    console.log('✅ Database migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

export async function buildApp() {
  // 检查依赖
  const dependenciesOk = await checkDependencies();
  if (!dependenciesOk) {
    throw new Error('Dependencies check failed');
  }

  // 初始化数据库
  const dbInitOk = await initDatabase();
  if (!dbInitOk) {
    throw new Error('Database initialization failed');
  }

  // 运行数据库迁移
  await runMigrations();

  const app = Fastify({
    logger: true,
  });

  // Register plugins
  await app.register(cors, {
    origin: true,
  });

  // 如果是本地存储，注册静态文件服务
  if (env.STORAGE_TYPE === 'local') {
    const uploadDir = join(
      process.cwd(),
      env.STORAGE_LOCAL_PATH,
      env.STORAGE_PATH_PREFIX || ''
    );
    await app.register(fastifyStatic, {
      root: uploadDir,
      prefix: `/${env.STORAGE_PATH_PREFIX}`,
      decorateReply: false, // 避免与其他插件冲突
    });
  }
  await app.register(fastifyStatic, {
    root: join(__dirname, '../public'),
    prefix: '/public',
    decorateReply: false, // 避免与其他插件冲突
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  });

  app.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const token = await request.jwtVerify<{ id: number }>();

        // Fetch user from database
        const user = await db.query.users.findFirst({
          where: eq(users.id, token.id),
          columns: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            // add other needed fields
          },
        });

        if (!user) {
          throw new Error('User not found');
        }

        if (!user.isActive) {
          throw new Error('User is inactive');
        }

        // Attach user to request
        request.user = user;
      } catch (err) {
        reply.status(401).send({
          message: 'Unauthorized',
          code: 'UNAUTHORIZED',
        });
      }
    }
  );

  // Register routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(noteRoutes, { prefix: '/api/notes' });
  await app.register(userRoutes, { prefix: '/api/users' });
  await app.register(systemRoutes, { prefix: '/api/system' });
  // Serve static files in production
  if (env.NODE_ENV === 'production') {
    app.get('/*', async (request, reply) => {
      return reply.sendFile(join(__dirname, '../public', 'index.html'));
    });
  }

  // Health check
  app.get('/health', async () => {
    return { status: 'ok' };
  });

  return app;
}

// 如果不是测试环境才自动启动
if (process.env.NODE_ENV !== 'test') {
  async function start() {
    try {
      const app = await buildApp();
      await app.listen({ port: env.PORT, host: '0.0.0.0' });
      console.log(`✅ Server is running on port ${env.PORT}`);
    } catch (err) {
      console.error('❌ Server startup failed:', err);
      process.exit(1);
    }
  }

  start();
}
