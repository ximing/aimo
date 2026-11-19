import {
  allowedAlgs,
  decideEmail,
  displayNameFromClaims,
  idTokenAccepts,
  keycloakPasswordCredential,
  personNames,
  redactOidcUrl,
  registrationNames,
  resolveOidcConfig,
  sanitizeReturnTo,
  stateMatches,
  syntheticEmail,
  type OidcEnv,
} from '../auth/oidc-logic.js';

const base: OidcEnv = {
  NODE_ENV: 'development',
  WEB_ORIGIN: 'http://localhost:5173',
};

const ready: OidcEnv = {
  ...base,
  OIDC_ISSUER: 'https://super-agent-auth.aimo.plus/realms/aimo-plus-prod',
  OIDC_CLIENT_ID: 'aimo',
  OIDC_CLIENT_SECRET: '1234567890abcdef',
  OIDC_REDIRECT_URI: 'http://localhost:5173/api/v1/auth/oidc/callback',
  OIDC_AUDIENCE: 'aimo-api',
};

describe('resolveOidcConfig', () => {
  it('stays off when every variable is empty', () => {
    expect(resolveOidcConfig(base)).toEqual({ enabled: false, error: false, missing: [] });
  });

  it('names the missing variables when only the issuer is set', () => {
    const resolved = resolveOidcConfig({ ...base, OIDC_ISSUER: ready.OIDC_ISSUER });
    expect(resolved.enabled).toBe(false);
    if (resolved.enabled) return;
    expect(resolved.error).toBe(true);
    expect(resolved.missing).toEqual(
      expect.arrayContaining([
        'OIDC_CLIENT_ID',
        'OIDC_CLIENT_SECRET',
        'OIDC_REDIRECT_URI',
        'OIDC_AUDIENCE',
      ])
    );
  });

  it('rejects a scope list that drops profile or asks for offline access', () => {
    for (const scopes of ['openid email', 'openid profile email offline_access']) {
      const resolved = resolveOidcConfig({ ...ready, OIDC_SCOPES: scopes });
      expect(resolved.enabled).toBe(false);
      if (resolved.enabled) continue;
      expect(resolved.missing).toContain('OIDC_SCOPES');
    }
  });

  it('rejects the shared client, the other audience, a foreign redirect, and http in production', () => {
    expect(resolveOidcConfig({ ...ready, OIDC_CLIENT_ID: 'super-agent-native' }).enabled).toBe(
      false
    );
    expect(resolveOidcConfig({ ...ready, OIDC_AUDIENCE: 'super-agent-api' }).enabled).toBe(false);
    expect(
      resolveOidcConfig({
        ...ready,
        OIDC_REDIRECT_URI: 'https://evil.example/api/v1/auth/oidc/callback',
      }).enabled
    ).toBe(false);
    expect(
      resolveOidcConfig({
        ...ready,
        NODE_ENV: 'production',
        WEB_ORIGIN: 'http://localhost:5173',
        OIDC_REDIRECT_URI: 'http://localhost:5173/api/v1/auth/oidc/callback',
      }).enabled
    ).toBe(false);
    expect(
      resolveOidcConfig({
        ...ready,
        OIDC_ISSUER: 'http://super-agent-auth.aimo.plus/realms/aimo-plus-prod',
      }).enabled
    ).toBe(false);
    expect(resolveOidcConfig({ ...ready, OIDC_CLIENT_SECRET: 'short' }).enabled).toBe(false);
  });

  it('enables a complete local config and a production config', () => {
    const local = resolveOidcConfig(ready);
    expect(local.enabled).toBe(true);
    if (!local.enabled) return;
    expect(local.config.scopes).toBe('openid profile email');
    expect(local.config.issuerHost).toBe('super-agent-auth.aimo.plus');
    expect(local.config.issuer).toBe('https://super-agent-auth.aimo.plus/realms/aimo-plus-prod');

    const production = resolveOidcConfig({
      NODE_ENV: 'production',
      WEB_ORIGIN: 'https://aimo.plus',
      OIDC_ISSUER: 'https://super-agent-auth.aimo.plus/realms/aimo-plus-prod/',
      OIDC_CLIENT_ID: 'aimo',
      OIDC_CLIENT_SECRET: '1234567890abcdef',
      OIDC_REDIRECT_URI: 'https://aimo.plus/api/v1/auth/oidc/callback',
      OIDC_AUDIENCE: 'aimo-api',
    });
    expect(production.enabled).toBe(true);
  });
});

