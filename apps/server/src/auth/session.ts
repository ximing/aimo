import jwt from 'jsonwebtoken';

import { config } from '../config/config.js';

import type { Response } from 'express';

export const SESSION_COOKIE = 'aimo_token';
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function cookieBase() {
  return {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
}

/** Issues the existing Aimo session cookie. Callers that redirect must drop the returned string. */
export function issueSession(response: Response, uid: string): string {
  const token = jwt.sign({ uid }, config.jwt.secret, { expiresIn: '90d' });
  response.cookie(SESSION_COOKIE, token, {
    ...cookieBase(),
    maxAge: NINETY_DAYS_MS,
  });
  return token;
}

export function clearSession(response: Response): void {
  response.clearCookie(SESSION_COOKIE, cookieBase());
}
