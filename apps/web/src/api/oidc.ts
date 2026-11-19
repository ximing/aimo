import request from '../utils/request';

export type OidcAccount = {
  enabled: boolean;
  linked: boolean;
  hasPassword: boolean;
};

export const getOidcStatus = () => {
  return request.get<unknown, { enabled: boolean }>('/api/v1/auth/oidc/status');
};

export const getOidcAccount = () => {
  return request.get<unknown, OidcAccount>('/api/v1/auth/oidc/account');
};
