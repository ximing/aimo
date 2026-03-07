import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
export const RENDERER_DIST = path.resolve(__dirname, '..');
export const PRELOAD_PATH = path.join(__dirname, '../preload/index.cjs');

process.env.VITE_PUBLIC = RENDERER_DIST;

export function getIconPath(): string {
  return path.join(__dirname, '../../build/icon.png');
}
