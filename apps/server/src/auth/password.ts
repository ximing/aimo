import argon2 from 'argon2';
import bcrypt from 'bcrypt';

/** Same parameters Inwit and Vital already use, so Keycloak can verify the PHC. */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export function isArgon2idPassword(hash: string | null | undefined): boolean {
  return typeof hash === 'string' && hash.startsWith('$argon2id$');
}

export function isBcryptPassword(hash: string | null | undefined): boolean {
  return typeof hash === 'string' && /^\$2[aby]\$/.test(hash);
}

export function shouldUpgradePassword(hash: string | null | undefined): boolean {
  return isBcryptPassword(hash);
}

/**
 * Empty hashes are rejected before either algorithm runs.
 * Argon2id is checked first. A leftover bcrypt hash still verifies.
 */
export async function verifyPassword(
  plain: string,
  hash: string | null | undefined
): Promise<boolean> {
  if (!hash) return false;
  try {
    if (isArgon2idPassword(hash)) return await argon2.verify(hash, plain);
    if (isBcryptPassword(hash)) return await bcrypt.compare(plain, hash);
    return false;
  } catch {
    return false;
  }
}
