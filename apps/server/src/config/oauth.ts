import { env } from './env.js';

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scope: string[];
  enabled: boolean;
}

interface OAuthProviders {
  github: OAuthConfig;
  google: OAuthConfig;
}

// Check if GitHub OAuth is configured
const isGithubEnabled = !!(
  env.GITHUB_CLIENT_ID &&
  env.GITHUB_CLIENT_SECRET &&
  env.API_URL
);

// Check if Google OAuth is configured
const isGoogleEnabled = !!(
  env.GOOGLE_CLIENT_ID &&
  env.GOOGLE_CLIENT_SECRET &&
  env.API_URL
);

export const oauthConfig: OAuthProviders = {
  github: {
    clientId: env.GITHUB_CLIENT_ID || '',
    clientSecret: env.GITHUB_CLIENT_SECRET || '',
    callbackUrl: `${env.API_URL || ''}/api/auth/github/callback`,
    scope: ['user:email'],
    enabled: isGithubEnabled,
  },
  google: {
    clientId: env.GOOGLE_CLIENT_ID || '',
    clientSecret: env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: `${env.API_URL || ''}/api/auth/google/callback`,
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    enabled: isGoogleEnabled,
  },
};

// OAuth state management
const stateStore = new Map<string, { provider: string; redirectUrl: string }>();

export function generateOAuthState(
  provider: string,
  redirectUrl: string
): string {
  const state = Math.random().toString(36).substring(2);
  stateStore.set(state, { provider, redirectUrl });
  return state;
}

export function verifyOAuthState(state: string) {
  const stateData = stateStore.get(state);
  stateStore.delete(state);
  return stateData;
}

// Helper functions for building OAuth URLs
export function getGithubAuthUrl(redirectUrl: string): string | null {
  if (!oauthConfig.github.enabled) return null;

  const state = generateOAuthState('github', redirectUrl);
  const params = new URLSearchParams({
    client_id: oauthConfig.github.clientId,
    redirect_uri: oauthConfig.github.callbackUrl,
    scope: oauthConfig.github.scope.join(' '),
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export function getGoogleAuthUrl(redirectUrl: string): string | null {
  if (!oauthConfig.google.enabled) return null;

  const state = generateOAuthState('google', redirectUrl);
  const params = new URLSearchParams({
    client_id: oauthConfig.google.clientId,
    redirect_uri: oauthConfig.google.callbackUrl,
    response_type: 'code',
    scope: oauthConfig.google.scope.join(' '),
    access_type: 'offline',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Error handling
export class OAuthError extends Error {
  constructor(
    message: string,
    public provider: string,
    public code: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}

// Get enabled providers
export function getEnabledProviders(): { github: boolean; google: boolean } {
  return {
    github: oauthConfig.github.enabled,
    google: oauthConfig.google.enabled,
  };
}

// Validation
export function validateOAuthConfig(provider: 'github' | 'google') {
  const errors: string[] = [];

  if (provider === 'github' && oauthConfig.github.enabled) {
    if (!env.GITHUB_CLIENT_ID) {
      errors.push('Missing GITHUB_CLIENT_ID');
    }
    if (!env.GITHUB_CLIENT_SECRET) {
      errors.push('Missing GITHUB_CLIENT_SECRET');
    }
    if (!env.API_URL) {
      errors.push('Missing API_URL for GitHub OAuth callback');
    }
  }

  if (provider === 'google' && oauthConfig.google.enabled) {
    if (!env.GOOGLE_CLIENT_ID) {
      errors.push('Missing GOOGLE_CLIENT_ID');
    }
    if (!env.GOOGLE_CLIENT_SECRET) {
      errors.push('Missing GOOGLE_CLIENT_SECRET');
    }
    if (!env.API_URL) {
      errors.push('Missing API_URL for Google OAuth callback');
    }
  }

  if (errors.length > 0) {
    throw new OAuthError(
      `OAuth configuration errors:\n${errors.join('\n')}`,
      provider,
      'CONFIG_ERROR'
    );
  }
}

// No need to validate on startup
// validateOAuthConfig will be called when actually using OAuth features
