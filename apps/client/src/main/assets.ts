import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AssetRuntime {
  resourcesPath?: string;
  appPath?: string;
}

/**
 * Icon search order:
 * 1. apps/client/build (dev, and packaged if build/ is in `files`)
 * 2. Contents/Resources/icons (electron-builder extraResources)
 * 3. Contents/Resources (icon.icns)
 * 4. app/build (packaged files)
 */
export function getAssetSearchDirs(runtime: AssetRuntime = {}): string[] {
  const dirs = [path.join(__dirname, '../../build')];
  if (runtime.resourcesPath) {
    dirs.push(path.join(runtime.resourcesPath, 'icons'));
    dirs.push(runtime.resourcesPath);
  }
  if (runtime.appPath) {
    dirs.push(path.join(runtime.appPath, 'build'));
  }
  return dirs;
}

export function resolveAssetPath(
  filename: string,
  runtime: AssetRuntime = {},
  exists: (filePath: string) => boolean = fs.existsSync
): string | null {
  for (const dir of getAssetSearchDirs(runtime)) {
    const candidate = path.join(dir, filename);
    if (exists(candidate)) {
      return candidate;
    }
  }
  return null;
}
