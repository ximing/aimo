import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { env } from "@/config/env.js";
import OSS from "ali-oss";
import { join } from "path";

// 添加存储服务接口
interface StorageService {
  saveFile(file: any, filename: string): Promise<{ path: string; size: number }>;
}

// 本地存储实现
export class LocalStorage implements StorageService {
  async saveFile(file: any, filename: string) {
    // 使用配置的前缀构建存储路径
    const uploadDir = join(process.cwd(), env.STORAGE_LOCAL_PATH, env.STORAGE_PATH_PREFIX);
    await mkdir(uploadDir, { recursive: true });
    
    const filepath = join(uploadDir, filename);
    const writeStream = fs.createWriteStream(filepath);
    
    await pipeline(file.file, writeStream);
    
    // 构建访问URL时也使用前缀
    return {
      path: `/${env.STORAGE_PATH_PREFIX}/${filename}`,
      size: file.file.bytesRead
    };
  }
}

// 阿里云存储实现
export class AliyunStorage implements StorageService {
  private client: OSS;

  constructor() {
    this.client = new OSS({
      region: env.ALIYUN_OSS_REGION,
      accessKeyId: env.ALIYUN_ACCESS_KEY_ID!,
      accessKeySecret: env.ALIYUN_ACCESS_KEY_SECRET!,
      bucket: env.ALIYUN_OSS_BUCKET!,
    });
  }

  async saveFile(file: any, filename: string) {
    // 使用配置的前缀构建OSS路径
    const ossPath = `${env.STORAGE_PATH_PREFIX}/${filename}`;
    
    const result = await this.client.putStream(ossPath, file.file);
    
    return {
      path: result.name, // 返回完整的OSS URL
      size: file.file.bytesRead
    };
  }
}


// 获取存储服务实例
export function getStorageService(): StorageService {
  if (env.STORAGE_TYPE === 'aliyun') {
    return new AliyunStorage();
  }
  return new LocalStorage();
}