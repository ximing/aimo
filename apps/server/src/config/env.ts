import { z } from 'zod';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment-specific .env file
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
config({ path: join(process.cwd(), '.env') });
config({ path: join(process.cwd(), envFile) });

// Environment variable schema
const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  API_URL: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // Database
  DATABASE_URL: z
    .string()
    .default('postgres://aimo:aimo123@localhost:5432/aimo'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_SECRET: z.string().default('your-super-secret-key'),

  // Storage
  STORAGE_TYPE: z.enum(['local', 'aliyun']).default('local'),
  STORAGE_LOCAL_PATH: z.string().default('./temp/uploads'),
  STORAGE_PATH_PREFIX: z.string().default('uploads'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),

  // OAuth
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_API_BASE_URL: z.string().optional(),

  // Aliyun
  ALIYUN_ACCESS_KEY_ID: z.string().optional(),
  ALIYUN_ACCESS_KEY_SECRET: z.string().optional(),
  ALIYUN_OSS_REGION: z.string().optional(),
  ALIYUN_OSS_BUCKET: z.string().optional(),
});

// Parse and validate environment variables
export const env = envSchema.parse({
  // Server
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  API_URL: process.env.API_URL,
  FRONTEND_URL: process.env.FRONTEND_URL,

  // Database
  DATABASE_URL: process.env.DATABASE_URL,

  // Redis
  REDIS_URL: process.env.REDIS_URL,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET,

  // Storage
  STORAGE_TYPE: process.env.STORAGE_TYPE as 'local' | 'aliyun',
  STORAGE_LOCAL_PATH: process.env.STORAGE_LOCAL_PATH,
  STORAGE_PATH_PREFIX: process.env.STORAGE_PATH_PREFIX,
  S3_ENDPOINT: process.env.S3_ENDPOINT,
  S3_REGION: process.env.S3_REGION,
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
  S3_SECRET_KEY: process.env.S3_SECRET_KEY,
  S3_BUCKET: process.env.S3_BUCKET,

  // OAuth
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_API_BASE_URL: process.env.OPENAI_API_BASE_URL,

  // Aliyun
  ALIYUN_ACCESS_KEY_ID: process.env.ALIYUN_ACCESS_KEY_ID,
  ALIYUN_ACCESS_KEY_SECRET: process.env.ALIYUN_ACCESS_KEY_SECRET,
  ALIYUN_OSS_REGION: process.env.ALIYUN_OSS_REGION,
  ALIYUN_OSS_BUCKET: process.env.ALIYUN_OSS_BUCKET,
});

// Type declaration
declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envSchema> {}
  }
}

export type Env = z.infer<typeof envSchema>;
