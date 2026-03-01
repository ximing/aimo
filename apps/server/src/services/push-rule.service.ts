import { Inject, Service } from 'typedi';

import { OBJECT_TYPE } from '../models/constant/type.js';
import { LanceDbService as LanceDatabaseService } from '../sources/lancedb.js';
import { generateTypeId } from '../utils/id.js';
import { logger } from '../utils/logger.js';

import { ChannelFactory } from './channels/channel.factory.js';

import type { PushRuleRecord } from '../models/db/schema.js';
import type { CreatePushRuleDto, PushRuleDto, UpdatePushRuleDto } from '@aimo/dto';

@Service()
export class PushRuleService {
  @Inject()
  private channelFactory!: ChannelFactory;

  constructor(private lanceDatabase: LanceDatabaseService) {}

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

      const id = generateTypeId(OBJECT_TYPE.PUSH_RULE);
      const now = Date.now();

      const rule: PushRuleRecord = {
        id,
        uid,
        name: data.name.trim(),
        pushTime: data.pushTime,
        contentType: data.contentType,
        channels: JSON.stringify(data.channels),
        enabled: 1,
        createdAt: now,
        updatedAt: now,
      };

      const table = await this.lanceDatabase.openTable('push_rules');
      await table.add([rule as unknown as Record<string, unknown>]);

      return this.toDto(rule);
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
      const table = await this.lanceDatabase.openTable('push_rules');

      const results = await table.query().where(`uid = '${uid}'`).toArray();

      return results.map((record) => this.toDto(record as PushRuleRecord));
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
      const table = await this.lanceDatabase.openTable('push_rules');

      const results = await table
        .query()
        .where(`id = '${id}' AND uid = '${uid}'`)
        .limit(1)
        .toArray();

      if (results.length === 0) {
        return null;
      }

      return this.toDto(results[0] as PushRuleRecord);
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
      const table = await this.lanceDatabase.openTable('push_rules');

      // Get existing rule
      const rule = await this.findById(id, uid);
      if (!rule) {
        return null;
      }

      // Build updated record
      const now = Date.now();
      const updatedRecord: PushRuleRecord = {
        id: rule.id,
        uid: rule.uid,
        name: data.name === undefined ? rule.name : data.name.trim(),
        pushTime: data.pushTime === undefined ? rule.pushTime : data.pushTime,
        contentType: data.contentType === undefined ? rule.contentType : data.contentType,
        channels:
          data.channels === undefined
            ? JSON.stringify(rule.channels)
            : JSON.stringify(data.channels),
        enabled: data.enabled === undefined ? (rule.enabled ? 1 : 0) : (data.enabled ? 1 : 0),
        createdAt: rule.createdAt,
        updatedAt: now,
      };

      // Update in database by deleting old and adding new
      await table.delete(`id = '${id}'`).catch(() => {
        // Ignore error if record doesn't exist
      });

      await table.add([updatedRecord as unknown as Record<string, unknown>]);

      return this.toDto(updatedRecord);
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
      const table = await this.lanceDatabase.openTable('push_rules');

      // Check if rule exists
      const rule = await this.findById(id, uid);
      if (!rule) {
        return false;
      }

      // Delete the rule
      await table.delete(`id = '${id}'`);

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
      const table = await this.lanceDatabase.openTable('push_rules');

      const results = await table.query().where('enabled = 1').toArray();

      return results.map((record) => this.toDto(record as PushRuleRecord));
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
  private toDto(record: PushRuleRecord): PushRuleDto {
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
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
