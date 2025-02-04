import { sql } from 'drizzle-orm';
import { db } from './db.js';

export async function initDatabase() {
  try {
    // 创建必要的扩展
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "vector"`);

    console.log('✅ Database extensions initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    return false;
  }
}
