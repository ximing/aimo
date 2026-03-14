import dns from 'node:dns/promises';
import { logger } from './logger.js';

/**
 * SSRF protection configuration
 */
const SSRF_CONFIG = {
  // Private IPv4 ranges (CIDR notation)
  PRIVATE_IPV4_RANGES: [
    '0.0.0.0/8', // "This" network
    '10.0.0.0/8', // Private network
    '127.0.0.0/8', // Loopback
    '169.254.0.0/16', // Link-local
    '172.16.0.0/12', // Private network
    '192.0.0.0/24', // IANA IPv4 Special Purpose Address Registry
    '192.0.2.0/24', // Documentation (TEST-NET-1)
    '192.168.0.0/16', // Private network
    '198.18.0.0/15', // Network benchmark tests
    '198.51.100.0/24', // Documentation (TEST-NET-2)
    '203.0.113.0/24', // Documentation (TEST-NET-3)
    '224.0.0.0/4', // Multicast
    '240.0.0.0/4', // Reserved for future use
    '255.255.255.255/32', // Broadcast
  ],

  // Private IPv6 ranges (CIDR notation)
  PRIVATE_IPV6_RANGES: [
    '::1/128', // Loopback
    'fc00::/7', // Unique local address (ULA)
    'fe80::/10', // Link-local
    '::ffff:0:0/96', // IPv4-mapped addresses
    '::/128', // Unspecified address
    '100::/64', // Discard-only address block
    '2001:db8::/32', // Documentation
    '2001:10::/28', // ORCHID
  ],

  // Trusted domains for built-in providers
  TRUSTED_PROVIDER_DOMAINS: {
    openai: ['api.openai.com', '*.openai.com'],
    deepseek: ['api.deepseek.com', '*.deepseek.com'],
    openrouter: ['openrouter.ai', '*.openrouter.ai'],
  },
} as const;

/**
 * Convert CIDR notation to IP range
 */
function cidrToRange(cidr: string): { start: bigint; end: bigint } | null {
  const [ip, prefixLen] = cidr.split('/');
  if (!ip || prefixLen === undefined) return null;

  const prefix = parseInt(prefixLen, 10);
  const isIPv6 = ip.includes(':');

  if (isIPv6) {
    // IPv6 handling
    const expandedIP = expandIPv6(ip);
    if (!expandedIP) return null;

    const ipBigInt = ipv6ToBigInt(expandedIP);
    const maxPrefix = 128n;
    const mask = (2n ** maxPrefix - 1n) << (maxPrefix - BigInt(prefix));
    const start = ipBigInt & mask;
    const end = start | (2n ** (maxPrefix - BigInt(prefix)) - 1n);

    return { start, end };
  } else {
    // IPv4 handling
    const parts = ip.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return null;

    const ipBigInt =
      BigInt(parts[0]) * 16777216n + BigInt(parts[1]) * 65536n + BigInt(parts[2]) * 256n + BigInt(parts[3]);
    const maxPrefix = 32n;
    const mask = (2n ** maxPrefix - 1n) << (maxPrefix - BigInt(prefix));
    const start = ipBigInt & mask;
    const end = start | (2n ** (maxPrefix - BigInt(prefix)) - 1n);

    return { start, end };
  }
}

/**
 * Expand IPv6 address to full notation
 */
