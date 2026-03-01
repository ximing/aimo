import { defineConfig } from 'drizzle-kit';

const dbType = process.env.DATABASE_TYPE || 'mysql';

export default defineConfig({
  schema: './src/sources/database/schema/index.ts',
  out: './src/sources/database/migrations',
  dialect: dbType as 'mysql' | 'postgresql' | 'sqlite',
  dbCredentials:
    dbType === 'mysql'
      ? {
          host: process.env.DATABASE_MYSQL_HOST || 'localhost',
          port: Number(process.env.DATABASE_MYSQL_PORT) || 3306,
          user: process.env.DATABASE_MYSQL_USERNAME || 'root',
          password: process.env.DATABASE_MYSQL_PASSWORD || '',
          database: process.env.DATABASE_MYSQL_DATABASE || 'aimo',
        }
      : dbType === 'postgresql'
        ? {
            host: process.env.DATABASE_POSTGRES_HOST || 'localhost',
            port: Number(process.env.DATABASE_POSTGRES_PORT) || 5432,
            user: process.env.DATABASE_POSTGRES_USERNAME || 'postgres',
            password: process.env.DATABASE_POSTGRES_PASSWORD || '',
            database: process.env.DATABASE_POSTGRES_DATABASE || 'aimo',
          }
        : {
            url: process.env.DATABASE_SQLITE_PATH || './aimo.db',
          },
  tablesFilter: ['!lancedb_*'],
});
