import { eq, and } from 'drizzle-orm';
import { Inject, Service } from 'typedi';

import { getDatabase } from '../db/connection.js';
import { pushRules } from '../db/schema/index.js';
import { OBJECT_TYPE } from '../models/constant/type.js';
import { generateTypeId } from '../utils/id.js';
import { logger } from '../utils/logger.js';

import { ChannelFactory } from './channels/channel.factory.js';

import type { CreatePushRuleDto, PushRuleDto, UpdatePushRuleDto } from '@aimo/dto';

@Service()
export class PushRuleService {
  @Inject()
  private channelFactory!: ChannelFactory;

  constructor() {}

  /**
   * Create a new push rule for a user
   */
  async create(uid: string, data: CreatePushRuleDto): Promise<PushRuleDto> {
    try {
      if (!data.name || data.name.trim().length === 0) {
        throw new Error('Push rule name cannot be empty');
      }

      if (data.pushTime === undefined || data.pushTime < 0 || data.pushTime > 23) {
        throw new Error('Push time must be between 0 and 23');
      }

      if (!data.contentType || !['daily_pick', 'daily_memos'].includes(data.contentType)) {
        throw new Error('Content type must be daily_pick or daily_memos');
      }

      if (!data.channels || data.channels.length === 0) {
        throw new Error('At least one channel must be configured');
      }

      const db = getDatabase();
      const id = generateTypeId(OBJECT_TYPE.PUSH_RULE);

      await db.insert(pushRules).values({
        id,
        uid,
        name: data.name.trim(),
        pushTime: data.pushTime,
        contentType: data.contentType,
        channels: JSON.stringify(data.channels),
        enabled: 1,
      });

      // Fetch the created rule to get auto-generated timestamps
      const result = await db.select().from(pushRules).where(eq(pushRules.id, id)).limit(1);

      return this.toDto(result[0]);
    } catch (error) {
      logger.error('Failed to create push rule:', error);
      throw error;
    }
  }

  /**
   * Get all push rules for a user
   */
  async findByUid(uid: string): Promise<PushRuleDto[]> {
    try {
      const db = getDatabase();
      const results = await db.select().from(pushRules).where(eq(pushRules.uid, uid));

      return results.map((record) => this.toDto(record));
    } catch (error) {
      logger.error('Failed to get push rules:', error);
      throw error;
    }
  }

  /**
   * Get a push rule by ID
   */
  async findById(id: string, uid: string): Promise<PushRuleDto | null> {
    try {
      const db = getDatabase();
      const results = await db
        .select()
        .from(pushRules)
        .where(and(eq(pushRules.id, id), eq(pushRules.uid, uid)))
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      return this.toDto(results[0]);
    } catch (error) {
      logger.error('Failed to get push rule:', error);
      throw error;
    }
  }

  /**
   * Update a push rule
   */
  async update(id: string, uid: string, data: UpdatePushRuleDto): Promise<PushRuleDto | null> {
    try {
      const db = getDatabase();

      // Get existing rule
      const existing = await db
        .select()
        .from(pushRules)
        .where(and(eq(pushRules.id, id), eq(pushRules.uid, uid)))
        .limit(1);

      if (existing.length === 0) {
        return null;
      }

      const rule = existing[0];

      // Build update object with only changed fields
      const updates: any = {};
      if (data.name !== undefined) updates.name = data.name.trim();
      if (data.pushTime !== undefined) updates.pushTime = data.pushTime;
      if (data.contentType !== undefined) updates.contentType = data.contentType;
      if (data.channels !== undefined) updates.channels = JSON.stringify(data.channels);
      if (data.enabled !== undefined) updates.enabled = data.enabled ? 1 : 0;

      // Update the rule
      await db.update(pushRules).set(updates).where(eq(pushRules.id, id));

      // Fetch the updated rule
      const result = await db.select().from(pushRules).where(eq(pushRules.id, id)).limit(1);

      return this.toDto(result[0]);
    } catch (error) {
      logger.error('Failed to update push rule:', error);
      throw error;
    }
  }

  /**
   * Delete a push rule
   */
  async delete(id: string, uid: string): Promise<boolean> {
    try {
      const db = getDatabase();

      // Check if rule exists
      const existing = await db
        .select()
        .from(pushRules)
        .where(and(eq(pushRules.id, id), eq(pushRules.uid, uid)))
        .limit(1);

      if (existing.length === 0) {
        return false;
      }

      // Delete the rule
      await db.delete(pushRules).where(eq(pushRules.id, id));

      return true;
    } catch (error) {
      logger.error('Failed to delete push rule:', error);
      throw error;
    }
  }

  /**
   * Get all enabled push rules
   */
  async findAllEnabled(): Promise<PushRuleDto[]> {
    try {
      const db = getDatabase();
      const results = await db.select().from(pushRules).where(eq(pushRules.enabled, 1));

      return results.map((record) => this.toDto(record));
    } catch (error) {
      logger.error('Failed to get enabled push rules:', error);
      throw error;
    }
  }

  /**
   * Test push notification for a channel
   */
  async testPush(ruleId: string, uid: string): Promise<void> {
    const rule = await this.findById(ruleId, uid);
    if (!rule) {
      throw new Error('Push rule not found');
    }

    if (!rule.channels || rule.channels.length === 0) {
      throw new Error('No channels configured');
    }

    // Send test message through each channel
    for (const channelConfig of rule.channels) {
      try {
        const channel = this.channelFactory.getChannel(channelConfig);
        await channel.send({
          title: '测试推送',
          msg: '这是一条测试消息，如果你能看到这条消息，说明推送配置正确！',
        });
        logger.info(`Test push sent for rule ${ruleId} via channel ${channelConfig.type}`);
      } catch (error) {
        logger.error(
          `Failed to send test push for rule ${ruleId} via channel ${channelConfig.type}:`,
          error
        );
        throw error;
      }
    }
  }

  /**
   * Convert database record to DTO
   */
  private toDto(record: typeof pushRules.$inferSelect): PushRuleDto {
    let channels: any[] = [];
    try {
      channels = record.channels ? JSON.parse(record.channels) : [];
    } catch {
      channels = [];
    }

    return {
      id: record.id,
      uid: record.uid,
      name: record.name,
      pushTime: record.pushTime,
      contentType: record.contentType as 'daily_pick' | 'daily_memos',
      channels: channels,
      enabled: record.enabled === 1,
      createdAt: record.createdAt.getTime(),
      updatedAt: record.updatedAt.getTime(),
    };
  }
}
