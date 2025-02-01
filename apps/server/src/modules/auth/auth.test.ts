import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestApp, cleanupDatabase } from '@/test/setup.js';
import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db.js';
import { users } from '@/config/schema.js';

describe('Auth API', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await setupTestApp();
    await cleanupDatabase();
  });

  describe('Register', () => {
    it('should register a new user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('user');
      expect(body.user).toHaveProperty('email', 'test@example.com');
      expect(body.user).toHaveProperty('role', 'user');
      expect(body).toHaveProperty('token');
    });

    it('should prevent duplicate email registration', async () => {
      // First registration
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        },
      });

      // Second registration attempt
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'different123',
          name: 'Another User',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('code', 'EMAIL_EXISTS');
    });
  });

  describe('Login', () => {
    beforeEach(async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      await db.insert(users).values({
        email: 'test@example.com',
        passwordHash,
        name: 'Test User',
        role: 'user',
      });
    });

    it('should login with correct credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('user');
      expect(body.user).toHaveProperty('email', 'test@example.com');
      expect(body).toHaveProperty('token');
    });

    it('should reject invalid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('code', 'INVALID_CREDENTIALS');
    });
  });
});
