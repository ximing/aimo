import type { AllVersionsResponseDto } from '@aimo/dto';
import request from '../utils/request';

/**
 * Get server version
 */
export const getVersion = () => {
  return request.get<unknown, { code: number; msg: string; data: { version: string } }>(
    '/api/v1/system/open/version'
  );
};

/**
 * Get latest app versions from GitHub releases
 * Public endpoint - no authentication required
 */
export const getAppVersions = () => {
  return request.get<unknown, { code: number; msg: string; data: AllVersionsResponseDto }>(
    '/api/v1/system/open/app-versions'
  );
};

/**
 * Get public system configuration
 * Public endpoint - no authentication required
 */
export const getSystemConfig = () => {
  return request.get<unknown, { code: number; msg: string; data: { allowRegistration: boolean } }>(
    '/api/v1/system/open/config'
  );
};
