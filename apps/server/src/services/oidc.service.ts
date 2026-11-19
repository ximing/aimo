import { randomBytes, randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  errors,
  jwtVerify,
  type JWTPayload,
} from 'jose';
import jwt from 'jsonwebtoken';
import { Service } from 'typedi';

import { issueSession } from '../auth/session.js';
import {
  allowedAlgs,
  audienceIncludes,
  codeChallengeS256,
  decideEmail,
  displayNameFromClaims,
  endpointAllowed,
  idTokenAccepts,
  isSyntheticEmail,
  keycloakPasswordCredential,
  personNames,
  realmOf,
  resolveOidcConfig,
  sanitizeReturnTo,
  stateMatches,
  syntheticEmail,
  LOGIN_PATH,
  OIDC_PREFIX,
  SETTINGS_PATH,
  type OidcConfig,
  type OidcErrorCode,
  type OidcEnv,
} from '../auth/oidc-logic.js';
import { config } from '../config/config.js';
import { getDatabase } from '../db/connection.js';
import { oidcIdentities } from '../db/schema/oidc-identities.js';
import { logger } from '../utils/logger.js';

import { UserService } from './user.service.js';

import type { User } from '../db/schema/users.js';
import type { Request, Response } from 'express';

export const OIDC_COOKIE = 'aimo_oidc';
const COOKIE_TTL_SECONDS = 600;
const DISCOVERY_TTL_MS = 60 * 60 * 1000;

const EMAIL_EXISTS = '该邮箱已存在，请使用统一账号登录';
const PROVISION_FAILED = '暂时无法开通统一账号，请稍后再试';

type Discovery = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  id_token_signing_alg_values_supported?: string[];
};

type Tx = {
  state: string;
  nonce: string;
  verifier: string;
  mode: 'login' | 'bind';
  returnTo: string;
  iat: number;
};

export class OidcProvisionError extends Error {
  constructor(
    readonly status: 409 | 503,
    message: string
  ) {
    super(message);
  }
}

function oidcEnv(): OidcEnv {
  return {
    NODE_ENV: config.env,
    WEB_ORIGIN: config.web.origin,
    OIDC_ISSUER: config.oidc.issuer,
    OIDC_CLIENT_ID: config.oidc.clientId,
    OIDC_CLIENT_SECRET: config.oidc.clientSecret,
    OIDC_REDIRECT_URI: config.oidc.redirectUri,
    OIDC_AUDIENCE: config.oidc.audience,
    OIDC_SCOPES: config.oidc.scopes,
  };
}

export function logOidcStartup(): void {
  const resolved = resolveOidcConfig(oidcEnv());
  if (resolved.enabled) {
    logger.info(
      `oidc enabled host=${resolved.config.issuerHost} audience=${resolved.config.audience} provision=${Boolean(config.oidc.adminUser && config.oidc.adminPassword)}`
    );
    return;
  }
  if (resolved.error) {
    logger.error(`oidc disabled missing=${resolved.missing.join(',')}`);
    return;
  }
  logger.info('oidc disabled');
}

@Service()
export class OidcService {
  private discoveryCache: { issuer: string; doc: Discovery; at: number } | null = null;
  private readonly jwksByIssuer = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
  private adminToken: { value: string; exp: number } | null = null;

  constructor(private userService: UserService) {}

  status(): { enabled: boolean } {
    return { enabled: this.enabledConfig() !== null };
  }

  async account(uid: string): Promise<{
    enabled: boolean;
    linked: boolean;
    hasPassword: boolean;
  }> {
    const cfg = this.enabledConfig();
    const user = await this.userService.findUserByUid(uid);
    if (!user) return { enabled: cfg !== null, linked: false, hasPassword: false };
    let linked = false;
    if (cfg) {
      const db = getDatabase();
      const rows = await db
        .select({ id: oidcIdentities.id })
        .from(oidcIdentities)
        .where(and(eq(oidcIdentities.userId, uid), eq(oidcIdentities.issuer, cfg.issuer)))
        .limit(1);
      linked = rows.length > 0;
    }
    return { enabled: cfg !== null, linked, hasPassword: user.password != null };
  }

