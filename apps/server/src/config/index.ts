import { z } from 'zod';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 根据环境加载对应的 .env 文件
const envFile =
  process.env.NODE_ENV === 'test' ? '.env.test' : '.env.development';
dotenv.config({ path: resolve(__dirname, '../../', envFile) });

const configSchema = z.object({
  // ... 其他配置项 ...

  // 管理员配置
  adminEmail: z.string().email().optional(),
  adminPassword: z.string().min(6).optional(),
  adminName: z.string().optional(),

  databaseUrl: z.string().url(),
  // ... 其他配置项 ...
});

export const config = {
  // ... 其他配置项 ...

  // 管理员配置
  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: process.env.ADMIN_PASSWORD,
  adminName: process.env.ADMIN_NAME,

  databaseUrl: process.env.DATABASE_URL,
  // ... 其他配置项 ...
} as const;

// 验证配置
configSchema.parse(config);

export type Config = typeof config;
