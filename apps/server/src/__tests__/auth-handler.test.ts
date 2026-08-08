/**
 * Regression test: unauthenticated page/static requests must pass through to
 * the SPA (which handles login redirect client-side). Only /api requests
 * should be rejected with 401 JSON.
 */
import type { NextFunction, Request, Response } from 'express';

// config/env.ts uses import.meta which breaks under the CJS test transform;
// the modules below are not exercised by these tests, so stub them out.
jest.mock('../config/config.js', () => ({
  config: { jwt: { secret: 'test-secret-at-least-32-characters-long' } },
}));
jest.mock('../services/user.service.js', () => ({ UserService: class {} }));
jest.mock('../services/user-token.service.js', () => ({ UserTokenService: class {} }));
jest.mock('../utils/logger.js', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import { authHandler } from '../middlewares/auth-handler.js';

const createMockRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const createMockReq = (path: string): Request =>
  ({
    path,
    cookies: {},
    headers: {},
  }) as unknown as Request;

describe('authHandler', () => {
  it.each(['/', '/login', '/home', '/assets/index-abc123.js', '/favicon.svg'])(
    'passes through unauthenticated non-API request: %s',
    async (path) => {
      const res = createMockRes();
      const next: NextFunction = jest.fn();

      await authHandler(createMockReq(path), res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    }
  );

  it('returns 401 for unauthenticated API request', async () => {
    const res = createMockRes();
    const next: NextFunction = jest.fn();

    await authHandler(createMockReq('/api/v1/memos'), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Authentication required',
    });
  });

  it('passes through excluded API paths without token', async () => {
    const res = createMockRes();
    const next: NextFunction = jest.fn();

    await authHandler(createMockReq('/api/v1/auth/login'), res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
