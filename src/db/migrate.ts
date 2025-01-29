import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "../lib/db.js";
import { join } from "path";
import { fileURLToPath } from "url";
import { sql } from "drizzle-orm";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

async function main() {
  try {
    console.log("Running migrations...");

    // 先删除已存在的 schema
    try {
      await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
      console.log("✅ Cleaned up old schema");
    } catch (error) {
      console.error("Warning: Failed to clean up old schema:", error);
    }

    // 创建新的 schema
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS drizzle`);
    console.log("✅ Created new schema");

    // 运行迁移
    await migrate(db, {
      migrationsFolder: join(__dirname, "migrations"),
    });
    console.log("✅ Migrations completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

main();