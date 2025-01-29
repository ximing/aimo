import { join } from "path";
import { fileURLToPath } from "url";
import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { sql } from "drizzle-orm";

import { authRoutes } from "./modules/auth/routes.js";
import { noteRoutes } from "./modules/note/routes.js";
import { userRoutes } from "./modules/user/routes.js";
import { systemRoutes } from "./modules/system/routes.js";
import { env } from "./config/env.js";
import { db } from "./lib/db.js";
import { redisClient } from "./lib/redis.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

async function checkDependencies() {
  try {
    // 检查数据库连接
    await db.execute(sql`SELECT 1`);
    console.log("✅ Database connection successful");

    // 检查 Redis 连接
    await redisClient.ping();
    console.log("✅ Redis connection successful");

    return true;
  } catch (error) {
    console.error("❌ Dependency check failed:", error);
    return false;
  }
}

async function runMigrations() {
  try {
    console.log("Running database migrations...");
    await migrate(db, {
      migrationsFolder: join(__dirname, "db/migrations"),
    });
    console.log("✅ Database migrations completed");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

export async function buildApp() {
  // 检查依赖
  const dependenciesOk = await checkDependencies();
  if (!dependenciesOk) {
    throw new Error("Dependencies check failed");
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

  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  });

  // Add authentication decorator
  app.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.status(401).send({
          message: "Unauthorized",
          code: "UNAUTHORIZED",
        });
      }
    },
  );

  // Register routes
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(noteRoutes, { prefix: "/api/notes" });
  await app.register(userRoutes, { prefix: "/api/users" });
  await app.register(systemRoutes, { prefix: "/api/system" });

  // Health check
  app.get("/health", async () => {
    return { status: "ok" };
  });

  return app;
}

// 如果不是测试环境才自动启动
if (process.env.NODE_ENV !== "test") {
  async function start() {
    try {
      const app = await buildApp();
      await app.listen({ port: env.PORT, host: "0.0.0.0" });
      console.log(`✅ Server is running on port ${env.PORT}`);
    } catch (err) {
      console.error("❌ Server startup failed:", err);
      process.exit(1);
    }
  }

  start();
}
