import { createClient } from 'redis';
import { env } from '@/config/env.js';

const redisClient = createClient({
  url: env.REDIS_URL,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

await redisClient.connect();

export { redisClient };
