import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/config/env.js';
import * as schema from '@/config/schema.js';

let queryClient: postgres.Sql<{}>;
let db: ReturnType<typeof drizzle<typeof schema>>;

export function createDbConnection(url: string = env.DATABASE_URL) {
  console.log('createDbConnection', url);
  queryClient = postgres(url);
  db = drizzle(queryClient, { schema });
  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database connection not initialized');
  }
  return db;
}

export function getQueryClient() {
  if (!queryClient) {
    throw new Error('Query client not initialized');
  }
  return queryClient;
}

export { db };
