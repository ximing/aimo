import { FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db.js';
import { users } from '@/config/schema.js';
import { UpdateUserInput, UserResponse, UserQueryParams } from './schema.js';
import { getStorageService } from '@/lib/storage.js';
import path from 'path';
import { MultipartValue } from '@fastify/multipart';
import { nanoid } from 'nanoid';

interface MultipartFields {
  name?: MultipartValue<string>;
  nickname?: MultipartValue<string>;
  password?: MultipartValue<string>;
}

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
  request: FastifyRequest,
  reply: FastifyReply
): Promise<UserResponse> {
  const userId = request.user.id;
  const updateData: any = {};

  try {
    const parts = request.parts();
    for await (const part of parts) {
      if (part.type === 'file') {
        if (part.fieldname === 'avatar') {
          const storage = getStorageService();
          const filename = `avatar-${userId}-${nanoid(64)}${path.extname(part.filename)}`;
          const { path: avatarPath } = await storage.saveFile(part, filename);
          updateData.avatar = avatarPath;
        }
      } else {
        updateData[part.fieldname] = part.value;
      }
    }
    if (updateData.password) {
      const password = updateData.password;
      if (password.length < 6) {
        throw reply.status(400).send({
          message: 'Password must be at least 6 characters',
          code: 'INVALID_PASSWORD',
        });
      }
      updateData.hashedPassword = await bcrypt.hash(password, 10);
    }

    // Update user information
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        nickname: users.nickname,
        avatar: users.avatar,
        role: users.role,
        createdAt: users.createdAt,
        isActive: users.isActive,
      });

    return {
      ...user,
      createdAt: user.createdAt.getTime(),
    } as UserResponse;
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }
    console.error('Update profile failed:', error);
    throw reply.status(500).send({
      message: 'Failed to update profile',
      code: 'UPDATE_FAILED',
    });
  }
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

  return userList.map(
    (user) =>
      ({
        ...user,
        name: user.name || undefined,
        createdAt: user.createdAt.getTime(),
      }) as UserResponse
  );
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
      role,
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
