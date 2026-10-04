import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const TOKEN_URL = 'https://oauth-login.cloud.huawei.com/oauth2/v3/token';

export type HuaweiPushTarget = { kind: 'home' } | { kind: 'review' } | { kind: 'memo'; id: string };

export type HuaweiSendResult =
  | { ok: true }
  | { ok: false; permanent: boolean; invalidToken: boolean; error: string };

export interface HuaweiTransport {
  postForm(url: string, body: string): Promise<{ httpStatus: number; json: unknown }>;
  postJson(
    url: string,
    headers: Record<string, string>,
    body: unknown
  ): Promise<{ httpStatus: number; json: unknown }>;
}

export interface HuaweiAppLink {
  packageName: string;
  scheme: string;
}

let transport: HuaweiTransport | undefined;
let cachedToken: { value: string; expiresAt: number } | undefined;

export function setHuaweiTransport(next: HuaweiTransport | undefined): void {
  transport = next;
  cachedToken = undefined;
}

export function huaweiPushConfigured(): boolean {
  return Boolean(config.huawei.clientId && config.huawei.clientSecret);
}

function safeAppLink(): HuaweiAppLink {
  const packageName = /^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/.test(config.huawei.packageName)
    ? config.huawei.packageName
    : 'com.delu.aimo';
  const scheme = /^[a-zA-Z][a-zA-Z0-9+.-]*$/.test(config.huawei.scheme)
    ? config.huawei.scheme
    : 'aimoapp';
  return { packageName, scheme };
}

function pathOf(target: HuaweiPushTarget): string {
  if (target.kind === 'review') return 'review';
  if (target.kind === 'memo' && /^[a-zA-Z0-9_-]+$/.test(target.id)) return `memo/${target.id}`;
  return 'home';
}

/** Intent URI shown by Huawei. Tapping it opens aimoapp://… in the Android app. */
export function huaweiClickIntent(
  target: HuaweiPushTarget,
  app: HuaweiAppLink = safeAppLink()
): string {
  return `intent://${pathOf(target)}#Intent;scheme=${app.scheme};package=${app.packageName};launchFlags=0x14000000;end`;
}

export function huaweiMessageBody(
  title: string,
  body: string,
  target: HuaweiPushTarget,
  token: string,
  app?: HuaweiAppLink
): Record<string, unknown> {
  return {
    validate_only: false,
    message: {
      token: [token],
      android: {
        category: 'WORK',
        notification: {
          title: title.slice(0, 1024),
          body: body.slice(0, 1024),
          foreground_show: true,
          click_action: {
            type: 1,
            intent: huaweiClickIntent(target, app),
          },
        },
      },
    },
  };
}

function codeOf(json: unknown): string | undefined {
  if (typeof json !== 'object' || json === null || !('code' in json)) return undefined;
  const value = json.code;
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
}

function messageOf(json: unknown): string {
  if (typeof json !== 'object' || json === null || !('msg' in json)) return '华为推送失败';
  return typeof json.msg === 'string' ? json.msg : '华为推送失败';
}

async function defaultTransport(): Promise<HuaweiTransport> {
  return {
    async postForm(url, body) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      const text = await response.text();
      return { httpStatus: response.status, json: JSON.parse(text) as unknown };
    },
    async postJson(url, headers, body) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
      const text = await response.text();
      return { httpStatus: response.status, json: JSON.parse(text) as unknown };
    },
  };
}

async function accessToken(client: HuaweiTransport): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) return cachedToken.value;
  const clientId = config.huawei.clientId || 'test';
  const clientSecret = config.huawei.clientSecret || 'test';
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  }).toString();
  const response = await client.postForm(TOKEN_URL, body);
  const json = response.json;
  const token =
    typeof json === 'object' &&
    json !== null &&
    'access_token' in json &&
    typeof json.access_token === 'string'
      ? json.access_token
      : '';
  const expiresIn =
    typeof json === 'object' &&
    json !== null &&
    'expires_in' in json &&
    typeof json.expires_in === 'number'
      ? json.expires_in
      : 0;
  if (token === '' || response.httpStatus !== 200) throw new Error('华为推送鉴权失败');
  cachedToken = { value: token, expiresAt: now + Math.max(60, expiresIn - 60) * 1000 };
  return token;
}

export async function sendHuaweiPush(input: {
  token: string;
  title: string;
  body: string;
  target: HuaweiPushTarget;
}): Promise<HuaweiSendResult> {
  if (!huaweiPushConfigured() && transport === undefined) {
    return { ok: false, permanent: false, invalidToken: false, error: '华为推送未配置' };
  }
  const client = transport ?? (await defaultTransport());
  try {
    const bearer = await accessToken(client);
    const appId = config.huawei.clientId || 'test';
    const response = await client.postJson(
      `https://push-api.cloud.huawei.com/v1/${appId}/messages:send`,
      { Authorization: `Bearer ${bearer}` },
      huaweiMessageBody(input.title, input.body, input.target, input.token)
    );
    const code = codeOf(response.json);
    if (code === '80000000') return { ok: true };
    const invalidToken = code === '80300007';
    const permanent = invalidToken || code === '80100003';
    logger.warn('huawei.push.fail', { code, permanent });
    return {
      ok: false,
      permanent,
      invalidToken,
      error: messageOf(response.json).slice(0, 500),
    };
  } catch (error) {
    logger.warn('huawei.push.error', { err: String(error) });
    return { ok: false, permanent: false, invalidToken: false, error: '华为推送网络错误' };
  }
}
