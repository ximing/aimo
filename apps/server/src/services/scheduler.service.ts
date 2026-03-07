import cron from 'node-cron';
import { Service, Inject } from 'typedi';

import { config } from '../config/config.js';
import { LanceDbService as LanceDatabaseService } from '../sources/lancedb.js';
import { logger } from '../utils/logger.js';

import { ChannelFactory } from './channels/channel.factory.js';
import { DailyContentGenerator } from './channels/daily-content.generator.js';
import { NotificationService } from './notification.service.js';
import { PushRuleService } from './push-rule.service.js';
import { SpacedRepetitionService } from './spaced-repetition.service.js';
import { getDatabase } from '../db/connection.js';
import { memos } from '../db/schema/memos.js';
import { eq, and } from 'drizzle-orm';

import type { PushRuleDto } from '@aimo/dto';

/**
 * 调度服务
 * 负责管理所有定时任务，包括数据库优化等周期性维护任务
 */
@Service()
export class SchedulerService {
  private tasks: cron.ScheduledTask[] = [];
  private isInitialized = false;

  constructor(
    private lanceDatabaseService: LanceDatabaseService,
    @Inject() private pushRuleService: PushRuleService,
    @Inject() private contentGenerator: DailyContentGenerator,
    @Inject() private channelFactory: ChannelFactory,
    @Inject() private spacedRepetitionService: SpacedRepetitionService,
    @Inject() private notificationService: NotificationService
  ) {}

  /**
   * 初始化所有定时任务
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('SchedulerService already initialized');
      return;
    }

    logger.info('Initializing scheduler service...');

    // 注册数据库优化任务
    this.registerDatabaseOptimizationTask();

    // 注册推送通知任务
    this.registerPushNotificationTask();

    // 注册间隔重复推送任务
    this.registerSpacedRepetitionPushTask();

    this.isInitialized = true;
    logger.info('Scheduler service initialized successfully');
  }

  /**
   * 注册数据库优化定时任务
   * 默认每天凌晨 2 点执行，清理旧版本并优化索引
   */
  private registerDatabaseOptimizationTask(): void {
    const cronExpression = config.scheduler?.dbOptimizationCron || '0 2 * * *'; // 默认每天凌晨 2 点

    const task = cron.schedule(
      cronExpression,
      async () => {
        try {
          logger.info('Starting scheduled LanceDB optimization...');
          const startTime = Date.now();

          await this.lanceDatabaseService.optimizeAllTables();

          const duration = Date.now() - startTime;
          logger.info(`Scheduled LanceDB optimization completed in ${duration}ms`);
        } catch (error) {
          logger.error('Error during scheduled LanceDB optimization:', error);
        }
      },
      {
        timezone: config.locale.timezone || 'Asia/Shanghai',
      }
    );

    this.tasks.push(task);
    logger.info(
      `Database optimization task scheduled: ${cronExpression} (${config.locale.timezone})`
    );
  }

  /**
   * 注册推送通知定时任务
   * 每小时执行一次，检查是否有需要推送的规则
   */
  private registerPushNotificationTask(): void {
    // Run every hour to check for pending pushes
    const task = cron.schedule(
      '0 * * * *',
      async () => {
        try {
          await this.processPushNotifications();
        } catch (error) {
          logger.error('Error processing push notifications:', error);
        }
      },
      {
        timezone: config.locale.timezone || 'Asia/Shanghai',
      }
    );

    this.tasks.push(task);
    logger.info('Push notification task scheduled: every hour');
  }

  /**
   * 处理推送通知
   * 检查当前时间匹配的推送规则，并发送通知
   */
  private async processPushNotifications(): Promise<void> {
    const now = new Date();
    const currentHour = now.getHours();

    // Get all push rules
    // Note: In a production system, we would need to get all rules and filter
    // For now, we need to query all users' rules - let's fetch enabled rules
    const allRules = await this.getAllEnabledRules();

    // Filter rules that match current hour and are enabled
    const matchingRules = allRules.filter((rule) => rule.pushTime === currentHour && rule.enabled);

    if (matchingRules.length === 0) {
      return;
    }

    logger.info(`Processing ${matchingRules.length} push rules for hour ${currentHour}`);

    for (const rule of matchingRules) {
      try {
        await this.sendPushForRule(rule);
      } catch (error) {
        logger.error(`Failed to send push for rule ${rule.id}:`, error);
        // Skip failed pushes and continue
      }
    }
  }

  /**
   * 获取所有已启用的推送规则
   */
  private async getAllEnabledRules(): Promise<PushRuleDto[]> {
    return this.pushRuleService.findAllEnabled();
  }

