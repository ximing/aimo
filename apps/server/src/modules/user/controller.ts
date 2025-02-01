import { FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db.js';
import { users } from '@/config/schema.js';
import {
  UpdateProfileInput,
  UpdateUserInput,
  UserResponse,
  UserQueryParams,
} from './schema.js';

export async function getProfile(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<UserResponse> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, request.user.id),
    columns: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      isActive: true,
      hashedPassword: false,
    },
  });

  if (!user) {
    throw reply.status(404).send({
      message: 'User not found',
      code: 'USER_NOT_FOUND',
    });
  }

  return {
    ...user,
    name: user.name || undefined,
    createdAt: user.createdAt.getTime(),
  } as UserResponse;
}

export async function updateProfile(
  request: FastifyRequest<{
    Body: UpdateProfileInput;
  }>,
  reply: FastifyReply
): Promise<UserResponse> {
  const { name, password } = request.body;
  const userId = request.user.id;

  const updateData: any = {};
  if (name) {
    updateData.name = name;
  }
  if (password) {
    updateData.hashedPassword = await bcrypt.hash(password, 10);
  }

  const [user] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
      isActive: users.isActive,
    });

  return {
    ...user,
    name: user.name || undefined,
    createdAt: user.createdAt.getTime(),
  } as UserResponse;
}

// Admin only functions
export async function listUsers(
  request: FastifyRequest<{
    Querystring: UserQueryParams;
  }>,
  reply: FastifyReply
): Promise<UserResponse[]> {
  if (request.user.role !== 'admin') {
    throw reply.status(403).send({
      message: 'Forbidden',
      code: 'FORBIDDEN',
    });
  }

  const { limit = 20, offset = 0 } = request.query;

  const userList = await db.query.users.findMany({
    columns: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      isActive: true,
      hashedPassword: false,
    },
    limit,
    offset,
    orderBy: (users, { desc }) => [desc(users.createdAt)],
  });

  return userList.map(user => ({
    ...user,
    name: user.name || undefined,
    createdAt: user.createdAt.getTime(),
  } as UserResponse));
}

export async function updateUser(
  request: FastifyRequest<{
    Params: { id: string };
    Body: UpdateUserInput;
  }>,
  reply: FastifyReply
): Promise<UserResponse> {
  if (request.user.role !== 'admin') {
    throw reply.status(403).send({
      message: 'Forbidden',
      code: 'FORBIDDEN',
    });
  }

  const { id } = request.params;
  const { name, role, isActive } = request.body;

  // Prevent self-modification of role
  if (parseInt(id) === request.user.id && role && role !== request.user.role) {
    throw reply.status(400).send({
      message: 'Cannot modify own role',
      code: 'INVALID_OPERATION',
    });
  }

  const [user] = await db
    .update(users)
    .set({
      name,
      role: role as 'admin' | 'user',
      isActive,
    })
    .where(eq(users.id, parseInt(id)))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
      isActive: users.isActive,
    });

  if (!user) {
    throw reply.status(404).send({
      message: 'User not found',
      code: 'USER_NOT_FOUND',
    });
  }

  return {
    ...user,
    name: user.name || undefined,
    createdAt: user.createdAt.getTime(),
  } as UserResponse;
}

export async function deleteUser(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
) {
  if (request.user.role !== 'admin') {
    throw reply.status(403).send({
      message: 'Forbidden',
      code: 'FORBIDDEN',
    });
  }

  const { id } = request.params;

  // Prevent self-deletion
  if (parseInt(id) === request.user.id) {
    throw reply.status(400).send({
      message: 'Cannot delete own account',
      code: 'INVALID_OPERATION',
    });
  }

  const [deletedUser] = await db
    .delete(users)
    .where(eq(users.id, parseInt(id)))
    .returning();

  if (!deletedUser) {
    throw reply.status(404).send({
      message: 'User not found',
      code: 'USER_NOT_FOUND',
    });
  }

  return { success: true };
}
