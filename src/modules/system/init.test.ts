import { describe, it, expect, beforeEach } from "vitest";
import { setupTestApp, cleanupDatabase } from "@/test/setup.js";
import type { FastifyInstance } from "fastify";

describe("System Init API", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await setupTestApp();
    await cleanupDatabase();
  });

  it("should initialize system with admin user", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/system/init",
      payload: {
        email: "admin@example.com",
        password: "admin123",
        name: "Admin User",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    expect(body).toHaveProperty("user");
    expect(body.user).toHaveProperty("email", "admin@example.com");
    expect(body.user).toHaveProperty("role", "admin");
    expect(body).toHaveProperty("token");
  });

  it("should prevent multiple initialization", async () => {
    // First init
    await app.inject({
      method: "POST",
      url: "/api/system/init",
      payload: {
        email: "admin@example.com",
        password: "admin123",
        name: "Admin User",
      },
    });

    // Second init attempt
    const response = await app.inject({
      method: "POST",
      url: "/api/system/init",
      payload: {
        email: "another@example.com",
        password: "password123",
        name: "Another Admin",
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty("code", "SYSTEM_INITIALIZED");
  });
});