  /**
   * 为单个规则发送推送
   */
  private async sendPushForRule(rule: PushRuleDto): Promise<void> {
    // Get channels and send
    for (const channelConfig of rule.channels) {
      try {
        const content = await this.contentGenerator.generate(rule.contentType, rule.uid);

        // If channel is text type and content is HTML, convert to plain text
        let message = content.msg;
        if (channelConfig.msgType === 'text' && content.isHtml) {
          message = this.stripHtml(content.msg);
        }

        const channel = this.channelFactory.getChannel(channelConfig);
        await channel.send({
          title: content.title,
          msg: message,
        });
        logger.info(`Push sent for rule ${rule.id} via channel ${channelConfig.type}`);
      } catch (error) {
        logger.error(
          `Failed to send push for rule ${rule.id} via channel ${channelConfig.type}:`,
          error
        );
        // Continue with other channels
      }
    }
  }

  /**
   * 注册间隔重复推送任务（每日 08:00）
   */
  private registerSpacedRepetitionPushTask(): void {
    const task = cron.schedule(
      '0 8 * * *',
      async () => {
        try {
          await this.sendSpacedRepetitionPush();
        } catch (error) {
          logger.error('Error sending spaced repetition push:', error);
        }
      },
      {
        timezone: config.locale.timezone || 'Asia/Shanghai',
      }
    );

    this.tasks.push(task);
    logger.info('Spaced repetition push task scheduled: daily at 08:00');
  }

  /**
   * 发送间隔重复推送通知
   * 查询所有 srEnabled=true 用户中 nextReviewAt <= now 的卡片，按用户分组，每用户取最多 srDailyLimit 条
   */
  private async sendSpacedRepetitionPush(): Promise<void> {
    logger.info('Starting spaced repetition push...');

    const userDueCardsMap = await this.spacedRepetitionService.getDueCardsForAllSREnabledUsers();

    if (userDueCardsMap.size === 0) {
      logger.info('No due cards found for any SR-enabled user');
      return;
    }

    const db = getDatabase();
    const appBaseUrl = config.cors.origin[0] || 'http://localhost:3000';

    for (const [userId, { cards, srDailyLimit }] of userDueCardsMap) {
      // Limit to srDailyLimit cards per user
      const limitedCards = cards.slice(0, srDailyLimit);

      // Get push rules for this user (external channels)
      const pushRules = await this.pushRuleService.findByUid(userId);
      const enabledRules = pushRules.filter((r) => r.enabled);

      for (const card of limitedCards) {
        try {
          // Fetch memo info
          const memoResults = await db
            .select({ content: memos.content })
            .from(memos)
            .where(and(eq(memos.memoId, card.memoId), eq(memos.deletedAt, 0)))
            .limit(1);

          if (memoResults.length === 0) {
            continue; // Memo was deleted, skip
          }

          const memoContent = memoResults[0].content;
          const memoTitle = memoContent.split('\n')[0].slice(0, 50) || '无标题';
          const memoPreview = memoContent.slice(0, 100);
          const memoLink = `${appBaseUrl}/review`;

          const pushTitle = '📚 复习提醒';
          const pushBody = `《${memoTitle}》\n${memoPreview}\n查看笔记：${memoLink}`;

          // Send via external push channels if configured
          for (const rule of enabledRules) {
            for (const channelConfig of rule.channels) {
              try {
                const channel = this.channelFactory.getChannel(channelConfig);
                await channel.send({ title: pushTitle, msg: pushBody });
                logger.info(
                  `SR push sent for user ${userId}, card ${card.cardId} via ${channelConfig.type}`
                );
              } catch (channelError) {
                logger.error(
                  `Failed to send SR push via channel ${channelConfig.type} for user ${userId}:`,
                  channelError
                );
              }
            }
          }

          // Always write to in_app_notifications
          await this.notificationService.createNotification({
            userId,
            type: 'spaced_repetition',
            title: pushTitle,
            body: pushBody,
            memoId: card.memoId,
          });
        } catch (cardError) {
          logger.error(`Failed to process SR push for card ${card.cardId}:`, cardError);
        }
      }

      logger.info(`SR push completed for user ${userId}: ${limitedCards.length} card(s) processed`);
    }

    logger.info('Spaced repetition push completed');
  }

  /**
   * Strip HTML tags and convert to plain text
   */
  private stripHtml(html: string): string {
    return html
      .replaceAll(/<\/div>/gi, '\n')
      .replaceAll(/<\/p>/gi, '\n')
      .replaceAll(/<br\s*\/?>/gi, '\n')
      .replaceAll(/<[^>]+>/g, '')
      .replaceAll(/&nbsp;/g, ' ')
      .replaceAll(/&amp;/g, '&')
      .replaceAll(/&lt;/g, '<')
      .replaceAll(/&gt;/g, '>')
      .replaceAll(/&quot;/g, '"')
      .replaceAll(/&#x27;/g, "'")
      .replaceAll(/&#x2F;/g, '/')
      .replaceAll(/\n\s*\n/g, '\n\n')
      .trim();
  }

  /**
   * 停止所有定时任务
   */
  async stop(): Promise<void> {
    logger.info('Stopping scheduler service...');

    for (const task of this.tasks) {
      task.stop();
    }

    this.tasks = [];
    this.isInitialized = false;

    logger.info('Scheduler service stopped');
  }

  /**
   * 检查服务是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}
