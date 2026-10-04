import {
  androidReleaseFromGitHubRelease,
  type AndroidRelease,
  type AllVersionsResponseDto,
  type VersionInfoDto,
} from '@aimo/dto';
import { Service } from 'typedi';

import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

interface CachedVersion {
  version: string;
  timestamp: number;
}

interface GitHubJson {
  status: number;
  body: unknown;
}

type GitHubFetch = (url: string, headers: Record<string, string>) => Promise<GitHubJson>;

const GITHUB_API = 'https://api.github.com';
const ANDROID_CACHE_MS = 60_000;

async function defaultGitHubFetch(url: string, headers: Record<string, string>): Promise<GitHubJson> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
  const text = await response.text();
  if (text === '') return { status: response.status, body: null };
  try {
    return { status: response.status, body: JSON.parse(text) as unknown };
  } catch {
    return { status: response.status, body: null };
  }
}

let fetchGitHub: GitHubFetch = defaultGitHubFetch;

export function setGitHubReleaseFetchForTest(fn?: GitHubFetch): void {
  fetchGitHub = fn ?? defaultGitHubFetch;
}

/** Pick the newest GitHub release that contains an APK, then apply the forced-update floor. */
export function selectAndroidRelease(
  latest: GitHubJson,
  list: GitHubJson | null,
  minVersionCode?: number
): AndroidRelease | null {
  let release = latest.status === 200 ? androidReleaseFromGitHubRelease(latest.body) : null;
  if (!release && list && list.status === 200 && Array.isArray(list.body)) {
    for (const item of list.body) {
      release = androidReleaseFromGitHubRelease(item);
      if (release) break;
    }
  }
  if (!release) return null;
  if (minVersionCode === undefined || minVersionCode > release.versionCode) return release;
  return { ...release, minVersionCode };
}

@Service()
export class GitHubReleaseService {
  private readonly cacheDuration = 60 * 60 * 1000; // 1 hour in milliseconds
  private cache: Map<string, CachedVersion> = new Map();
  private androidCache: { repo: string; at: number; value: AndroidRelease | null } | null = null;

  private readonly repos = {
    desktop: 'ximing/aimo',
    apk: 'ximing/aimo-app',
  };

  /**
   * Get the latest version from GitHub releases
   * Uses caching to avoid hitting rate limits
   */
  async getLatestVersion(repoKey: 'desktop' | 'apk'): Promise<VersionInfoDto> {
    const cached = this.getCachedVersion(repoKey);
    if (cached) {
      return { version: cached };
    }

    try {
      const version = await this.fetchLatestVersionFromGitHub(repoKey);
      this.setCachedVersion(repoKey, version);
      return { version };
    } catch (error) {
      logger.error(`Failed to fetch version for ${repoKey}:`, error);
      return {
        version: undefined,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get both desktop and APK versions in one call
   */
  async getAllVersions(): Promise<AllVersionsResponseDto> {
    const [desktop, apk] = await Promise.all([
      this.getLatestVersion('desktop'),
      this.getLatestVersion('apk'),
    ]);

    return {
      desktop,
      apk,
    };
  }

  /**
   * Latest Android APK from GitHub Releases.
   * Returns null when no vMAJOR.MINOR.PATCH release has an .apk asset.
   */
  async getAndroidRelease(): Promise<AndroidRelease | null> {
    const repo = config.github.apkRepo;
    const now = Date.now();
    if (this.androidCache && this.androidCache.repo === repo && now - this.androidCache.at < ANDROID_CACHE_MS) {
      return this.androidCache.value;
    }
    try {
      const value = await this.fetchAndroidRelease(repo);
      this.androidCache = { repo, at: now, value };
      return value;
    } catch (error) {
      logger.warn('android_release.github_error', {
        error: error instanceof Error ? error.message : String(error),
      });
      if (this.androidCache && this.androidCache.repo === repo) return this.androidCache.value;
      return null;
    }
  }

  /**
   * Clear the cache for a specific repo or all repos
   */
  clearCache(repoKey?: 'desktop' | 'apk'): void {
    this.androidCache = null;
    if (repoKey) {
      this.cache.delete(repoKey);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cached version if it exists and is not expired
   */
  private getCachedVersion(repoKey: string): string | undefined {
    const cached = this.cache.get(repoKey);
    if (!cached) {
      return undefined;
    }

    const now = Date.now();
    if (now - cached.timestamp > this.cacheDuration) {
      this.cache.delete(repoKey);
      return undefined;
    }

    return cached.version;
  }

  /**
   * Set cached version
   */
  private setCachedVersion(repoKey: string, version: string): void {
    this.cache.set(repoKey, {
      version,
      timestamp: Date.now(),
    });
  }

  /**
   * Fetch latest version from GitHub API
   */
  private async fetchLatestVersionFromGitHub(repoKey: 'desktop' | 'apk'): Promise<string> {
    const repo = this.repos[repoKey];
    const url = `https://api.github.com/repos/${repo}/releases/latest`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'AIMO-App/1.0',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`No releases found for ${repo}`);
      }
      if (response.status === 403) {
        throw new Error('GitHub API rate limit exceeded');
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { tag_name: string };

    if (!data.tag_name) {
      throw new Error('Invalid response from GitHub API');
    }

    // Remove 'v' prefix if present (e.g., v1.0.0 -> 1.0.0)
    return data.tag_name.replace(/^v/, '');
  }

  private githubHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'aimo-server',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (config.github.token) headers.Authorization = `Bearer ${config.github.token}`;
    return headers;
  }

  private async fetchAndroidRelease(repo: string): Promise<AndroidRelease | null> {
    const headers = this.githubHeaders();
    const latest = await fetchGitHub(`${GITHUB_API}/repos/${repo}/releases/latest`, headers);
    let list: GitHubJson | null = null;
    const parsedLatest = latest.status === 200 ? androidReleaseFromGitHubRelease(latest.body) : null;
    if (!parsedLatest) {
      list = await fetchGitHub(`${GITHUB_API}/repos/${repo}/releases?per_page=10`, headers);
    }
    const release = selectAndroidRelease(latest, list, config.github.androidMinVersionCode);
    if (!release && latest.status >= 400 && latest.status !== 404) {
      logger.warn('android_release.github_failed', { status: latest.status, repo });
    }
    return release;
  }
}
