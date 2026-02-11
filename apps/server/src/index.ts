import 'reflect-metadata';

process.env.TZ = 'Asia/Shanghai';

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
