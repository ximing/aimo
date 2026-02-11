import { loadEnv } from './env.js';

// 先加载环境变量
loadEnv();

// 添加配置调试日志
console.log('Current Environment:', process.env.NODE_ENV);

export type StorageType = 'local' | 's3';
export type BackupStorageType = 'local' | 's3' | 'oss';

export interface BackupRetentionPolicy {
  maxCount?: number; // 最多保留N个备份
  maxDays?: number; // 保留N天内的备份
}

export interface BackupConfig {
  enabled: boolean;
  throttleIntervalMs: number; // 最小备份间隔（毫秒）
  storageType: BackupStorageType;
  retentionPolicy: BackupRetentionPolicy;
  // Note: Backup is automatically disabled if LanceDB uses S3 storage
  // S3 provides built-in redundancy and managed storage, making local backups unnecessary
  // S3 配置
  s3?: {
    bucket: string;
    prefix: string;
    awsAccessKeyId?: string;
    awsSecretAccessKey?: string;
    region?: string;
    endpoint?: string;
  };
  // OSS 配置
  oss?: {
    bucket: string;
    prefix: string;
    accessKeyId?: string;
    accessKeySecret?: string;
    region?: string;
    endpoint?: string;
  };
  // 本地存储配置
  local?: {
    path: string;
  };
}

export interface Config {
  port: number;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  jwt: {
    secret: string;
  };
  lancedb: {
    storageType: StorageType;
    path: string; // local: "./lancedb_data" or s3: "s3://bucket/path/to/database"
    s3?: {
      bucket: string;
      prefix: string; // path inside bucket
      awsAccessKeyId?: string;
      awsSecretAccessKey?: string;
      region?: string;
      endpoint?: string; // S3 endpoint URL (e.g., http://minio:9000)
    };
  };
  backup: BackupConfig;
  openai: {
    apiKey: string;
    model: string;
    baseURL: string;
    embeddingDimensions: number; // Embedding vector dimensions (e.g., 1536 for text-embedding-3-small)
  };
  locale: {
    language: string; // e.g., 'zh-cn', 'en-us'
    timezone: string; // e.g., 'Asia/Shanghai', 'UTC'
  };
  env: string;
}

export const config: Config = {
  port: Number(process.env.PORT) || 3000,
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  },
  lancedb: {
    storageType: (process.env.LANCEDB_STORAGE_TYPE || 'local') as StorageType,
    path:
      process.env.LANCEDB_STORAGE_TYPE === 's3'
        ? `s3://${process.env.LANCEDB_S3_BUCKET}/${process.env.LANCEDB_S3_PREFIX || 'lancedb'}`
        : process.env.LANCEDB_PATH || './lancedb_data',
    s3:
      process.env.LANCEDB_STORAGE_TYPE === 's3'
        ? {
            bucket: process.env.LANCEDB_S3_BUCKET || '',
            prefix: process.env.LANCEDB_S3_PREFIX || 'lancedb',
            awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
            awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION || 'us-east-1',
            endpoint: process.env.LANCEDB_S3_ENDPOINT,
          }
        : undefined,
  },
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    throttleIntervalMs: Number(process.env.BACKUP_THROTTLE_INTERVAL_MS) || 3600000, // 默认1小时
    storageType: (process.env.BACKUP_STORAGE_TYPE || 'local') as BackupStorageType,
    retentionPolicy: {
      maxCount: Number(process.env.BACKUP_MAX_COUNT) || 10,
      maxDays: Number(process.env.BACKUP_MAX_DAYS) || 30,
    },
    s3:
      process.env.BACKUP_STORAGE_TYPE === 's3'
        ? {
            bucket: process.env.BACKUP_S3_BUCKET || '',
            prefix: process.env.BACKUP_S3_PREFIX || 'backups',
            awsAccessKeyId: process.env.BACKUP_AWS_ACCESS_KEY_ID,
            awsSecretAccessKey: process.env.BACKUP_AWS_SECRET_ACCESS_KEY,
            region: process.env.BACKUP_AWS_REGION || 'us-east-1',
            endpoint: process.env.BACKUP_S3_ENDPOINT,
          }
        : undefined,
    oss:
      process.env.BACKUP_STORAGE_TYPE === 'oss'
        ? {
            bucket: process.env.BACKUP_OSS_BUCKET || '',
            prefix: process.env.BACKUP_OSS_PREFIX || 'backups',
            accessKeyId: process.env.BACKUP_OSS_ACCESS_KEY_ID,
            accessKeySecret: process.env.BACKUP_OSS_ACCESS_KEY_SECRET,
            region: process.env.BACKUP_OSS_REGION || 'cn-hangzhou',
            endpoint: process.env.BACKUP_OSS_ENDPOINT,
          }
        : undefined,
    local:
      process.env.BACKUP_STORAGE_TYPE === 'local'
        ? {
            path: process.env.BACKUP_LOCAL_PATH || './backups',
          }
        : undefined,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'text-embedding-3-small',
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    embeddingDimensions: Number(process.env.OPENAI_EMBEDDING_DIMENSIONS) || 1536,
  },
  locale: {
    language: process.env.LOCALE_LANGUAGE || 'zh-cn',
    timezone: process.env.LOCALE_TIMEZONE || 'Asia/Shanghai',
  },
  env: process.env.NODE_ENV || 'development',
};
