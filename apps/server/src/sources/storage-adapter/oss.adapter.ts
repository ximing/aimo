import { S3StorageAdapter } from './s3.adapter.js';

/**
 * Alibaba OSS storage adapter for backups
 * Extends S3 adapter since OSS is S3-compatible
 */
export interface OSSAdapterConfig {
  bucket: string;
  prefix?: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
}

export class OSSStorageAdapter extends S3StorageAdapter {
  constructor(config: OSSAdapterConfig) {
    // Build OSS endpoint if not provided
    let endpoint = config.endpoint;
    if (!endpoint && config.region) {
      endpoint = `https://${config.bucket}.oss-${config.region}.aliyuncs.com`;
    }

    // Convert OSS config to S3 config format
    const s3Config = {
      bucket: config.bucket,
      prefix: config.prefix,
      region: config.region || 'cn-hangzhou',
      endpoint,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.accessKeySecret, // OSS uses accessKeySecret -> S3 secretAccessKey
    };

    super(s3Config);
    console.log(`OSS adapter initialized with bucket: ${config.bucket}, endpoint: ${endpoint}`);
  }
}