describe('oidc helpers', () => {
  it('keeps an in-site return path and drops open redirects', () => {
    const origin = 'https://aimo.plus';
    expect(sanitizeReturnTo('/home?tab=1', origin)).toBe('/home?tab=1');
    expect(sanitizeReturnTo('//evil.example', origin)).toBe('/');
    expect(sanitizeReturnTo('https://aimo.plus/home', origin)).toBe('/');
    expect(sanitizeReturnTo('/home\\evil', origin)).toBe('/');
    expect(sanitizeReturnTo('/api/v1/auth/oidc/start', origin)).toBe('/');
    expect(sanitizeReturnTo('a'.repeat(513), origin)).toBe('/');
  });

  it('redacts callback query secrets and leaves other urls alone', () => {
    expect(redactOidcUrl('/api/v1/auth/oidc/callback?code=abc&state=def&ok=1')).toBe(
      '/api/v1/auth/oidc/callback?code=[redacted]&state=[redacted]&ok=1'
    );
    expect(redactOidcUrl('/api/v1/auth/login?code=abc')).toBe('/api/v1/auth/login?code=abc');
  });

  it('builds a stable synthetic address and truncates display names by code point', () => {
    const email = syntheticEmail('https://issuer.example', 'sub-1');
    expect(email.startsWith('oidc.')).toBe(true);
    expect(email.endsWith('@users.aimo.invalid')).toBe(true);
    expect(displayNameFromClaims(`名${'称'.repeat(200)}`, 'other')).toHaveLength(100);
    expect(displayNameFromClaims('  ', 'nick')).toBe('nick');
    expect(displayNameFromClaims('  ', '  ')).toBeNull();
  });

  it('decides email conflicts without attaching an identity', () => {
    expect(decideEmail(' A@B.com ', false)).toEqual({ kind: 'use', email: 'a@b.com' });
    expect(decideEmail('not-an-email', false).kind).toBe('invalid');
    expect(decideEmail('a@b.com', true).kind).toBe('conflict');
    expect(decideEmail('', false).kind).toBe('synthetic');
  });

  it('compares state by length first and allows only asymmetric algorithms', () => {
    expect(stateMatches('abc', 'abc')).toBe(true);
    expect(stateMatches('abc', 'ab')).toBe(false);
    expect(stateMatches('abc', 'abd')).toBe(false);
    expect(allowedAlgs(undefined)).toEqual(['RS256']);
    expect(allowedAlgs(['RS256', 'none', 'HS256'])).toEqual(['RS256']);
  });

  it('checks the id token audience, nonce, and subject', () => {
    expect(
      idTokenAccepts({
        aud: 'aimo',
        clientId: 'aimo',
        nonce: 'n',
        expectedNonce: 'n',
        sub: 'user',
        accessSub: 'user',
      })
    ).toBeNull();
    expect(
      idTokenAccepts({
        aud: 'aimo-api',
        clientId: 'aimo',
        nonce: 'n',
        expectedNonce: 'n',
        sub: 'user',
        accessSub: 'user',
      })
    ).toBe('OIDC_AUDIENCE');
  });

  it('splits a display name and refuses a bcrypt hash', () => {
    expect(personNames('Ada Lovelace', 'a@b.com')).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
    expect(registrationNames('<>@example.com')).toEqual({ firstName: '用户', lastName: '用户' });
    expect(keycloakPasswordCredential('$2b$10$abcdefghijklmnopqrstuv')).toBeNull();
  });
});
