import { logger } from '../utils/logger.js';

// 已知的不安全 JWT_SECRET 占位符（.env.example / 旧文档中流传的默认值）
const INSECURE_JWT_SECRETS = new Set([
  'your-secret-key-change-in-production',
  'your-secret-key-change-this-in-production',
  'your-super-secret-key',
  'your-super-secret-key-at-least-32-characters-long',
  'please-change-this-to-a-random-string',
]);

/**
 * 启动时的安全配置校验
 * 生产模式下 JWT_SECRET 缺失、为已知占位符或长度不足时拒绝启动，避免带默认密钥暴露公网
 */
export function validateSecurityConfig(): void {
  const secret = process.env.JWT_SECRET || '';
  const isProduction = process.env.NODE_ENV === 'production';
  const insecureReason = !secret
    ? '未设置 (JWT_SECRET is missing)'
    : INSECURE_JWT_SECRETS.has(secret)
      ? '仍为模板中的占位符 (still a placeholder)'
      : secret.length < 32
        ? `长度不足 32 字符 (当前 ${secret.length} 字符)`
        : null;

  if (!insecureReason) {
    return;
  }

  const message = `JWT_SECRET 配置不安全: ${insecureReason}。请使用随机密钥，例如: openssl rand -base64 32`;

  if (isProduction) {
    throw new Error(`拒绝启动（生产环境）: ${message}`);
  }
  logger.warn(`⚠️ ${message}（开发环境仅警告，生产环境将拒绝启动）`);
}
