import { FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { db } from '@/lib/db.js';
import { users, systemSettings } from '@/config/schema.js';

const initSchema = {
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
  }),
};

type InitInput = z.infer<typeof initSchema.body>;

export async function initSystem(
  request: FastifyRequest<{ Body: InitInput }>,
  reply: FastifyReply
) {
  // Check if system is already initialized
  const initialized = await db.query.systemSettings.findFirst({
    where: eq(systemSettings.key, 'initialized'),
  });

  if (initialized) {
    throw reply.status(400).send({
      message: 'System is already initialized',
      code: 'SYSTEM_INITIALIZED',
    });
  }

  const { email, password, name } = request.body;

  // Check if any user exists
  const existingUser = await db.query.users.findFirst();
  if (existingUser) {
    throw reply.status(400).send({
      message: 'System is already initialized',
      code: 'SYSTEM_INITIALIZED',
    });
  }

  // Create admin user
  const passwordHash = await bcrypt.hash(password, 10);
  const [admin] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      name,
      role: 'admin',
    })
    .returning();

  // Mark system as initialized
  await db.insert(systemSettings).values({
    key: 'initialized',
    value: JSON.stringify({
      timestamp: new Date().toISOString(),
      adminEmail: email,
    }),
  });

  // Generate token
  const token = await reply.jwtSign(
    {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    },
    {
      expiresIn: '7d',
    }
  );

  return {
    user: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      createdAt: admin.createdAt,
    },
    token,
  };
}
