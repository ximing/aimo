#!/usr/bin/env node
/**
 * Docker Migration Script
 *
 * This script handles database migrations in Docker environment.
 * It can run three types of migrations:
 * 1. generate - Generate new Drizzle migration files
 * 2. migrate - Run pending Drizzle migrations
 * 3. migrate-data - Migrate data from LanceDB to MySQL (one-time)
 *
 * Usage:
 *   node docker-migrate.js generate
 *   node docker-migrate.js migrate
 *   node docker-migrate.js migrate-data
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

const command = process.argv[2];

if (!command || !['generate', 'migrate', 'migrate-data'].includes(command)) {
  console.error('Usage: node docker-migrate.js <generate|migrate|migrate-data>');
  console.error('');
  console.error('Commands:');
  console.error('  generate      - Generate new Drizzle migration files');
  console.error('  migrate       - Run pending Drizzle migrations');
  console.error('  migrate-data  - Migrate data from LanceDB to MySQL (one-time)');
  process.exit(1);
}

function runCommand(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${cmd} ${args.join(' ')}`);

    const proc = spawn(cmd, args, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true,
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  try {
    switch (command) {
      case 'generate':
        console.log('📦 Generating Drizzle migration files...');
        await runCommand('pnpm', ['drizzle-kit', 'generate']);
        console.log('✅ Migration files generated successfully');
        break;

      case 'migrate':
        console.log('🔄 Running Drizzle migrations...');
        await runCommand('node', ['--loader', 'ts-node/esm', './src/db/migrate.ts']);
        console.log('✅ Migrations completed successfully');
        break;

      case 'migrate-data':
        console.log('📊 Migrating data from LanceDB to MySQL...');
        console.log('⚠️  This is a one-time operation. Make sure you have backups!');
        await runCommand('tsx', ['src/scripts/migrate-lancedb-to-mysql.ts']);
        console.log('✅ Data migration completed successfully');
        break;
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
