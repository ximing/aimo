import 'reflect-metadata';
import { loadEnv as loadEnvironment } from './config/env.js';

// Load environment variables first to access config
loadEnvironment();

// Set timezone from config
process.env.TZ = process.env.LOCALE_TIMEZONE || 'Asia/Shanghai';

// Server version from package.json
const SERVER_VERSION = '0.1.0';

import { logger } from './utils/logger.js';

async function bootstrap() {
  try {
    logger.info(`🚀 AIMO Server v${SERVER_VERSION} starting...`);
    logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);

    const { createApp } = await import('./app.js');
    await createApp();

    logger.info(`✅ AIMO Server v${SERVER_VERSION} started successfully!\n`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
