/**
 * User Token Service
 * Business logic for personal API token management
 */

import { Service } from 'typedi';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { getDatabase } from '../db/connection.js';
import { userTokens } from '../db/schema/user-tokens.js';
import { ErrorCode, ErrorMessage } from '../constants/error-codes.js';
import { UserTokenResponseDto } from '@aimo/dto';

@Service()
export class UserTokenService {
  private db = getDatabase();

  async createToken(userId: string, name: string, expiresAt: number): Promise<{ token: string; id: string }> {
    const token = `aimo_tk_${crypto.randomBytes(32).toString('hex')}`;
    const tokenKey = crypto.createHash('sha256').update(token).digest('hex');
    const tokenHash = await bcrypt.hash(token, 10);
    const id = crypto.randomUUID();

    await this.db.insert(userTokens).values({
      id,
      userId,
      name,
      tokenKey,
      tokenHash,
      expiresAt: expiresAt > 0 ? new Date(expiresAt) : null,
    });

    return { token, id };
  }

  async getTokenByKey(tokenKey: string): Promise<typeof userTokens.$inferSelect | null> {
    const result = await this.db
      .select()
      .from(userTokens)
      .where(eq(userTokens.tokenKey, tokenKey))
      .limit(1);

    if (!result[0]) {
      return null;
    }

    const token = result[0];

    // Check if revoked
    if (token.revokedAt) {
      throw new Error(ErrorMessage[ErrorCode.TOKEN_REVOKED]);
    }

    // Check if expired
    if (token.expiresAt && token.expiresAt.getTime() < Date.now()) {
      throw new Error(ErrorMessage[ErrorCode.TOKEN_EXPIRED]);
    }

    return token;
  }

  async getTokensByUserId(userId: string): Promise<UserTokenResponseDto[]> {
    const results = await this.db
      .select()
      .from(userTokens)
      .where(eq(userTokens.userId, userId));

    return results.map((t) => ({
      id: t.id,
      name: t.name,
      expiresAt: t.expiresAt?.getTime() ?? 0,
      createdAt: t.createdAt.getTime(),
      revokedAt: t.revokedAt?.getTime() ?? 0,
      isExpired: !!t.expiresAt && t.expiresAt.getTime() < Date.now(),
      isActive: !t.revokedAt && (!t.expiresAt || t.expiresAt.getTime() >= Date.now()),
    }));
  }

  async revokeToken(id: string, userId: string): Promise<void> {
    const result = await this.db
      .update(userTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(userTokens.id, id), eq(userTokens.userId, userId)));

    if (!result.rowCount) {
      throw new Error(ErrorMessage[ErrorCode.TOKEN_NOT_FOUND]);
    }
  }
}
