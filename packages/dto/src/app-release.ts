/**
 * Android APK metadata published on GitHub Releases.
 * versionCode matches aimo-app: major * 10000 + minor * 100 + patch.
 */

export interface AndroidRelease {
  /** Semver without a v prefix, for example "1.4.3". */
  versionName: string;
  /** Comparable build number baked into the APK. */
  versionCode: number;
  /** GitHub browser_download_url for the APK. */
  apkUrl: string;
  /** Lowercase SHA-256 of the APK, when the release provides one. */
  sha256?: string;
  /** APK size in bytes. */
  sizeBytes?: number;
  /** Release notes, trimmed to 4000 characters. */
  releaseNotes?: string;
  /** Clients below this versionCode must install before continuing. */
  minVersionCode?: number;
}

export interface AppAndroidReleaseResponse {
  android: AndroidRelease | null;
}

/** Same formula as aimo-app `app.config.js` and the Android release workflow. */
export function androidVersionFromTag(
  tag: string
): { versionName: string; versionCode: number } | null {
  const match = /^v?([0-9]+)\.([0-9]+)\.([0-9]+)$/.exec(tag.trim());
  if (!match) return null;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (!Number.isFinite(major) || !Number.isFinite(minor) || !Number.isFinite(patch)) return null;
  if (minor > 99 || patch > 99) return null;
  const versionCode = major * 10_000 + minor * 100 + patch;
  if (versionCode < 1 || `${major}.${minor}.${patch}`.length > 32) return null;
  return { versionName: `${major}.${minor}.${patch}`, versionCode };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function pickGitHubApkAsset(
  assets: unknown
): { name: string; apkUrl: string; sizeBytes?: number } | null {
  if (!Array.isArray(assets)) return null;
  const apks: { name: string; apkUrl: string; sizeBytes?: number }[] = [];
  for (const item of assets) {
    if (!isRecord(item)) continue;
    const name = typeof item.name === 'string' ? item.name : '';
    const url = typeof item.browser_download_url === 'string' ? item.browser_download_url : '';
    if (!name.toLowerCase().endsWith('.apk') || url === '') continue;
    const size =
      typeof item.size === 'number' && Number.isFinite(item.size) && item.size > 0
        ? item.size
        : undefined;
    apks.push(size === undefined ? { name, apkUrl: url } : { name, apkUrl: url, sizeBytes: size });
  }
  if (apks.length === 0) return null;
  return apks.find((asset) => asset.name === 'app-release.apk') ?? apks[0] ?? null;
}

function httpsUrl(value: string): boolean {
  if (value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Map one GitHub Releases API payload to Android APK metadata. */
export function androidReleaseFromGitHubRelease(input: unknown): AndroidRelease | null {
  if (!isRecord(input)) return null;
  if (input.draft === true || input.prerelease === true) return null;
  const tag = typeof input.tag_name === 'string' ? input.tag_name : '';
  const version = androidVersionFromTag(tag);
  if (!version) return null;
  const apk = pickGitHubApkAsset(input.assets);
  if (!apk || !httpsUrl(apk.apkUrl)) return null;
  const notes = typeof input.body === 'string' ? input.body.trim().slice(0, 4000) : '';
  const release: AndroidRelease = {
    versionName: version.versionName,
    versionCode: version.versionCode,
    apkUrl: apk.apkUrl,
  };
  if (apk.sizeBytes !== undefined) release.sizeBytes = apk.sizeBytes;
  if (notes !== '') release.releaseNotes = notes;
  return release;
}
