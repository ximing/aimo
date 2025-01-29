import { FastifyInstance } from "fastify";
import { db } from "@/lib/db.js";
import {
  users,
  systemSettings,
  notes,
  tags,
  noteTags,
} from "@/config/schema.js";
import { buildApp } from "@/app.js";

let app: FastifyInstance;

export async function setupTestApp() {
  app = await buildApp();
  return app;
}

export async function cleanupDatabase() {
  // 按照外键依赖顺序清理表
  await db.delete(noteTags);
  await db.delete(notes);
  await db.delete(tags);
  await db.delete(users);
  await db.delete(systemSettings);
}

export async function createTestUser(
  email: string = "test@example.com",
  role: "user" | "admin" = "user",
) {
  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash: "test-hash",
      name: "Test User",
      role,
      isActive: true,
    })
    .returning();

  const token = await app.jwt.sign({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return { user, token };
}

export async function getAuthToken(email: string, role: string = "user") {
  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash: "test-hash", // 测试不需要真实密码
      role,
      name: "Test User",
    })
    .returning();

  return app.jwt.sign({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}
