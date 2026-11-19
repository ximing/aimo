/**
 * Import production Aimo users into aimo-plus-prod.
 * Creates a Keycloak user only when the local hash is the shared argon2id PHC.
 * Bcrypt rows are skipped and counted. Re-run after those users log in and the
 * hash is upgraded. Existing Keycloak emails are linked by aimo_user_id and
 * their password is left unchanged.
 *
 *   node apps/server/dist/scripts/import-oidc-users.js /tmp/aimo-oidc-import.json
 */
import { chmod, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import 'reflect-metadata';
import '../config/env.js';

import { keycloakPasswordCredential, normalizeEmail, personNames } from '../auth/oidc-logic.js';
import { closeDatabase, getDatabase, initializeDatabase } from '../db/connection.js';
import { oidcIdentities } from '../db/schema/oidc-identities.js';
import { users } from '../db/schema/users.js';

import {
  AIMO_ATTRIBUTE,
  PRODUCTION_ISSUER,
  adminConfigured,
  attributeDeclared,
  attributeValue,
  createKeycloakUser,
  deleteKeycloakUser,
  getUser,
  passwordCredential,
  setAttribute,
  usersByEmail,
} from './oidc-kc.js';

type Counts = {
  created: number;
  linked: number;
  skippedNoEmail: number;
  skippedDeleted: number;
  skippedDuplicate: number;
  skippedHash: number;
  skippedConflict: number;
};

type Mapping = { uid: string; email: string; sub: string; action: 'created' | 'linked' };

function printCounts(counts: Counts): void {
  console.log(
    `import created=${counts.created} linked=${counts.linked} skippedNoEmail=${counts.skippedNoEmail} skippedDeleted=${counts.skippedDeleted} skippedDuplicate=${counts.skippedDuplicate} skippedHash=${counts.skippedHash} skippedConflict=${counts.skippedConflict}`
  );
}

async function confirmUser(sub: string, uid: string, created: boolean): Promise<void> {
  const user = await getUser(sub);
  if (attributeValue(user) !== uid) throw new Error('attribute mismatch');
  const credential = await passwordCredential(sub);
  if (created && credential.algorithm && credential.algorithm !== 'argon2') {
    throw new Error('credential algorithm');
  }
}

async function rememberIdentity(uid: string, sub: string): Promise<void> {
  const db = getDatabase();
  const existing = await db
    .select({ sub: oidcIdentities.sub, userId: oidcIdentities.userId })
    .from(oidcIdentities)
    .where(and(eq(oidcIdentities.issuer, PRODUCTION_ISSUER), eq(oidcIdentities.userId, uid)))
    .limit(1);
  if (existing[0]) {
    if (existing[0].sub !== sub) throw new Error('identity conflict');
    return;
  }
  const bySub = await db
    .select({ userId: oidcIdentities.userId })
    .from(oidcIdentities)
    .where(and(eq(oidcIdentities.issuer, PRODUCTION_ISSUER), eq(oidcIdentities.sub, sub)))
    .limit(1);
  if (bySub[0] && bySub[0].userId !== uid) throw new Error('identity conflict');
  if (bySub[0]) return;
  await db.insert(oidcIdentities).values({
    id: randomUUID(),
    userId: uid,
    issuer: PRODUCTION_ISSUER,
    sub,
  });
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') throw new Error('refusing non-production import');
  if (!adminConfigured()) throw new Error('admin vars missing');
  const outPath = process.argv[2] || '/tmp/aimo-oidc-import.json';
  if (!(await attributeDeclared())) throw new Error(`${AIMO_ATTRIBUTE} is not declared`);

  initializeDatabase();
  const counts: Counts = {
    created: 0,
    linked: 0,
    skippedNoEmail: 0,
    skippedDeleted: 0,
    skippedDuplicate: 0,
    skippedHash: 0,
    skippedConflict: 0,
  };
  const mapping: Mapping[] = [];
  let currentUid = '';

  try {
    const rows = await getDatabase()
      .select({
        uid: users.uid,
        email: users.email,
        password: users.password,
        nickname: users.nickname,
        deletedAt: users.deletedAt,
      })
      .from(users);

    const active = new Map<string, typeof rows>();
    for (const row of rows) {
      if (row.deletedAt !== 0) {
        counts.skippedDeleted += 1;
        continue;
      }
      const email = row.email ? normalizeEmail(row.email) : '';
      if (!email) {
        counts.skippedNoEmail += 1;
        continue;
      }
      const group = active.get(email) ?? [];
      group.push({ ...row, email });
      active.set(email, group);
    }

    for (const [email, group] of active) {
      if (group.length > 1) {
        counts.skippedDuplicate += group.length;
        continue;
      }
      const row = group[0]!;
      currentUid = row.uid;
      const matches = await usersByEmail(email);
      if (matches.length > 1) {
        counts.skippedConflict += 1;
        continue;
      }
      if (matches.length === 1) {
        const sub = matches[0]!;
        const remote = await getUser(sub);
        const current = attributeValue(remote);
        if (current && current !== row.uid) {
          counts.skippedConflict += 1;
          continue;
        }
        if (!current) await setAttribute(sub, row.uid);
        await confirmUser(sub, row.uid, false);
        await rememberIdentity(row.uid, sub);
        mapping.push({ uid: row.uid, email, sub, action: 'linked' });
        counts.linked += 1;
        continue;
      }

      const credential = row.password ? keycloakPasswordCredential(row.password) : null;
      if (!credential) {
        counts.skippedHash += 1;
        continue;
      }
      const names = personNames(row.nickname, email);
      let sub = '';
      try {
        sub = await createKeycloakUser({
          email,
          uid: row.uid,
          firstName: names.firstName,
          lastName: names.lastName,
          secretData: credential.secretData,
          credentialData: credential.credentialData,
        });
        await confirmUser(sub, row.uid, true);
        await rememberIdentity(row.uid, sub);
      } catch (error) {
        if (sub) await deleteKeycloakUser(sub).catch(() => undefined);
        throw error;
      }
      mapping.push({ uid: row.uid, email, sub, action: 'created' });
      counts.created += 1;
    }

    await writeFile(outPath, JSON.stringify(mapping), { mode: 0o600 });
    await chmod(outPath, 0o600);
    printCounts(counts);
  } catch (error) {
    printCounts(counts);
    const reason = error instanceof Error ? error.message : 'error';
    const safe = /[@$]|bearer /i.test(reason) ? 'error' : reason.slice(0, 120);
    console.error(`stopped uid=${currentUid || 'none'} reason=${safe}`);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

main().catch((error: unknown) => {
  const reason = error instanceof Error ? error.message : 'error';
  const safe = /[@$]|bearer /i.test(reason) ? 'error' : reason.slice(0, 120);
  console.error(safe);
  process.exit(1);
});
