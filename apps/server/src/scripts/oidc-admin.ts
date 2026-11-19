/**
 * Declare aimo_user_id, then open the production client `aimo`.
 * Writes the client secret to the path in argv[2] with mode 600. Does not print it.
 *
 *   node apps/server/dist/scripts/oidc-admin.js /tmp/aimo-oidc-client.secret
 */
import { chmod, writeFile } from 'node:fs/promises';

import 'reflect-metadata';
import '../config/env.js';

import { adminConfigured, ensureAttribute, ensureClient, readClientSecret } from './oidc-kc.js';

async function main(): Promise<void> {
  const secretFile = process.argv[2];
  if (!secretFile) throw new Error('secret file path required');
  if (!adminConfigured()) throw new Error('admin vars missing');
  const attribute = await ensureAttribute();
  const client = await ensureClient();
  const secret = await readClientSecret();
  await writeFile(secretFile, secret, { mode: 0o600 });
  await chmod(secretFile, 0o600);
  console.log(`attribute=${attribute} client=${client} secret_file=written`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'error';
  console.error(/@|bearer /i.test(message) ? 'oidc-admin failed' : message);
  process.exit(1);
});
