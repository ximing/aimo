import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { app } from 'electron';

import { type AssetRuntime, resolveAssetPath } from './assets';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
export const RENDERER_DIST = path.resolve(__dirname, '..');
export const PRELOAD_PATH = path.join(__dirname, '../preload/index.cjs');

process.env.VITE_PUBLIC = RENDERER_DIST;

export function getAssetRuntime(): AssetRuntime {
  return {
    resourcesPath: process.resourcesPath,
    appPath: app.getAppPath(),
  };
}

export function getIconPath(): string | undefined {
  const runtime = getAssetRuntime();
  return (
    resolveAssetPath('icon.png', runtime) ??
    resolveAssetPath('icon.icns', runtime) ??
    resolveAssetPath('icon.ico', runtime) ??
    undefined
  );
}
