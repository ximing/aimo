import bcrypt from 'bcrypt';

import { keycloakPasswordCredential } from '../auth/oidc-logic.js';
import {
  hashPassword,
  isArgon2idPassword,
  shouldUpgradePassword,
  verifyPassword,
} from '../auth/password.js';

describe('password', () => {
  it('rejects an empty hash before either algorithm', async () => {
    await expect(verifyPassword('secret', null)).resolves.toBe(false);
    await expect(verifyPassword('secret', '')).resolves.toBe(false);
    await expect(verifyPassword('secret', undefined)).resolves.toBe(false);
  });

  it('writes argon2id and accepts that hash in the Keycloak credential shape', async () => {
    const phc = await hashPassword('correct-horse');
    expect(isArgon2idPassword(phc)).toBe(true);
    expect(phc.startsWith('$argon2id$v=19$m=19456,t=2,p=1$')).toBe(true);
    expect(shouldUpgradePassword(phc)).toBe(false);
    await expect(verifyPassword('correct-horse', phc)).resolves.toBe(true);
    await expect(verifyPassword('wrong', phc)).resolves.toBe(false);

    const credential = keycloakPasswordCredential(phc);
    expect(credential).not.toBeNull();
    const secret = JSON.parse(credential!.secretData) as { value: string; salt: string };
    const data = JSON.parse(credential!.credentialData) as {
      algorithm: string;
      hashIterations: number;
      additionalParameters: { type: string[]; version: string[]; memory: string[] };
    };
    expect(Buffer.from(secret.value, 'base64')).toHaveLength(32);
    expect(Buffer.from(secret.salt, 'base64').length).toBeGreaterThan(0);
    expect(data.algorithm).toBe('argon2');
    expect(data.hashIterations).toBe(2);
    expect(data.additionalParameters.type).toEqual(['id']);
    expect(data.additionalParameters.version).toEqual(['1.3']);
    expect(data.additionalParameters.memory).toEqual(['19456']);
  });

  it('still verifies bcrypt and marks it for upgrade', async () => {
    const hash = await bcrypt.hash('correct-horse', 10);
    expect(shouldUpgradePassword(hash)).toBe(true);
    await expect(verifyPassword('correct-horse', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
    expect(keycloakPasswordCredential(hash)).toBeNull();
  });
});
