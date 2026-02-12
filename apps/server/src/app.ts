import express from 'express';
import { useExpressServer, Action, useContainer } from 'routing-controllers';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import dayjs from 'dayjs';
import { Container } from 'typedi';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { errorHandler } from './middlewares/error-handler.js';
import { controllers } from './controllers/index.js';
import { authHandler } from './middlewares/auth-handler.js';
import { initIOC } from './ioc.js';
import { LanceDbService } from './sources/lancedb.js';
import { BackupService } from './services/backup.service.js';
import { SchedulerService } from './services/scheduler.service.js';
import { config } from './config/config.js';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dayjs.locale(config.locale.language);
useContainer(Container);

export async function createApp() {
  await initIOC();
  await Container.get(LanceDbService).init();

  // Initialize backup service if enabled
  if (config.backup.enabled) {
    try {
      const backupService = Container.get(BackupService);
      await backupService.initialize();
      console.log('Backup service initialized');
    } catch (error) {
      console.error('Failed to initialize backup service:', error);
      // Continue app startup even if backup service fails to initialize
    }
  }

  // Initialize scheduler service for periodic tasks
  try {
    const schedulerService = Container.get(SchedulerService);
    await schedulerService.init();
    console.log('Scheduler service initialized');
  } catch (error) {
    console.error('Failed to initialize scheduler service:', error);
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
          imgSrc: ["'self'", 'data:', 'https:', 'http:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", 'http:', 'https:'],
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
  app.use(express.static(publicPath, {
    maxAge: '1d',
    etag: false,
    // Cache busting for JS and CSS files
    setHeaders: (res, path) => {
      if (path.match(/\.(js|css)$/)) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));

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
    console.log(`Server is running on port ${config.port}`);
  });

  // Graceful shutdown handler
  const shutdownHandler = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      try {
        // Stop scheduler service
        const schedulerService = Container.get(SchedulerService);
        if (schedulerService.isReady()) {
          await schedulerService.stop();
        }
        
        // Close LanceDB connections and release resources
        await Container.get(LanceDbService).close();
        console.log('All resources cleaned up');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
  process.on('SIGINT', () => shutdownHandler('SIGINT'));

  return app;
}