  async begin(
    request: Request,
    response: Response,
    mode: 'login' | 'bind',
    returnRaw: string | undefined
  ): Promise<string> {
    const cfg = this.enabledConfig();
    const fallback = mode === 'bind' ? SETTINGS_PATH : LOGIN_PATH;
    if (!cfg) return this.web(fallback);
    if (mode === 'bind') {
      const current = await this.sessionUser(request);
      if (!current) return this.failure('bind', 'OIDC_BIND_SESSION');
    }
    let doc: Discovery;
    try {
      doc = await this.discovery(cfg);
    } catch (err) {
      this.logEnd(cfg, {
        oidcError: 'OIDC_UNAVAILABLE',
        reason:
          err instanceof Error && err.message === 'issuer_mismatch'
            ? 'issuer_mismatch'
            : 'discovery',
      });
      return this.failure(mode, 'OIDC_UNAVAILABLE');
    }
    const tx: Tx = {
      state: randomBytes(32).toString('base64url'),
      nonce: randomBytes(32).toString('base64url'),
      verifier: randomBytes(32).toString('base64url'),
      mode,
      returnTo:
        sanitizeReturnTo(returnRaw, config.web.origin) || (mode === 'bind' ? SETTINGS_PATH : '/'),
      iat: Math.floor(Date.now() / 1000),
    };
    if (mode === 'bind' && !returnRaw) tx.returnTo = SETTINGS_PATH;
    this.writeCookie(response, tx);
    return this.authorizeUrl(doc, cfg, tx);
  }

  async complete(request: Request, response: Response): Promise<string> {
    const tx = this.readTx(request);
    this.clearCookie(response);
    const cfg = this.enabledConfig();
    const mode = tx?.mode ?? 'login';
    if (!cfg) return this.web(LOGIN_PATH);
    const query = request.query as { code?: string; state?: string; error?: string };
    const fail = (code: OidcErrorCode) => {
      this.logEnd(cfg, { oidcError: code, mode });
      return this.failure(mode, code);
    };
    if (!tx) return fail('OIDC_STATE');
    if (query.error) return fail('OIDC_DENIED');
    if (!stateMatches(tx.state, typeof query.state === 'string' ? query.state : undefined)) {
      return fail('OIDC_STATE');
    }
    if (typeof query.code !== 'string' || query.code.length === 0 || query.code.length > 2048) {
      return fail('OIDC_DENIED');
    }

    let doc: Discovery;
    try {
      doc = await this.discovery(cfg);
    } catch (err) {
      this.logEnd(cfg, {
        oidcError: 'OIDC_UNAVAILABLE',
        mode,
        reason:
          err instanceof Error && err.message === 'issuer_mismatch'
            ? 'issuer_mismatch'
            : 'discovery',
      });
      return this.failure(mode, 'OIDC_UNAVAILABLE');
    }
    const tokens = await this.exchange(doc, cfg, query.code, tx.verifier);
    if ('error' in tokens) return fail(tokens.error);
    const access = await this.verifyToken(tokens.access, doc, cfg, cfg.audience);
    if ('error' in access) return fail(access.error);
    const sub = access.payload.sub;
    if (typeof sub !== 'string' || sub.length === 0) return fail('OIDC_SUBJECT');
    if (!audienceIncludes(access.payload.aud, cfg.audience)) return fail('OIDC_AUDIENCE');
    const id = await this.verifyToken(tokens.id, doc, cfg, cfg.clientId);
    if ('error' in id) return fail(id.error);
    const idError = idTokenAccepts({
      aud: id.payload.aud,
      clientId: cfg.clientId,
      nonce: id.payload.nonce,
      expectedNonce: tx.nonce,
      sub: id.payload.sub,
      accessSub: sub,
    });
    if (idError) return fail(idError);

    if (mode === 'bind') {
      const current = await this.sessionUser(request);
      if (!current) return fail('OIDC_BIND_SESSION');
      const linked = await this.bindIdentity(cfg, sub, current);
      if ('error' in linked) return fail(linked.error);
      this.logEnd(cfg, { oidcError: null, mode, jit: false });
      return this.finish(response, linked.user, tx.returnTo);
    }
    const logged = await this.loginIdentity(cfg, sub, id.payload);
    if ('error' in logged) return fail(logged.error);
    this.logEnd(cfg, { oidcError: null, mode, jit: logged.jit });
    return this.finish(response, logged.user, tx.returnTo);
  }

