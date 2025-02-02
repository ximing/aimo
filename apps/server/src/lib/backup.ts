import { spawn, type ChildProcess } from 'child_process';
import { join } from 'path';
import { mkdir, readdir, unlink, stat } from 'fs/promises';
import cron from 'node-cron';
import { env } from '@/config/env.js';

export class BackupService {
  private backupPath: string;

  constructor() {
    this.backupPath = env.BACKUP_PATH;
  }

  async init() {
    if (this.backupPath) {
      console.log('Backup service init', env.BACKUP_ENABLED);
      // 确保备份目录存在
      await mkdir(this.backupPath, { recursive: true });

      if (env.BACKUP_ENABLED) {
        // 设置定时任务
        cron.schedule(env.BACKUP_CRON, () => {
          this.createBackup().catch(console.error);
        });
        console.log('✅ Backup service initialized');
      }
    }
  }

  private async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sql`;
    const filepath = join(this.backupPath, filename);

    try {
      const url = new URL(env.DATABASE_URL);
      const host = url.hostname;
      const port = url.port;
      const database = url.pathname.slice(1);
      const username = url.username;
      const password = url.password;

      // 只设置必要的环境变量
      const pg_dump: ChildProcess = spawn(
        'pg_dump',
        [
          '-h',
          host,
          '-p',
          port,
          '-U',
          username,
          '-d',
          database,
          '-F',
          'c',
          '-f',
          filepath,
        ],
        {
          env: {
            PATH: process.env.PATH || '',
            PGPASSWORD: password,
          } as any,
        }
      );

      await new Promise<void>((resolve, reject) => {
        pg_dump.on('close', (code: number) => {
          if (code === 0) {
            console.log(`✅ Backup created: ${filename}`);
            resolve();
          } else {
            reject(new Error(`pg_dump exited with code ${code}`));
          }
        });
        pg_dump.on('error', reject);
      });

      // 清理旧备份
      await this.cleanOldBackups();
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }

  private async cleanOldBackups() {
    const files = await readdir(this.backupPath);
    const now = Date.now();
    const maxAge = env.BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (!file.startsWith('backup-')) continue;

      const filepath = join(this.backupPath, file);
      const stats = await stat(filepath);
      const age = now - stats.mtime.getTime();

      if (age > maxAge) {
        await unlink(filepath);
        console.log(`🗑️ Deleted old backup: ${file}`);
      }
    }
  }

  // 手动触发备份
  async backup() {
    return this.createBackup();
  }

  // 获取所有备份列表
  async listBackups() {
    const files = await readdir(this.backupPath);
    const backups = await Promise.all(
      files
        .filter((file) => file.startsWith('backup-'))
        .map(async (file) => {
          const filepath = join(this.backupPath, file);
          const stats = await stat(filepath);
          return {
            filename: file,
            size: stats.size,
            createdAt: stats.mtime.toISOString(),
          };
        })
    );

    return backups.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

export const backupService = new BackupService();
