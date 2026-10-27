import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(desktopRoot, '..', '..');

function portOpen(port) {
  return new Promise((resolve) => {
    const sock = createConnection({ port, host: '127.0.0.1' }, () => {
      sock.end();
      resolve(true);
    });
    sock.on('error', () => resolve(false));
  });
}

async function healthy() {
  try {
    const res = await fetch('http://localhost:5173/', {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

if (await portOpen(5173)) {
  for (let i = 0; i < 60; i += 1) {
    if (await healthy()) process.exit(0);
    await new Promise((r) => setTimeout(r, 500));
  }
  console.error('port 5173 in use but Vite not healthy');
  process.exit(1);
}

const child = spawn('pnpm', ['--filter', '@aimo/web', 'dev'], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: process.env,
});
child.on('exit', (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});
