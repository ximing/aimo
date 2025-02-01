import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
dotenv.config({ path: join(process.cwd(), '.env') });
dotenv.config({ path: join(process.cwd(), envFile) });

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

export default {
  schema: './src/config/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: DATABASE_URL,
  },
} satisfies Config;
