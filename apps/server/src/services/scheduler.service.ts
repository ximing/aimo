import cron from 'node-cron';
import { Service } from 'typedi';

import { config } from '../config/config.js';
import { LanceDbService as LanceDatabaseService } from '../sources/lancedb.js';

/**
 * 调度服务
 * 负责管理所有定时任务，包括数据库优化等周期性维护任务
 */
@Service()
export class SchedulerService {
  private tasks: cron.ScheduledTask[] = [];
  private isInitialized = false;

  constructor(private lanceDatabaseService: LanceDatabaseService) {}

  /**
   * 初始化所有定时任务
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      console.warn('SchedulerService already initialized');
      return;
    }

    console.log('Initializing scheduler service...');

    // 注册数据库优化任务
    this.registerDatabaseOptimizationTask();

    this.isInitialized = true;
    console.log('Scheduler service initialized successfully');
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
          console.log('Starting scheduled LanceDB optimization...');
          const startTime = Date.now();

          await this.lanceDbService.optimizeAllTables();

          const duration = Date.now() - startTime;
          console.log(`Scheduled LanceDB optimization completed in ${duration}ms`);
        } catch (error) {
          console.error('Error during scheduled LanceDB optimization:', error);
        }
      },
      {
        timezone: config.locale.timezone || 'Asia/Shanghai',
      }
    );

    this.tasks.push(task);
    console.log(
      `Database optimization task scheduled: ${cronExpression} (${config.locale.timezone})`
    );
  }

  /**
   * 停止所有定时任务
   */
  async stop(): Promise<void> {
    console.log('Stopping scheduler service...');

    for (const task of this.tasks) {
      task.stop();
    }

    this.tasks = [];
    this.isInitialized = false;

    console.log('Scheduler service stopped');
  }

  /**
   * 检查服务是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}
