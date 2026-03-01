import cron from 'node-cron';
import { Service, Inject } from 'typedi';

import { config } from '../config/config.js';
import { LanceDbService as LanceDatabaseService } from '../sources/lancedb.js';
import { logger } from '../utils/logger.js';

import { ChannelFactory } from './channels/channel.factory.js';
import { DailyContentGenerator } from './channels/daily-content.generator.js';
import { PushRuleService } from './push-rule.service.js';

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
    @Inject() private channelFactory: ChannelFactory
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

        const channel = this.channelFactory.getChannel(channelConfig);
        await channel.send({
          title: content.title,
          msg: content.msg,
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
