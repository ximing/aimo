import winston from 'winston';

import { LoggerOptions, ResolvedConfig, resolveConfig, LogMetadata } from './config';
import { createTransports } from './transports';

/**
 * Log 类 - Node.js 日志记录器
 * 支持多级别日志，自动文件切割，灵活的配置
 */
export class Log {
  private logger: winston.Logger;
  private config: ResolvedConfig;

  /**
   * 构造函数
   * @param options 日志配置选项
   */
  constructor(options: LoggerOptions) {
    this.config = resolveConfig(options);
    this.logger = this.createWinstonLogger();
  }

  /**
   * 创建 Winston Logger 实例
   */
  private createWinstonLogger(): winston.Logger {
    const transports = createTransports(this.config);

    return winston.createLogger({
      level: this.config.level,
      // 添加默认元数据，确保每条日志都包含 projectName
      defaultMeta: { projectName: this.config.projectName },
      transports,
      // 处理未捕获的异常
      exceptionHandlers: transports,
    });
  }

  /**
   * 获取底层的 Winston Logger 实例
   * @returns Winston Logger 实例
   */
  public getWinstonLogger(): winston.Logger {
    return this.logger;
  }

  /**
   * 获取当前配置
   */
  public getConfig(): ResolvedConfig {
    return { ...this.config };
  }

  /**
   * trace 级别日志
   * @param message 日志消息
   * @param meta 元数据 - 支持对象、Error、字符串、数字等
   */
  public trace(message: string, ...meta: LogMetadata[]): void {
    this.logger.silly(message, ...meta);
  }

  /**
   * debug 级别日志
   * @param message 日志消息
   * @param meta 元数据 - 支持对象、Error、字符串、数字等
   */
  public debug(message: string, ...meta: LogMetadata[]): void {
    this.logger.debug(message, ...meta);
  }

  /**
   * info 级别日志
   * @param message 日志消息
   * @param meta 元数据 - 支持对象、Error、字符串、数字等
   */
  public info(message: string, ...meta: LogMetadata[]): void {
    this.logger.info(message, ...meta);
  }

  /**
   * warn 级别日志
   * @param message 日志消息
   * @param meta 元数据 - 支持对象、Error、字符串、数字等
   */
  public warn(message: string, ...meta: LogMetadata[]): void {
    this.logger.warn(message, ...meta);
  }

  /**
   * error 级别日志
   * @param message 日志消息
   * @param meta 元数据 - 支持对象、Error、字符串、数字等
   */
  public error(message: string, ...meta: LogMetadata[]): void {
    this.logger.error(message, ...meta);
  }

  /**
   * 等待所有待处理的日志被写入
   * 用于优雅关闭前确保日志完全输出
   */
  public async flush(): Promise<void> {
    return new Promise((resolve) => {
      // Winston 在有待处理的写入时会触发 finish 事件
      let completed = 0;
      const totalTransports = this.logger.transports.length;

      if (totalTransports === 0) {
        resolve();
        return;
      }

      for (const transport of this.logger.transports) {
        if ('close' in transport && typeof transport.close === 'function') {
          transport.on('finish', () => {
            completed++;
            if (completed === totalTransports) {
              resolve();
            }
          });
        } else {
          completed++;
          if (completed === totalTransports) {
            resolve();
          }
        }
      }

      // 设置超时，防止无限等待
      setTimeout(resolve, 2000);
    });
  }

  /**
   * 关闭 Logger，释放资源
   */
  public close(): void {
    try {
      // 移除所有错误监听器，防止未捕获的错误
      for (const transport of this.logger.transports) {
        transport.removeAllListeners('error');
      }

      this.logger.close();
    } catch (error) {
      // 忽略关闭时的错误
      console.error('Error closing logger:', error);
    }
  }
}
