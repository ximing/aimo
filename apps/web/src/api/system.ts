import request from '../utils/request';

/**
 * Get server version
 */
export const getVersion = () => {
  return request.get<unknown, { code: number; msg: string; data: { version: string } }>(
    '/api/v1/system/version'
  );
};