  async assertEmailAvailable(email: string): Promise<void> {
    const cfg = this.enabledConfig();
    if (!cfg) return;
    if (!this.adminReady()) throw new OidcProvisionError(503, PROVISION_FAILED);
    let matches: Array<{ id: string }>;
    try {
      matches = await this.keycloakUsersByEmail(cfg, email);
    } catch {
      throw new OidcProvisionError(503, PROVISION_FAILED);
    }
    if (matches.length > 0) throw new OidcProvisionError(409, EMAIL_EXISTS);
  }

  async provisionRegistration(user: User, passwordHash: string): Promise<void> {
    const cfg = this.enabledConfig();
    if (!cfg) return;
    if (!this.adminReady()) throw new OidcProvisionError(503, PROVISION_FAILED);
    const credential = keycloakPasswordCredential(passwordHash);
    if (!credential || !user.email) throw new OidcProvisionError(503, PROVISION_FAILED);
    const { origin, realm } = realmOf(cfg.issuer);
    const names = personNames(user.nickname, user.email);
    let token: string;
    try {
      token = await this.adminAccessToken(origin);
    } catch {
      throw new OidcProvisionError(503, PROVISION_FAILED);
    }
    const response = await this.fetchJson(
      `${origin}/admin/realms/${encodeURIComponent(realm)}/users`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          username: user.email,
          email: user.email,
          emailVerified: true,
          enabled: true,
          firstName: names.firstName,
          lastName: names.lastName,
          attributes: { aimo_user_id: [user.uid] },
          credentials: [
            {
              type: 'password',
              temporary: false,
              secretData: credential.secretData,
              credentialData: credential.credentialData,
            },
          ],
        }),
      },
      10_000
    );
    if (response.status === 409) throw new OidcProvisionError(409, EMAIL_EXISTS);
    if (response.status !== 201 && response.status !== 204) {
      throw new OidcProvisionError(503, PROVISION_FAILED);
    }
    const location = response.headers.get('location') ?? '';
    const sub = location.replace(/\/$/, '').split('/').pop() ?? '';
    if (!sub) throw new OidcProvisionError(503, PROVISION_FAILED);
    try {
      await getDatabase()
        .insert(oidcIdentities)
        .values({ id: randomUUID(), userId: user.uid, issuer: cfg.issuer, sub });
    } catch (err) {
      await this.fetchJson(
        `${origin}/admin/realms/${encodeURIComponent(realm)}/users/${encodeURIComponent(sub)}`,
        { method: 'DELETE', headers: { authorization: `Bearer ${token}` } },
        10_000
      ).catch(() => undefined);
      throw err;
    }
  }

  private enabledConfig(): OidcConfig | null {
    const resolved = resolveOidcConfig(oidcEnv());
    return resolved.enabled ? resolved.config : null;
  }

  private adminReady(): boolean {
    return Boolean(config.oidc.adminUser && config.oidc.adminPassword);
  }

  private web(path: string): string {
    return `${config.web.origin}${path}`;
  }

  private failure(mode: 'login' | 'bind', code?: OidcErrorCode): string {
    if (!code) return this.web(mode === 'bind' ? SETTINGS_PATH : LOGIN_PATH);
    if (code === 'OIDC_BIND_SESSION') return this.web(`${LOGIN_PATH}?oidc_error=OIDC_BIND_SESSION`);
    if (mode === 'bind' || code === 'OIDC_IDENTITY_TAKEN' || code === 'OIDC_IDENTITY_EXISTS') {
      return this.web(`${SETTINGS_PATH}?oidc_error=${code}`);
    }
    return this.web(`${LOGIN_PATH}?oidc_error=${code}`);
  }

  private writeCookie(response: Response, tx: Tx): void {
    response.cookie(OIDC_COOKIE, JSON.stringify(tx), {
      httpOnly: true,
      path: OIDC_PREFIX,
      sameSite: 'lax',
      secure: config.env === 'production',
      maxAge: COOKIE_TTL_SECONDS * 1000,
    });
  }

  private clearCookie(response: Response): void {
    response.clearCookie(OIDC_COOKIE, {
      httpOnly: true,
      path: OIDC_PREFIX,
      sameSite: 'lax',
      secure: config.env === 'production',
    });
  }

  private readTx(request: Request): Tx | null {
    const raw = request.cookies?.[OIDC_COOKIE];
    if (typeof raw !== 'string' || raw.length === 0) return null;
    try {
      const tx = JSON.parse(raw) as Tx;
      if (tx.mode !== 'login' && tx.mode !== 'bind') return null;
      if (!tx.state || !tx.nonce || !tx.verifier || typeof tx.iat !== 'number') return null;
      if (Date.now() / 1000 - tx.iat > COOKIE_TTL_SECONDS) return null;
      return tx;
    } catch {
      return null;
    }
  }

  private async sessionUser(request: Request): Promise<User | null> {
    const token = request.cookies?.aimo_token;
    if (typeof token !== 'string' || token.length === 0) return null;
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as { uid?: string };
      if (!decoded.uid) return null;
      return await this.userService.findUserByUid(decoded.uid);
    } catch {
      return null;
    }
  }

  private async fetchJson(
    url: string,
    init: RequestInit,
    timeoutMs: number
  ): Promise<globalThis.Response> {
    return fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(timeoutMs) });
  }

  private async discovery(cfg: OidcConfig): Promise<Discovery> {
    if (
      this.discoveryCache &&
      this.discoveryCache.issuer === cfg.issuer &&
      Date.now() - this.discoveryCache.at < DISCOVERY_TTL_MS
    ) {
      return this.discoveryCache.doc;
    }
    const response = await this.fetchJson(
      `${cfg.issuer}/.well-known/openid-configuration`,
      { headers: { accept: 'application/json' } },
      5000
    );
    if (!response.ok) throw new Error(`discovery ${response.status}`);
    const doc = (await response.json()) as Discovery;
    if (doc.issuer !== cfg.issuer) throw new Error('issuer_mismatch');
    for (const endpoint of [doc.authorization_endpoint, doc.token_endpoint, doc.jwks_uri]) {
      if (!endpointAllowed(endpoint, cfg.issuer)) throw new Error('endpoint');
    }
    this.discoveryCache = { issuer: cfg.issuer, doc, at: Date.now() };
    return doc;
  }

  private jwks(doc: Discovery) {
    const cached = this.jwksByIssuer.get(doc.jwks_uri);
    if (cached) return cached;
    const set = createRemoteJWKSet(new URL(doc.jwks_uri), {
      timeoutDuration: 5000,
      cooldownDuration: 30_000,
      cacheMaxAge: 600_000,
    });
    this.jwksByIssuer.set(doc.jwks_uri, set);
    return set;
  }

  private mapVerifyError(err: unknown): OidcErrorCode {
    if (err instanceof errors.JWTExpired) return 'OIDC_STATE';
    if (err instanceof errors.JWTClaimValidationFailed) {
      if (err.claim === 'aud') return 'OIDC_AUDIENCE';
      if (err.claim === 'exp' || err.claim === 'nbf') return 'OIDC_STATE';
      if (err.claim === 'iss') return 'OIDC_UNAVAILABLE';
    }
    return 'OIDC_AUDIENCE';
  }

  private async verifyToken(
    token: string,
    doc: Discovery,
    cfg: OidcConfig,
    audience: string
  ): Promise<{ payload: JWTPayload } | { error: OidcErrorCode }> {
    let alg: string | undefined;
    try {
      alg = decodeProtectedHeader(token).alg;
    } catch {
      return { error: 'OIDC_AUDIENCE' };
    }
    const algorithms = allowedAlgs(doc.id_token_signing_alg_values_supported);
    if (!alg || !algorithms.includes(alg)) return { error: 'OIDC_AUDIENCE' };
    try {
      const verified = await jwtVerify(token, this.jwks(doc), {
        issuer: cfg.issuer,
        audience,
        algorithms,
        clockTolerance: 60,
      });
      return { payload: verified.payload };
    } catch (err) {
      return { error: this.mapVerifyError(err) };
    }
  }

  private async exchange(
    doc: Discovery,
    cfg: OidcConfig,
    code: string,
    verifier: string
  ): Promise<{ access: string; id: string } | { error: OidcErrorCode }> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: cfg.redirectUri,
      client_id: cfg.clientId,
      code_verifier: verifier,
      client_secret: cfg.clientSecret,
    });
    let response: globalThis.Response;
    try {
      response = await this.fetchJson(
        doc.token_endpoint,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            accept: 'application/json',
          },
          body,
        },
        10_000
      );
    } catch {
      return { error: 'OIDC_UNAVAILABLE' };
    }
    if (!response.ok) {
      let error = '';
      try {
        error = String(((await response.json()) as { error?: string }).error ?? '');
      } catch {
        error = '';
      }
      if (error === 'invalid_grant' || error === 'access_denied') return { error: 'OIDC_DENIED' };
      return { error: 'OIDC_UNAVAILABLE' };
    }
    const tokens = (await response.json()) as { access_token?: string; id_token?: string };
    if (!tokens.access_token || !tokens.id_token) return { error: 'OIDC_DENIED' };
    return { access: tokens.access_token, id: tokens.id_token };
  }

  private finish(response: Response, user: User, returnTo: string): string {
    issueSession(response, user.uid);
    return this.web(returnTo);
  }

  private async loginIdentity(
    cfg: OidcConfig,
    sub: string,
    claims: JWTPayload
  ): Promise<{ user: User; jit: boolean } | { error: OidcErrorCode }> {
    const db = getDatabase();
    const existing = await db
      .select()
      .from(oidcIdentities)
      .where(and(eq(oidcIdentities.issuer, cfg.issuer), eq(oidcIdentities.sub, sub)))
      .limit(1);
    const found = existing[0];
    if (found) {
      const user = await this.userService.findUserByUid(found.userId);
      if (!user) return { error: 'OIDC_UNAVAILABLE' };
      return { user, jit: false };
    }
    const emailRaw = claims.email;
    const taken =
      typeof emailRaw === 'string' && emailRaw.trim().length > 0
        ? (await this.userService.findUserByEmail(emailRaw)) !== null
        : false;
    const decision = decideEmail(emailRaw, taken);
    if (decision.kind === 'invalid') return { error: 'OIDC_EMAIL_INVALID' };
    if (decision.kind === 'conflict') return { error: 'OIDC_EMAIL_CONFLICT' };
    const email = decision.kind === 'use' ? decision.email : syntheticEmail(cfg.issuer, sub);
    if (isSyntheticEmail(email) && (await this.userService.findUserByEmail(email))) {
      return { error: 'OIDC_EMAIL_CONFLICT' };
    }
    const nickname = displayNameFromClaims(claims.name, claims.preferred_username);
    try {
      const user = await this.userService.createUser({
        uid: '',
        email,
        password: null,
        salt: null,
        nickname: nickname ?? undefined,
        status: 1,
      });
      try {
        await db.insert(oidcIdentities).values({
          id: randomUUID(),
          userId: user.uid,
          issuer: cfg.issuer,
          sub,
        });
      } catch (err) {
        await this.userService.deleteCreatedUser(user.uid);
        if (!this.isDuplicate(err)) throw err;
        const raced = await db
          .select()
          .from(oidcIdentities)
          .where(and(eq(oidcIdentities.issuer, cfg.issuer), eq(oidcIdentities.sub, sub)))
          .limit(1);
        if (raced[0]) {
          const winner = await this.userService.findUserByUid(raced[0].userId);
          if (winner) return { user: winner, jit: false };
        }
        return { error: 'OIDC_EMAIL_CONFLICT' };
      }
      return { user, jit: true };
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        return { error: 'OIDC_EMAIL_CONFLICT' };
      }
      throw err;
    }
  }

  private async bindIdentity(
    cfg: OidcConfig,
    sub: string,
    current: User
  ): Promise<{ user: User } | { error: OidcErrorCode }> {
    const db = getDatabase();
    const bySub = await db
      .select()
      .from(oidcIdentities)
      .where(and(eq(oidcIdentities.issuer, cfg.issuer), eq(oidcIdentities.sub, sub)))
      .limit(1);
    if (bySub[0] && bySub[0].userId !== current.uid) return { error: 'OIDC_IDENTITY_TAKEN' };
    if (bySub[0]) return { user: current };
    const byUser = await db
      .select()
      .from(oidcIdentities)
      .where(and(eq(oidcIdentities.userId, current.uid), eq(oidcIdentities.issuer, cfg.issuer)))
      .limit(1);
    if (byUser[0]) return { error: 'OIDC_IDENTITY_EXISTS' };
    await db.insert(oidcIdentities).values({
      id: randomUUID(),
      userId: current.uid,
      issuer: cfg.issuer,
      sub,
    });
    return { user: current };
  }

  private authorizeUrl(doc: Discovery, cfg: OidcConfig, tx: Tx): string {
    const url = new URL(doc.authorization_endpoint);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', cfg.clientId);
    url.searchParams.set('redirect_uri', cfg.redirectUri);
    url.searchParams.set('scope', cfg.scopes);
    url.searchParams.set('state', tx.state);
    url.searchParams.set('nonce', tx.nonce);
    url.searchParams.set('code_challenge', codeChallengeS256(tx.verifier));
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
  }

  private async adminAccessToken(origin: string): Promise<string> {
    if (this.adminToken && this.adminToken.exp > Date.now() + 30_000) return this.adminToken.value;
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: config.oidc.adminUser ?? '',
      password: config.oidc.adminPassword ?? '',
    });
    const response = await this.fetchJson(
      `${origin}/realms/master/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          accept: 'application/json',
        },
        body,
      },
      10_000
    );
    if (!response.ok) throw new Error('admin token');
    const json = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) throw new Error('admin token');
    this.adminToken = {
      value: json.access_token,
      exp: Date.now() + (json.expires_in ?? 60) * 1000,
    };
    return json.access_token;
  }

  private async keycloakUsersByEmail(
    cfg: OidcConfig,
    email: string
  ): Promise<Array<{ id: string }>> {
    const { origin, realm } = realmOf(cfg.issuer);
    const token = await this.adminAccessToken(origin);
    const query = new URLSearchParams({ email, exact: 'true' });
    const response = await this.fetchJson(
      `${origin}/admin/realms/${encodeURIComponent(realm)}/users?${query}`,
      { headers: { authorization: `Bearer ${token}`, accept: 'application/json' } },
      10_000
    );
    if (!response.ok) throw new Error(`lookup ${response.status}`);
    const rows = (await response.json()) as Array<{ id?: string }>;
    return rows.filter((row): row is { id: string } => typeof row.id === 'string');
  }

  private logEnd(cfg: OidcConfig, fields: Record<string, unknown>): void {
    const mode = fields.mode ?? '';
    const oidcError = fields.oidcError ?? '';
    const reason = fields.reason ?? '';
    const jit = fields.jit ?? '';
    logger.info(
      `oidc result host=${cfg.issuerHost} mode=${String(mode)} error=${String(oidcError)} reason=${String(reason)} jit=${String(jit)}`
    );
  }

  private isDuplicate(err: unknown): boolean {
    const seen = new Set<unknown>();
    let current: unknown = err;
    while (current && typeof current === 'object' && !seen.has(current)) {
      seen.add(current);
      const row = current as { code?: string; errno?: number; cause?: unknown };
      if (row.code === 'ER_DUP_ENTRY' || row.errno === 1062) return true;
      current = row.cause;
    }
    return false;
  }
}
