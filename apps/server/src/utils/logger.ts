import path from 'node:path';

import { Log } from '@aimo/logger';

/**
 * AIMO Server Logger
 * 同时输出到控制台和文件
 */

const logDir = process.env.AIMO_LOG_DIR || path.join(process.cwd(), 'logs');

export const logger = new Log({
  projectName: 'aimo-server',
  level: (process.env.AIMO_LOG_LEVEL as 'trace' | 'debug' | 'info' | 'warn' | 'error') || 'info',
  logDir,
  enableTerminal: true,
  maxSize: '20m',
  maxFiles: '7d',
});

/**
 * 导出便捷方法
 */
export const { trace, debug, info, warn, error, flush, close } = logger;
