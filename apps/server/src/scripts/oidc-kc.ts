/**
 * Keycloak admin calls for the production realm only.
 * Never log tokens, secrets, passwords, or email addresses.
 */

export const PRODUCTION_ISSUER = 'https://super-agent-auth.aimo.plus/realms/aimo-plus-prod';
export const KC_ORIGIN = 'https://super-agent-auth.aimo.plus';
export const KC_REALM = 'aimo-plus-prod';
export const AIMO_CLIENT_ID = 'aimo';
export const AIMO_AUDIENCE = 'aimo-api';
export const AIMO_REDIRECT = 'https://aimo.plus/api/v1/auth/oidc/callback';
export const AIMO_WEB_ORIGIN = 'https://aimo.plus';
export const AIMO_ATTRIBUTE = 'aimo_user_id';

type KcUser = {
  id?: string;
  username?: string;
  email?: string;
  attributes?: Record<string, string[]>;
  credentials?: unknown;
  [key: string]: unknown;
};

let cachedToken: { value: string; exp: number } | null = null;

export function adminConfigured(): boolean {
  return Boolean(process.env.OIDC_ADMIN_USER?.trim() && process.env.OIDC_ADMIN_PASSWORD);
}

async function adminToken(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 30_000) return cachedToken.value;
  const username = process.env.OIDC_ADMIN_USER?.trim() ?? '';
  const password = process.env.OIDC_ADMIN_PASSWORD ?? '';
  if (!username || !password) throw new Error('admin vars missing');
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: 'admin-cli',
    username,
    password,
  });
  const response = await fetch(`${KC_ORIGIN}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body,
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`admin token ${response.status}`);
  const json = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error('admin token missing');
  cachedToken = {
    value: json.access_token,
    exp: Date.now() + (json.expires_in ?? 60) * 1000,
  };
  return json.access_token;
}

export async function kc(path: string, init?: RequestInit): Promise<Response> {
  const token = await adminToken();
  const headers = new Headers(init?.headers);
  headers.set('authorization', `Bearer ${token}`);
  headers.set('accept', 'application/json');
  if (init?.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  return fetch(`${KC_ORIGIN}${path}`, {
    ...init,
    headers,
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
  });
}

function realmPath(suffix: string): string {
  return `/admin/realms/${encodeURIComponent(KC_REALM)}${suffix}`;
}

export async function attributeDeclared(): Promise<boolean> {
  const response = await kc(realmPath('/users/profile'));
  if (!response.ok) throw new Error(`profile ${response.status}`);
  const profile = (await response.json()) as { attributes?: Array<{ name?: string }> };
  return (profile.attributes ?? []).some((item) => item.name === AIMO_ATTRIBUTE);
}

export async function ensureAttribute(): Promise<'present' | 'added'> {
  const response = await kc(realmPath('/users/profile'));
  if (!response.ok) throw new Error(`profile ${response.status}`);
  const profile = (await response.json()) as {
    attributes?: Array<{ name?: string }>;
    unmanagedAttributePolicy?: string;
  };
  const before = profile.attributes ?? [];
  const hadInwit = before.some((item) => item.name === 'inwit_user_id');
  if (before.some((item) => item.name === AIMO_ATTRIBUTE)) return 'present';
  const next = {
    ...profile,
    attributes: [
      ...before,
      {
        name: AIMO_ATTRIBUTE,
        displayName: AIMO_ATTRIBUTE,
        permissions: { view: ['admin'], edit: ['admin'] },
        multivalued: false,
        validations: { length: { max: 36 } },
      },
    ],
  };
  const saved = await kc(realmPath('/users/profile'), {
    method: 'PUT',
    body: JSON.stringify(next),
  });
  if (!saved.ok) throw new Error(`profile update ${saved.status}`);
  const check = await kc(realmPath('/users/profile'));
  if (!check.ok) throw new Error(`profile ${check.status}`);
  const confirmed = (await check.json()) as {
    attributes?: Array<{ name?: string }>;
    unmanagedAttributePolicy?: string;
  };
  const names = (confirmed.attributes ?? []).map((item) => item.name);
  if (!names.includes(AIMO_ATTRIBUTE)) throw new Error('attribute missing after write');
  if (hadInwit && !names.includes('inwit_user_id')) throw new Error('inwit attribute removed');
  if (confirmed.unmanagedAttributePolicy !== profile.unmanagedAttributePolicy) {
    throw new Error('unmanaged attribute policy changed');
  }
  return 'added';
}

type ClientRep = {
  id?: string;
  clientId?: string;
  redirectUris?: string[];
  webOrigins?: string[];
  publicClient?: boolean;
  standardFlowEnabled?: boolean;
  implicitFlowEnabled?: boolean;
  directAccessGrantsEnabled?: boolean;
  serviceAccountsEnabled?: boolean;
};

async function findClient(): Promise<ClientRep | null> {
  const response = await kc(realmPath(`/clients?clientId=${encodeURIComponent(AIMO_CLIENT_ID)}`));
  if (!response.ok) throw new Error(`clients ${response.status}`);
  const rows = (await response.json()) as ClientRep[];
  return rows.find((row) => row.clientId === AIMO_CLIENT_ID) ?? null;
}

function clientShapeOk(client: ClientRep): boolean {
  const redirects = client.redirectUris ?? [];
  const origins = client.webOrigins ?? [];
  return (
    client.publicClient === false &&
    client.standardFlowEnabled !== false &&
    client.implicitFlowEnabled !== true &&
    client.directAccessGrantsEnabled !== true &&
    client.serviceAccountsEnabled !== true &&
    redirects.length === 1 &&
    redirects[0] === AIMO_REDIRECT &&
    origins.length === 1 &&
    origins[0] === AIMO_WEB_ORIGIN &&
    !redirects.some((item) => item.includes('*')) &&
    !origins.some((item) => item === '*')
  );
}

async function ensureScopes(clientUuid: string): Promise<void> {
  const scopes = await kc(realmPath('/client-scopes'));
  if (!scopes.ok) throw new Error(`client scopes ${scopes.status}`);
  const all = (await scopes.json()) as Array<{ id?: string; name?: string }>;
  const wanted = ['basic', 'profile', 'email'];
  const current = await kc(realmPath(`/clients/${clientUuid}/default-client-scopes`));
  if (!current.ok) throw new Error(`default scopes ${current.status}`);
  const assigned = new Set(
    ((await current.json()) as Array<{ name?: string }>).map((item) => item.name)
  );
  for (const name of wanted) {
    if (assigned.has(name)) continue;
    const scope = all.find((item) => item.name === name && item.id);
    if (!scope?.id) throw new Error(`missing client scope ${name}`);
    const added = await kc(realmPath(`/clients/${clientUuid}/default-client-scopes/${scope.id}`), {
      method: 'PUT',
    });
    if (!added.ok) throw new Error(`assign scope ${added.status}`);
  }
}

async function ensureAudienceMapper(clientUuid: string): Promise<void> {
  const response = await kc(realmPath(`/clients/${clientUuid}/protocol-mappers/models`));
  if (!response.ok) throw new Error(`mappers ${response.status}`);
  const mappers = (await response.json()) as Array<{
    name?: string;
    protocolMapper?: string;
    config?: Record<string, string>;
  }>;
  const name = `${AIMO_AUDIENCE}-audience`;
  const existing = mappers.find((item) => item.name === name);
  if (existing) {
    const audience = existing.config?.['included.custom.audience'];
    const access = existing.config?.['access.token.claim'];
    const idClaim = existing.config?.['id.token.claim'];
    if (
      existing.protocolMapper !== 'oidc-audience-mapper' ||
      audience !== AIMO_AUDIENCE ||
      access !== 'true' ||
      idClaim !== 'false'
    ) {
      throw new Error('audience mapper mismatch');
    }
    return;
  }
  const created = await kc(realmPath(`/clients/${clientUuid}/protocol-mappers/models`), {
    method: 'POST',
    body: JSON.stringify({
      name,
      protocol: 'openid-connect',
      protocolMapper: 'oidc-audience-mapper',
      config: {
        'included.custom.audience': AIMO_AUDIENCE,
        'access.token.claim': 'true',
        'id.token.claim': 'false',
      },
    }),
  });
  if (!created.ok) throw new Error(`mapper ${created.status}`);
}

export async function ensureClient(): Promise<'present' | 'created'> {
  const existing = await findClient();
  let client = existing;
  let action: 'present' | 'created' = 'present';
  if (!client?.id) {
    const created = await kc(realmPath('/clients'), {
      method: 'POST',
      body: JSON.stringify({
        protocol: 'openid-connect',
        clientId: AIMO_CLIENT_ID,
        name: 'Aimo',
        publicClient: false,
        clientAuthenticatorType: 'client-secret',
        standardFlowEnabled: true,
        implicitFlowEnabled: false,
        directAccessGrantsEnabled: false,
        serviceAccountsEnabled: false,
        rootUrl: AIMO_WEB_ORIGIN,
        baseUrl: AIMO_WEB_ORIGIN,
        redirectUris: [AIMO_REDIRECT],
        webOrigins: [AIMO_WEB_ORIGIN],
        attributes: { 'pkce.code.challenge.method': 'S256' },
      }),
    });
    if (!created.ok) throw new Error(`client create ${created.status}`);
    client = await findClient();
    action = 'created';
  }
  if (!client?.id) throw new Error('client missing');
  const full = await kc(realmPath(`/clients/${client.id}`));
  if (!full.ok) throw new Error(`client ${full.status}`);
  const representation = (await full.json()) as ClientRep;
  if (!clientShapeOk(representation)) throw new Error('client shape mismatch');
  await ensureScopes(client.id);
  await ensureAudienceMapper(client.id);
  return action;
}

export async function readClientSecret(): Promise<string> {
  const client = await findClient();
  if (!client?.id) throw new Error('client missing');
  const response = await kc(realmPath(`/clients/${client.id}/client-secret`));
  if (!response.ok) throw new Error(`client secret ${response.status}`);
  const json = (await response.json()) as { value?: string };
  if (!json.value || json.value.length < 16) throw new Error('client secret missing');
  return json.value;
}

export async function usersByEmail(email: string): Promise<string[]> {
  const query = new URLSearchParams({ email, exact: 'true' });
  const response = await kc(realmPath(`/users?${query}`));
  if (!response.ok) throw new Error(`lookup ${response.status}`);
  const rows = (await response.json()) as Array<{ id?: string }>;
  return rows.flatMap((row) => (row.id ? [row.id] : []));
}

export async function getUser(id: string): Promise<KcUser> {
  const response = await kc(realmPath(`/users/${encodeURIComponent(id)}`));
  if (!response.ok) throw new Error(`user ${response.status}`);
  return (await response.json()) as KcUser;
}

export function attributeValue(user: KcUser): string | undefined {
  const value = user.attributes?.[AIMO_ATTRIBUTE];
  return Array.isArray(value) ? value[0] : undefined;
}

export async function setAttribute(id: string, uid: string): Promise<void> {
  const user = await getUser(id);
  const { credentials: _credentials, ...rest } = user;
  const saved = await kc(realmPath(`/users/${encodeURIComponent(id)}`), {
    method: 'PUT',
    body: JSON.stringify({
      ...rest,
      attributes: { ...(user.attributes ?? {}), [AIMO_ATTRIBUTE]: [uid] },
    }),
  });
  if (!saved.ok) throw new Error(`user update ${saved.status}`);
}

export async function passwordCredential(id: string): Promise<{ algorithm: string | null }> {
  const response = await kc(realmPath(`/users/${encodeURIComponent(id)}/credentials`));
  if (!response.ok) throw new Error(`credentials ${response.status}`);
  const rows = (await response.json()) as Array<{ type?: string; credentialData?: string }>;
  const password = rows.find((row) => row.type === 'password');
  if (!password) throw new Error('password credential missing');
  if (!password.credentialData) return { algorithm: null };
  try {
    const data = JSON.parse(password.credentialData) as { algorithm?: string };
    return { algorithm: data.algorithm ?? null };
  } catch {
    return { algorithm: null };
  }
}

export async function createKeycloakUser(input: {
  email: string;
  uid: string;
  firstName: string;
  lastName: string;
  secretData: string;
  credentialData: string;
}): Promise<string> {
  const response = await kc(realmPath('/users'), {
    method: 'POST',
    body: JSON.stringify({
      username: input.email,
      email: input.email,
      emailVerified: true,
      enabled: true,
      firstName: input.firstName,
      lastName: input.lastName,
      attributes: { [AIMO_ATTRIBUTE]: [input.uid] },
      credentials: [
        {
          type: 'password',
          temporary: false,
          secretData: input.secretData,
          credentialData: input.credentialData,
        },
      ],
    }),
  });
  if (response.status === 409) throw new Error('user exists');
  if (response.status !== 201 && response.status !== 204) {
    throw new Error(`user create ${response.status}`);
  }
  const location = response.headers.get('location') ?? '';
  const sub = location.replace(/\/$/, '').split('/').pop() ?? '';
  if (!sub) throw new Error('user create location');
  return sub;
}

export async function deleteKeycloakUser(id: string): Promise<void> {
  const response = await kc(realmPath(`/users/${encodeURIComponent(id)}`), { method: 'DELETE' });
  if (!response.ok && response.status !== 404) throw new Error(`user delete ${response.status}`);
}
