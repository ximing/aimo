import { loadEnv as loadEnvironment } from './env.js';

// 先加载环境变量
loadEnvironment();

// 添加配置调试日志
console.log('Current Environment:', process.env.NODE_ENV);

export type StorageType = 'local' | 's3';
export type BackupStorageType = 'local' | 's3' | 'oss';
export type AttachmentStorageType = 'local' | 's3' | 'oss';

export interface BackupRetentionPolicy {
  maxCount?: number; // 最多保留N个备份
  maxDays?: number; // 保留N天内的备份
}

// 通用 S3 存储配置（支持 AWS S3、MinIO、Aliyun OSS 作为 S3-compatible 等）
export interface S3StorageConfig {
  bucket: string;
  prefix: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  region?: string;
  endpoint?: string; // 可选：自定义端点（如 MinIO、Aliyun OSS 等）
  isPublic?: boolean; // 是否为公开桶（true: 返回直接 URL，false: 生成 presigned URL）
}

// OSS 存储配置（使用 ali-oss 官方库）
export interface OSSStorageConfig {
  bucket: string;
  prefix: string;
  accessKeyId: string;
  accessKeySecret: string;
  region: string;
  endpoint?: string; // 可选：自定义端点
  isPublic?: boolean; // 是否为公开桶
}

// 本地存储配置
export interface LocalStorageConfig {
  path: string;
}

export interface BackupConfig {
  enabled: boolean;
  throttleIntervalMs: number; // 最小备份间隔（毫秒）
  storageType: BackupStorageType;
  retentionPolicy: BackupRetentionPolicy;
  // Note: Backup is automatically disabled if LanceDB uses S3 storage
  // S3 provides built-in redundancy and managed storage, making local backups unnecessary
  local?: LocalStorageConfig;
  s3?: S3StorageConfig;
  oss?: OSSStorageConfig;
}

export interface AttachmentConfig {
  storageType: AttachmentStorageType;
  maxFileSize: number; // 最大文件大小（字节）
  allowedMimeTypes: string[]; // 允许的 MIME 类型白名单
  presignedUrlExpiry: number; // S3 预签名 URL 过期时间（秒）
  local?: LocalStorageConfig;
  s3?: S3StorageConfig;
  oss?: OSSStorageConfig;
}

export interface MultimodalEmbeddingConfig {
  enabled: boolean; // 是否启用多模态 embedding
  model: string; // 模型名称 (e.g., 'qwen3-vl-embedding')
  apiKey: string; // DashScope API Key
  baseURL: string; // DashScope API 基础 URL
  dimension: number; // 向量维度 (e.g., 1024)
  outputType: string; // 输出类型 (e.g., 'dense')
  fps?: number; // 视频帧采样率 (e.g., 0.5)
}

