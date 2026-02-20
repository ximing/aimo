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
          // ===== 图片 - 常见格式 =====
          'image/png',
          'image/jpeg',
          'image/jpg',
          'image/gif', // 闪图/动态图
          'image/webp',
          'image/bmp',
          'image/tiff',
          'image/tif',
          'image/svg+xml',
          'image/avif',
          // ===== Apple/iPhone 照片格式 =====
          'image/heic', // iPhone 默认 HEIC 格式 (iOS 11+)
          'image/heif', // HEIF 容器
          'image/heic-sequence', // iPhone 连拍模式 (HEIC)
          'image/heif-sequence', // HEIF 连拍
          'image/apple-megatexture', // Apple MGTX
          'image/x-m4v', // M4V 图片 (iOS)
          // ===== Android 照片格式 =====
          'image/x-adobe-dng', // Adobe DNG (Android 旗舰机、专业模式)
          // Samsung Galaxy
          'image/x-samsung-srw', // Samsung RAW
          'image/x-samsung-sgw',
          // Huawei
          'image/x-huawei-hdr', // Huawei RAW
          'image/x-huawei-dng',
          // Xiaomi
          'image/x-xiaomi-dng', // Xiaomi RAW
          // Oppo/Vivo/OnePlus
          'image/x-oppo-orf', // Oppo RAW
          'image/x-vivo-dng', // Vivo RAW
          'image/x-oneplus-dng', // OnePlus RAW
          // ===== 相机 RAW 格式 - Canon =====
          'image/x-canon-cr2', // Canon CR2 (EOS 20D-50D, 5D/7D 早期)
          'image/x-canon-cr3', // Canon CR3 (EOS R 系列, 90D, etc)
          'image/x-canon-crw', // Canon CRW (早期)
          'image/x-canon-raw',
          'image/x-canon-crw',
          'image/x-canon-cr2',
          'image/x-canon-cr3',
          'image/x-canon-1dmx', // Canon 1D 系列
          'image/x-canon-1dsx',
          // ===== 相机 RAW 格式 - Nikon =====
          'image/x-nikon-nef', // Nikon NEF (专业格式)
          'image/x-nikon-nrw', // Nikon NRW (Compact)
          'image/x-nikon-nef',
          'image/x-nikon-nrw',
          'image/x-nikon-ndf', // Nikon NDF (Nikon NEF with TIFF)
          // ===== 相机 RAW 格式 - Sony =====
          'image/x-sony-arw', // Sony ARW
          'image/x-sony-srf', // Sony SRF
          'image/x-sony-sr2', // Sony SR2
          'image/x-sony-sony-raw',
          'image/x-sony-arw',
          'image/x-sony-srf',
          'image/x-sony-sr2',
          'image/x-sony-rx100', // Sony RX100 RAW
          'image/x-sony-a7r', // Sony A7R RAW
          // ===== 相机 RAW 格式 - Fujifilm =====
          'image/x-fuji-raf', // Fujifilm RAF
          'image/x-fuji-raw',
          'image/x-fuji-raf',
          // ===== 相机 RAW 格式 - Panasonic =====
          'image/x-panasonic-rw2', // Panasonic RW2
          'image/x-panasonic-raw',
          'image/x-panasonic-rw2',
          'image/x-panasonic-raw',
          // ===== 相机 RAW 格式 - Olympus =====
          'image/x-orf', // Olympus ORF
          'image/x-olympus-raw',
          'image/x-olympus-orf',
          // ===== 相机 RAW 格式 - Pentax =====
          'image/x-pentax-pef', // Pentax PEF
          'image/x-pentax-raw',
          'image/x-pentax-dng', // Pentax DNG
          'image/x-pentax-pef',
          // ===== 相机 RAW 格式 - Leica =====
          'image/x-leica-rwl', // Leica RWL
          'image/x-leica-raw',
          'image/x-leica-rwl',
          'image/x-leica-dng',
          'image/x-leica-3fr', // Leica 3FR
          // ===== 相机 RAW 格式 - Hasselblad =====
          'image/x-hasselblad-3fr', // Hasselblad 3FR
          'image/x-hasselblad-raw',
          'image/x-hasselblad-3fr',
          'image/x-hasselblad-dng',
          'image/x-hasselblad-fff', // Hasselblad FFF
          // ===== 相机 RAW 格式 - Phase One =====
          'image/x-phaseone-iiq', // Phase One IIQ
          'image/x-phaseone-raw',
          'image/x-phaseone-iiq',
          // ===== 相机 RAW 格式 - Leaf =====
          'image/x-leaf-mos', // Leaf MOS
          'image/x-leaf-raw',
          'image/x-leaf-mos',
          // ===== 相机 RAW 格式 - Epson / Ricoh / Casio =====
          'image/x-epson-erf', // Epson RAW
          'image/x-ricoh-dng', // Ricoh RAW
          'image/x-casio-raw', // Casio RAW
          'image/x-casio-bay', // Casio BAY
          // ===== 相机 RAW 格式 - 其他品牌 =====
          'image/x-raw', // 通用 RAW
          'image/x-adobe-dng', // Adobe DNG (通用)
          'image/dng', // DNG (官方 MIME)
          // ===== 专业/图形格式 =====
          'image/x-icon', // ICO 图标
          'image/x-rgb', // RGB
          'image/x-sgi', // SGI
          'image/x-targa', // TGA
          'image/x-psd', // Photoshop PSD
          'image/vnd.adobe.photoshop', // Photoshop
          'image/x-indesign', // InDesign
          // ===== 医学/科学影像 =====
          'image/x-dicom', // DICOM (医学影像)
          'image/dicom-rle',
          // ===== HDR/3D/全景格式 =====
          'image/x-exr', // OpenEXR (HDR)
          'image/x-hdr',
          'image/vnd.radiance', // Radiance HDR
          // ===== Netpbm/PNM 格式 =====
          'image/x-portable-anymap', // PNM 格式
          'image/x-portable-bitmap', // PBM (灰度)
          'image/x-portable-graymap', // PGM (灰度)
          'image/x-portable-pixmap', // PPM (彩色)
          'image/x-xbitmap', // XBM (位图)
          'image/x-xpixmap', // XPM
          // ===== 其他移动/设备格式 =====
          'image/x-qcom-msm', // Qualcomm
          'image/x-ktx', // Khronos Texture
          'image/ktx2', // KTX2
          'image/astc', // ASTC (ARM texture)
          // ===== 允许所有图片类型 (备用) =====
          'image/*',
          // ===== 视频 =====
          // 常见视频格式
          'video/x-msvideo', // AVI
          'video/x-flv', // FLV
          'video/x-matroska', // MKV
          'video/quicktime', // MOV
          'video/mp4',
          'video/mpeg',
          'video/webm',
          'video/x-ms-wmv',
          'video/3gpp', // 3GP (手机视频)
          'video/3gpp2',
          // ===== 更多视频格式 =====
          'video/x-m4v', // M4V (iTunes/Apple TV)
          'video/x-sgi-movie', // SGI/Movie
          'video/x-mpeg', // MPEG
          'video/x-mpeg2', // MPEG-2
          'video/vnd.mpegurl', // MPU/M3U8
          'video/x-ms-asf', // ASF
          'video/x-ms-asf-plugin',
          'video/x-ms-wax', // WAX
          'video/x-ms-wvx', // WVX
          'video/x-msvideo', // AVI
          'video/x-avi', // AVI ( alternate)
          'video/avi',
          'video/x-nv', // nVidia video
          'video/x-qtc', // QTC
          'video/x-smv', // SMV
          'video/x-matroska', // MKV
          'video/x-matroska-3d', // 3D MKV
          'video/webm', // WebM (VP8/VP9)
          'video/webm-vp9', // WebM VP9
          'video/ogg', // OGV (Ogg Theora)
          'video/ogv',
          // ===== 专业/广播视频格式 =====
          'video/divx', // DivX
          'video/x-divx',
          'video/vnd.divx',
          'video/x-xvid', // Xvid
          'video/x-vid',
          'video/x264', // H.264
          'video/h264',
          'video/h264-viva',
          'video/h264-rtsp',
          'video/x-h264',
          'video/x-red', // RealMedia
          'video/x-pn-realvideo',
          'video/vnd.rn-realvideo',
          'video/vnd.rn-realmedia',
          // ===== 移动/流媒体视频格式 =====
          'video/iso.segment', // HLS
          'application/vnd.apple.mpegurl', // M3U8
          'application/x-mpegurl',
          'application/vnd.ms-sstr+xml', // Smooth Streaming
          'application/dash+xml', // DASH
          // ===== 其他视频格式 =====
          'video/x-mjpeg', // MJPEG
          'video/x-mjpg',
          'video/x-unknown', // 未知格式
          'video/*', // 允许所有视频类型 (备用)
          // ===== 音频 =====
          'audio/aac',
          'audio/amr',
          'audio/flac',
          'audio/mp4',
          'audio/m4a',
          'audio/mpeg',
          'audio/mp3',
          'audio/ogg',
          'audio/opus',
          'audio/wav',
          'audio/x-ms-wma',
          'audio/webm',
          // ===== 文档 =====
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
          'application/rtf',
          'text/plain',
          'text/markdown',
          'text/csv',
          // ===== 压缩文件 =====
          'application/zip',
          'application/x-zip-compressed',
          'application/x-rar-compressed',
          'application/vnd.rar',
          'application/x-7z-compressed',
          'application/x-tar',
          'application/gzip',
          'application/x-gzip',
          'application/x-bzip2',
          'application/x-xz',
          // ===== 其他 =====
          'application/json',
          'application/xml',
          'text/xml',
          'application/octet-stream', // 通用二进制
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