function expandIPv6(ip: string): string | null {
  try {
    // Handle IPv4-mapped IPv6 addresses
    if (ip.includes('.')) {
      const parts = ip.split(':');
      const lastPart = parts[parts.length - 1];
      if (lastPart?.includes('.')) {
        const ipv4Parts = lastPart.split('.').map((p) => parseInt(p, 10));
        if (ipv4Parts.length === 4) {
          const hex1 = (ipv4Parts[0] * 256 + ipv4Parts[1]).toString(16).padStart(4, '0');
          const hex2 = (ipv4Parts[2] * 256 + ipv4Parts[3]).toString(16).padStart(4, '0');
          parts[parts.length - 1] = `${hex1}:${hex2}`;
          ip = parts.join(':');
        }
      }
    }

    // Handle :: expansion
    if (ip.includes('::')) {
      const [left, right] = ip.split('::');
      const leftParts = left ? left.split(':') : [];
      const rightParts = right ? right.split(':') : [];
      const missing = 8 - leftParts.length - rightParts.length;
      const expanded = [...leftParts, ...Array(missing).fill('0000'), ...rightParts];
      return expanded.map((p) => (p || '0000').padStart(4, '0')).join(':');
    }

    // Handle single IPv6 address
    const parts = ip.split(':');
    return parts.map((p) => p.padStart(4, '0')).join(':');
  } catch {
    return null;
  }
}

/**
 * Convert IPv6 address to BigInt
 */
function ipv6ToBigInt(ip: string): bigint {
  const parts = ip.split(':');
  let result = 0n;
  for (const part of parts) {
    result = result * 65536n + BigInt(parseInt(part, 16));
  }
  return result;
}

/**
 * Check if an IP address is in a private range
 */
function isPrivateIP(ip: string): boolean {
  const isIPv6 = ip.includes(':');

  let ipBigInt: bigint;
  if (isIPv6) {
    const expandedIP = expandIPv6(ip);
    if (!expandedIP) return false;
    ipBigInt = ipv6ToBigInt(expandedIP);
  } else {
    const parts = ip.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return false;
    ipBigInt = BigInt(parts[0]) * 16777216n + BigInt(parts[1]) * 65536n + BigInt(parts[2]) * 256n + BigInt(parts[3]);
  }

  const ranges = isIPv6 ? SSRF_CONFIG.PRIVATE_IPV6_RANGES : SSRF_CONFIG.PRIVATE_IPV4_RANGES;

  for (const cidr of ranges) {
    const range = cidrToRange(cidr);
    if (range && ipBigInt >= range.start && ipBigInt <= range.end) {
      return true;
    }
  }

  return false;
}

/**
 * Match hostname against allowlist pattern
 * Supports wildcards like *.example.com
 */
function matchesPattern(hostname: string, pattern: string): boolean {
  if (pattern.startsWith('*.')) {
    const baseDomain = pattern.slice(2);
    return hostname === baseDomain || hostname.endsWith('.' + baseDomain);
  }
  return hostname === pattern;
}

/**
 * DNS resolution result with cache
 */
const dnsCache = new Map<string, { ips: string[]; timestamp: number }>();
const DNS_CACHE_TTL = 60000; // 1 minute

/**
 * Resolve hostname to IP addresses with DNS cache
 */
async function resolveHostname(hostname: string): Promise<string[]> {
  const cached = dnsCache.get(hostname);
  if (cached && Date.now() - cached.timestamp < DNS_CACHE_TTL) {
    return cached.ips;
  }

  try {
    // Try IPv4 first
    const ipv4Addresses = await dns.resolve4(hostname).catch(() => [] as string[]);

    // Also try IPv6
    const ipv6Addresses = await dns.resolve6(hostname).catch(() => [] as string[]);

    const ips = [...ipv4Addresses, ...ipv6Addresses];

    if (ips.length > 0) {
      dnsCache.set(hostname, { ips, timestamp: Date.now() });
    }

    return ips;
  } catch (error) {
    logger.warn('DNS resolution failed', { hostname, error: String(error) });
    return [];
  }
}

/**
 * URL validation result
 */
export interface URLValidationResult {
  valid: boolean;
  error?: string;
  resolvedIPs?: string[];
}

/**
 * Validate URL for SSRF protection
 *
 * @param urlString - URL to validate
 * @param provider - Provider type (openai, deepseek, openrouter, other)
 * @param options - Additional options
 * @returns Validation result
 */
