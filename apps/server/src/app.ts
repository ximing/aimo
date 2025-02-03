import { join } from 'path';
import { fileURLToPath } from 'url';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import jwt, { FastifyJWT } from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import bcrypt from 'bcrypt';
import postgres from 'postgres';

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
import { config } from './config/index.js';
import { backupService } from './lib/backup.js';
import { createDbConnection, getDb } from './lib/db.js';

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
    // 检查数据库是否存在
    const dbName = config.databaseUrl.split('/').pop()?.split('?')[0];
    if (!dbName) {
      throw new Error('Invalid database URL');
    }

    // 先连接到 postgres 数据库
    const pgUrl = config.databaseUrl.replace(`/${dbName}`, '/postgres');
    console.log('pgUrl', pgUrl);
    const pgDb = postgres(pgUrl);
    console.log('pgUrl connect success');
    try {
      // 检查数据库是否存在
      const dbExists = await pgDb`
        SELECT 1 FROM pg_database WHERE datname = ${dbName}::text
      `;
      console.log('dbExists', dbExists);
      if (!dbExists.length) {
        console.log(`Creating database ${dbName}...`);
        // 使用 sql 标识符来安全地引用数据库名
        await pgDb`CREATE DATABASE ${pgDb(dbName)}`;
        console.log('✅ Database created successfully');
      }
    } finally {
      await pgDb.end();
    }

    // 创建实际的数据库连接
    createDbConnection();

    // 检查数据库连接
    const db = getDb();
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
    // 检查数据库是否存在
    const dbName = config.databaseUrl.split('/').pop()?.split('?')[0];
    if (!dbName) {
      throw new Error('Invalid database URL');
    }

    try {
      const dbExists = await db.execute(
        sql`SELECT 1 FROM pg_database WHERE datname = ${dbName}`
      );
      if (!dbExists.length) {
        console.log(`Creating database ${dbName}...`);
        // 创建数据库需要连接到 postgres 数据库
        const pgUrl = config.databaseUrl.replace(`/${dbName}`, '/postgres');
        const pgDb = postgres(pgUrl);
        await pgDb`CREATE DATABASE "${dbName}"`;
        await pgDb.end();
        console.log('✅ Database created successfully');
      }
    } catch (error) {
      console.error('❌ Failed to check/create database:', error);
      throw error;
    }
    console.log('Running database migrations...');
    await migrate(db, {
      migrationsFolder: join(__dirname, '../migrations'),
    });
    console.log('✅ Database migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
  // 检查是否存在管理员账户
  const adminUser = await db
    .select()
    .from(users)
    .where(eq(users.role, 'admin'))
    .limit(1);

  if (adminUser.length === 0 && config.adminEmail && config.adminPassword) {
    console.log('Creating admin user...');

    // 创建管理员账户
    const hashedPassword = await bcrypt.hash(config.adminPassword, 10);

    await db.insert(users).values({
      email: config.adminEmail,
      hashedPassword,
      name: config.adminName || 'Administrator',
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('Admin user created successfully');
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

  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 20 * 1024 * 1024, // 20MB
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

  // Health check (放在 API 路由之前)
  app.get('/health', async () => {
    return { status: 'ok' };
  });

  // Register API routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(noteRoutes, { prefix: '/api/notes' });
  await app.register(userRoutes, { prefix: '/api/users' });
  await app.register(systemRoutes, { prefix: '/api/system' });

  // 生产环境下的静态文件服务配置 (放在最后)
  if (env.NODE_ENV === 'production') {
    await app.register(async function (fastify) {
      // 先注册静态文件服务
      await fastify.register(fastifyStatic, {
        root: join(__dirname, '../public'),
        prefix: '/',
      });

      // 所有未匹配的路由都返回 index.html
      fastify.setNotFoundHandler(async (request, reply) => {
        return reply.sendFile('index.html');
      });
    });
  }
  // 初始化备份服务
  await backupService.init();
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
