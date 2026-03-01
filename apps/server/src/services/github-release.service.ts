import { Service } from 'typedi';

import { logger } from '../utils/logger.js';

import type { AllVersionsResponseDto, VersionInfoDto } from '@aimo/dto';

interface CachedVersion {
  version: string;
  timestamp: number;
}

@Service()
export class GitHubReleaseService {
  private readonly cacheDuration = 60 * 60 * 1000; // 1 hour in milliseconds
  private cache: Map<string, CachedVersion> = new Map();

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
   * Clear the cache for a specific repo or all repos
   */
  clearCache(repoKey?: 'desktop' | 'apk'): void {
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
}