export async function validateURLForSSRF(
  urlString: string,
  provider: 'openai' | 'deepseek' | 'openrouter' | 'other',
  options?: { skipDNSResolution?: boolean }
): Promise<URLValidationResult> {
  // 1. Parse URL
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // 2. Check protocol - only HTTPS is allowed
  if (url.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTPS protocol is allowed' };
  }

  const hostname = url.hostname.toLowerCase();

  // 3. Check if hostname is an IP address directly
  const isDirectIP =
    /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || /^[0-9a-fA-F:]+$/.test(hostname);

  if (isDirectIP) {
    // Direct IP is not allowed for built-in providers
    if (provider !== 'other') {
      return { valid: false, error: 'Direct IP addresses are not allowed for built-in providers' };
    }

    // Check if IP is in private range
    if (isPrivateIP(hostname)) {
      return { valid: false, error: 'Private or reserved IP addresses are not allowed' };
    }

    return { valid: true, resolvedIPs: [hostname] };
  }

  // 4. For built-in providers, check domain allowlist
  if (provider !== 'other') {
    const trustedDomains = SSRF_CONFIG.TRUSTED_PROVIDER_DOMAINS[provider] || [];
    const isAllowed = trustedDomains.some((pattern) => matchesPattern(hostname, pattern));

    if (!isAllowed) {
      return {
        valid: false,
        error: `Domain "${hostname}" is not in the trusted domains for provider "${provider}"`,
      };
    }

    // For trusted domains, we can skip DNS resolution check
    return { valid: true };
  }

  // 5. For "other" provider, resolve DNS and check IPs
  if (!options?.skipDNSResolution) {
    const resolvedIPs = await resolveHostname(hostname);

    if (resolvedIPs.length === 0) {
      return { valid: false, error: 'Could not resolve hostname' };
    }

    // Check all resolved IPs
    for (const ip of resolvedIPs) {
      if (isPrivateIP(ip)) {
        logger.warn('SSRF attempt blocked: hostname resolved to private IP', {
          hostname,
          resolvedIP: ip,
        });
        return {
          valid: false,
          error: 'Hostname resolved to a private or reserved IP address',
        };
      }
    }

    return { valid: true, resolvedIPs };
  }

  return { valid: true };
}

/**
 * Synchronous URL validation (without DNS resolution)
 * Used when DNS resolution is not available or for quick checks
 */
export function validateURLForSSRFSync(
  urlString: string,
  provider: 'openai' | 'deepseek' | 'openrouter' | 'other'
): URLValidationResult {
  // 1. Parse URL
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // 2. Check protocol - only HTTPS is allowed
  if (url.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTPS protocol is allowed' };
  }

  const hostname = url.hostname.toLowerCase();

  // 3. Check if hostname is an IP address directly
  const isDirectIP =
    /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || /^[0-9a-fA-F:]+$/.test(hostname);

  if (isDirectIP) {
    // Direct IP is not allowed for built-in providers
    if (provider !== 'other') {
      return { valid: false, error: 'Direct IP addresses are not allowed for built-in providers' };
    }

    // Check if IP is in private range
    if (isPrivateIP(hostname)) {
      return { valid: false, error: 'Private or reserved IP addresses are not allowed' };
    }

    return { valid: true, resolvedIPs: [hostname] };
  }

  // 4. For built-in providers, check domain allowlist
  if (provider !== 'other') {
    const trustedDomains = SSRF_CONFIG.TRUSTED_PROVIDER_DOMAINS[provider] || [];
    const isAllowed = trustedDomains.some((pattern) => matchesPattern(hostname, pattern));

    if (!isAllowed) {
      return {
        valid: false,
        error: `Domain "${hostname}" is not in the trusted domains for provider "${provider}"`,
      };
    }
  }

  return { valid: true };
}

/**
 * Export helper functions for testing
 */
export const _internal = {
  isPrivateIP,
  cidrToRange,
  expandIPv6,
  ipv6ToBigInt,
  matchesPattern,
  SSRF_CONFIG,
};
