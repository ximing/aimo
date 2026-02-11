import 'reflect-metadata';
import { loadEnv } from './config/env.js';

// Load environment variables first to access config
loadEnv();

// Set timezone from config
process.env.TZ = process.env.LOCALE_TIMEZONE || 'Asia/Shanghai';

async function bootstrap() {
  try {
    const { createApp } = await import('./app.js');
    await createApp();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