export interface ASRConfig {
  enabled: boolean; // 是否启用 ASR
  model: string; // ASR 模型名称 (e.g., 'fun-asr')
  apiKey: string; // DashScope API Key
  baseURL: string; // DashScope API 基础 URL
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
    versionRetentionDays: number; // 版本保留天数，默认 7 天
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
  attachment: AttachmentConfig;
  scheduler?: {
    dbOptimizationCron: string; // Cron expression for database optimization (default: '0 2 * * *' - daily at 2 AM)
  };
  openai: {
    apiKey: string;
    model: string; // Chat model for AI exploration
    embeddingModel: string; // Embedding model for vector search
    baseURL: string;
    embeddingDimensions: number; // Embedding vector dimensions (e.g., 1536 for text-embedding-3-small)
  };
  multimodal: MultimodalEmbeddingConfig;
  asr: ASRConfig;
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
    versionRetentionDays: Number(process.env.LANCEDB_VERSION_RETENTION_DAYS) || 7, // 默认保留 7 天
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
    throttleIntervalMs: Number(process.env.BACKUP_THROTTLE_INTERVAL_MS) || 3_600_000, // 默认1小时
    storageType: (process.env.BACKUP_STORAGE_TYPE || 'local') as BackupStorageType,
    retentionPolicy: {
      maxCount: Number(process.env.BACKUP_MAX_COUNT) || 10,
      maxDays: Number(process.env.BACKUP_MAX_DAYS) || 30,
    },
    local:
      process.env.BACKUP_STORAGE_TYPE === 'local'
        ? {
            path: process.env.BACKUP_LOCAL_PATH || './backups',
          }
        : undefined,
    s3:
      process.env.BACKUP_STORAGE_TYPE === 's3'
        ? {
            bucket: process.env.BACKUP_S3_BUCKET || '',
            prefix: process.env.BACKUP_S3_PREFIX || 'backups',
            awsAccessKeyId: process.env.BACKUP_S3_ACCESS_KEY_ID,
            awsSecretAccessKey: process.env.BACKUP_S3_SECRET_ACCESS_KEY,
            region: process.env.BACKUP_S3_REGION || 'us-east-1',
            endpoint: process.env.BACKUP_S3_ENDPOINT,
            isPublic: process.env.BACKUP_S3_IS_PUBLIC === 'true',
          }
        : undefined,
    oss:
      process.env.BACKUP_STORAGE_TYPE === 'oss'
        ? {
            bucket: process.env.BACKUP_OSS_BUCKET || '',
            prefix: process.env.BACKUP_OSS_PREFIX || 'backups',
            accessKeyId: process.env.BACKUP_OSS_ACCESS_KEY_ID || '',
            accessKeySecret: process.env.BACKUP_OSS_ACCESS_KEY_SECRET || '',
            region: process.env.BACKUP_OSS_REGION || 'cn-hangzhou',
            endpoint: process.env.BACKUP_OSS_ENDPOINT,
            isPublic: process.env.BACKUP_OSS_IS_PUBLIC === 'true',
          }
        : undefined,
  },
  attachment: {
    storageType: (process.env.ATTACHMENT_STORAGE_TYPE || 'local') as AttachmentStorageType,
    maxFileSize: Number(process.env.ATTACHMENT_MAX_FILE_SIZE) || 52_428_800, // 默认 50MB
    allowedMimeTypes: process.env.ATTACHMENT_ALLOWED_MIME_TYPES
      ? process.env.ATTACHMENT_ALLOWED_MIME_TYPES.split(',')
      : [
          // 图片
          'image/png',
          'image/jpeg',
          'image/gif',
          'image/webp',
          'image/svg+xml',
          // PDF
          'application/pdf',
          // 文档
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          // 表格
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          // 文本
          'text/plain',
          'text/markdown',
        ],
    presignedUrlExpiry: Number(process.env.ATTACHMENT_PRESIGNED_URL_EXPIRY) || 3600, // 默认 1 小时 (12 小时 = 43200)
    local:
      process.env.ATTACHMENT_STORAGE_TYPE === 'local'
        ? {
            path: process.env.ATTACHMENT_LOCAL_PATH || './attachments',
          }
        : undefined,
    s3:
      process.env.ATTACHMENT_STORAGE_TYPE === 's3'
        ? {
            bucket: process.env.ATTACHMENT_S3_BUCKET || '',
            prefix: process.env.ATTACHMENT_S3_PREFIX || 'attachments',
            awsAccessKeyId: process.env.ATTACHMENT_S3_ACCESS_KEY_ID,
            awsSecretAccessKey: process.env.ATTACHMENT_S3_SECRET_ACCESS_KEY,
            region: process.env.ATTACHMENT_S3_REGION || 'us-east-1',
            endpoint: process.env.ATTACHMENT_S3_ENDPOINT,
            isPublic: process.env.ATTACHMENT_S3_IS_PUBLIC === 'true',
          }
        : undefined,
    oss:
      process.env.ATTACHMENT_STORAGE_TYPE === 'oss'
        ? {
            bucket: process.env.ATTACHMENT_OSS_BUCKET || '',
            prefix: process.env.ATTACHMENT_OSS_PREFIX || 'attachments',
            accessKeyId: process.env.ATTACHMENT_OSS_ACCESS_KEY_ID || '',
            accessKeySecret: process.env.ATTACHMENT_OSS_ACCESS_KEY_SECRET || '',
            region: process.env.ATTACHMENT_OSS_REGION || 'cn-hangzhou',
            endpoint: process.env.ATTACHMENT_OSS_ENDPOINT,
            isPublic: process.env.ATTACHMENT_OSS_IS_PUBLIC === 'true',
          }
        : undefined,
  },
  scheduler: {
    dbOptimizationCron: process.env.DB_OPTIMIZATION_CRON || '0 2 * * *', // 默认每天凌晨 2 点
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    embeddingDimensions: Number(process.env.OPENAI_EMBEDDING_DIMENSIONS) || 1536,
  },
  multimodal: {
    enabled: process.env.MULTIMODAL_EMBEDDING_ENABLED === 'true',
    model: process.env.MULTIMODAL_EMBEDDING_MODEL || 'qwen3-vl-embedding',
    apiKey: process.env.DASHSCOPE_API_KEY || '',
    baseURL: process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1',
    dimension: Number(process.env.MULTIMODAL_EMBEDDING_DIMENSION) || 1024,
    outputType: process.env.MULTIMODAL_EMBEDDING_OUTPUT_TYPE || 'dense',
    fps: Number(process.env.MULTIMODAL_EMBEDDING_VIDEO_FPS) || 0.5,
  },
  asr: {
    enabled: process.env.FUN_ASR_ENABLED !== 'false',
    model: process.env.FUN_ASR_MODEL || 'fun-asr',
    apiKey: process.env.FUN_ASR_API_KEY || process.env.DASHSCOPE_API_KEY || '',
    baseURL: process.env.FUN_ASR_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1',
  },
  locale: {
    language: process.env.LOCALE_LANGUAGE || 'zh-cn',
    timezone: process.env.LOCALE_TIMEZONE || 'Asia/Shanghai',
  },
  env: process.env.NODE_ENV || 'development',
};
