import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dayjs from 'dayjs';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { useExpressServer, Action, useContainer } from 'routing-controllers';
import { Container } from 'typedi';

import { config } from './config/config.js';
import { controllers } from './controllers/index.js';
import { initializeDatabase, checkConnectionHealth, closeDatabase } from './db/connection.js';
import { initIOC } from './ioc.js';
import { authHandler } from './middlewares/auth-handler.js';
import { errorHandler } from './middlewares/error-handler.js';
import { SchedulerService } from './services/scheduler.service.js';
import { LanceDbService as LanceDatabaseService } from './sources/lancedb.js';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dayjs.locale(config.locale.language);
useContainer(Container);

export async function createApp() {
  await initIOC();

  // Initialize MySQL database connection pool
  initializeDatabase();

  // Check MySQL connection health
  const isHealthy = await checkConnectionHealth();
  if (!isHealthy) {
    throw new Error('MySQL connection health check failed');
  }

  await Container.get(LanceDatabaseService).init();

  // Initialize scheduler service for periodic tasks
  try {
    const schedulerService = Container.get(SchedulerService);
    await schedulerService.init();
    logger.info('Scheduler service initialized');
  } catch (error) {
    logger.error('Failed to initialize scheduler service:', error);
    // Continue app startup even if scheduler service fails to initialize
  }

  const app: any = express();

  // 中间件配置
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:', 'http:', 'blob:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", 'http:', 'https:'],
          mediaSrc: ["'self'", 'https:', 'http:', 'blob:'],
        },
      },
    })
  );
  app.use(cors());
  app.use(cookieParser());
  app.use(morgan('dev'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(authHandler);

  // Serve static files from public directory (web build artifacts)
  const publicPath = join(__dirname, '../public');
  app.use(
    express.static(publicPath, {
      maxAge: '1d',
      etag: false,
      // Cache busting for JS and CSS files
      setHeaders: (res, path) => {
        if (/\.(js|css)$/.test(path)) {
          res.set('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );

  // 配置 routing-controllers
  useExpressServer(app, {
    controllers,
    validation: true,
    defaultErrorHandler: false,
    currentUserChecker: async (action: Action) => {
      if (action.request.user) {
        return action.request.user;
      }
      return null;
    },
  });

  // 错误处理中间件
  app.use(errorHandler);

  const server = app.listen(config.port, () => {
    logger.info(`Server is running on port ${config.port}`);
  });

  // Graceful shutdown handler
  const shutdownHandler = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      try {
        // Stop scheduler service
        const schedulerService = Container.get(SchedulerService);
        if (schedulerService.isReady()) {
          await schedulerService.stop();
        }

        // Close MySQL connection pool
        await closeDatabase();

        // Close LanceDB connections and release resources
        await Container.get(LanceDatabaseService).close();
        logger.info('All resources cleaned up');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
  process.on('SIGINT', () => shutdownHandler('SIGINT'));

  return app;
}
