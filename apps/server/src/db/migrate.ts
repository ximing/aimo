import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { config } from '../config/index.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { users } from '@/config/schema.js';
import path from 'path';

async function main() {
  const sql = postgres(config.databaseUrl, { max: 1 });
  const db = drizzle(sql);

  try {
    // 执行迁移
    console.log('Running migrations...');
    await migrate(db, { migrationsFolder: path.join(__dirname, 'migrations') });
    console.log('Migrations completed');
  } catch (err) {}
  // 检查是否存在管理员账户
  const adminUser = await db
    .select()
    .from(users)
    .where(eq(users.role, 'admin'))
    .limit(1);

  if (adminUser.length === 0 && config.adminEmail && config.adminPassword) {
    console.log('Creating admin user...');

    // 创建管理员账户
    const hashedPassword = await bcrypt.hash(config.adminPassword, 10);

    await db.insert(users).values({
      email: config.adminEmail,
      hashedPassword,
      name: config.adminName || 'Administrator',
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('Admin user created successfully');
  }

  await sql.end();
  console.log('Migrations completed');
}

main().catch((err) => {
  console.error('Migration failed');
  console.error(err);
  process.exit(1);
});
