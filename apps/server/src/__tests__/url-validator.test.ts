import {
  validateURLForSSRF,
  validateURLForSSRFSync,
  _internal,
} from '../utils/url-validator.js';

const { isPrivateIP, matchesPattern, cidrToRange, expandIPv6, ipv6ToBigInt } = _internal;

describe('URL Validator - SSRF Protection', () => {
  describe('isPrivateIP', () => {
    describe('IPv4', () => {
      it('should identify loopback addresses', () => {
        expect(isPrivateIP('127.0.0.1')).toBe(true);
        expect(isPrivateIP('127.0.0.2')).toBe(true);
        expect(isPrivateIP('127.255.255.255')).toBe(true);
      });

      it('should identify private network addresses', () => {
        // 10.0.0.0/8
        expect(isPrivateIP('10.0.0.1')).toBe(true);
        expect(isPrivateIP('10.255.255.255')).toBe(true);

        // 172.16.0.0/12
        expect(isPrivateIP('172.16.0.1')).toBe(true);
        expect(isPrivateIP('172.31.255.255')).toBe(true);

        // 192.168.0.0/16
        expect(isPrivateIP('192.168.0.1')).toBe(true);
        expect(isPrivateIP('192.168.1.1')).toBe(true);
        expect(isPrivateIP('192.168.255.255')).toBe(true);
      });

      it('should identify link-local addresses', () => {
        expect(isPrivateIP('169.254.0.1')).toBe(true);
        expect(isPrivateIP('169.254.169.254')).toBe(true); // AWS metadata service
      });

      it('should identify "this" network', () => {
        expect(isPrivateIP('0.0.0.0')).toBe(true);
        expect(isPrivateIP('0.0.0.1')).toBe(true);
      });

      it('should identify documentation ranges', () => {
        expect(isPrivateIP('192.0.2.1')).toBe(true); // TEST-NET-1
        expect(isPrivateIP('198.51.100.1')).toBe(true); // TEST-NET-2
        expect(isPrivateIP('203.0.113.1')).toBe(true); // TEST-NET-3
      });

      it('should identify multicast and reserved', () => {
        expect(isPrivateIP('224.0.0.1')).toBe(true); // Multicast
        expect(isPrivateIP('240.0.0.1')).toBe(true); // Reserved
        expect(isPrivateIP('255.255.255.255')).toBe(true); // Broadcast
      });

      it('should not identify public IPs as private', () => {
        expect(isPrivateIP('8.8.8.8')).toBe(false); // Google DNS
        expect(isPrivateIP('1.1.1.1')).toBe(false); // Cloudflare DNS
        expect(isPrivateIP('208.67.222.222')).toBe(false); // OpenDNS
      });
    });

    describe('IPv6', () => {
      it('should identify loopback addresses', () => {
        expect(isPrivateIP('::1')).toBe(true);
        expect(isPrivateIP('0000:0000:0000:0000:0000:0000:0000:0001')).toBe(true);
      });

      it('should identify unique local addresses', () => {
        expect(isPrivateIP('fc00::1')).toBe(true);
        expect(isPrivateIP('fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff')).toBe(true);
      });

      it('should identify link-local addresses', () => {
        expect(isPrivateIP('fe80::1')).toBe(true);
        expect(isPrivateIP('febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff')).toBe(true);
      });

      it('should identify IPv4-mapped addresses', () => {
        expect(isPrivateIP('::ffff:127.0.0.1')).toBe(true);
        expect(isPrivateIP('::ffff:192.168.1.1')).toBe(true);
      });

      it('should identify documentation ranges', () => {
        expect(isPrivateIP('2001:db8::1')).toBe(true);
      });

      it('should not identify public IPv6 as private', () => {
        expect(isPrivateIP('2001:4860:4860::8888')).toBe(false); // Google DNS
      });
    });
  });

  describe('matchesPattern', () => {
    it('should match exact hostnames', () => {
      expect(matchesPattern('api.openai.com', 'api.openai.com')).toBe(true);
      expect(matchesPattern('api.openai.com', 'api.deepseek.com')).toBe(false);
    });

    it('should match wildcard patterns', () => {
      expect(matchesPattern('api.openai.com', '*.openai.com')).toBe(true);
      expect(matchesPattern('chat.openai.com', '*.openai.com')).toBe(true);
      expect(matchesPattern('deep.api.openai.com', '*.openai.com')).toBe(true);
      expect(matchesPattern('openai.com', '*.openai.com')).toBe(true); // Wildcard also matches base domain
      expect(matchesPattern('evil.com', '*.openai.com')).toBe(false);
    });
  });

  describe('validateURLForSSRFSync', () => {
    describe('Protocol validation', () => {
      it('should reject non-HTTPS URLs', () => {
        const result = validateURLForSSRFSync('http://api.openai.com/v1', 'openai');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('HTTPS');
      });

      it('should accept HTTPS URLs', () => {
        const result = validateURLForSSRFSync('https://api.openai.com/v1', 'openai');
        expect(result.valid).toBe(true);
      });
    });

    describe('Built-in provider domain validation', () => {
      it('should accept default OpenAI domains', () => {
        const result = validateURLForSSRFSync('https://api.openai.com/v1', 'openai');
        expect(result.valid).toBe(true);
      });

      it('should accept default DeepSeek domains', () => {
        const result = validateURLForSSRFSync('https://api.deepseek.com/v1', 'deepseek');
        expect(result.valid).toBe(true);
      });

      it('should accept default OpenRouter domains', () => {
        const result = validateURLForSSRFSync('https://openrouter.ai/api/v1', 'openrouter');
        expect(result.valid).toBe(true);
      });

      it('should reject untrusted domains for built-in providers', () => {
        const result = validateURLForSSRFSync('https://evil.com/v1', 'openai');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('not in the trusted domains');
      });

      it('should reject direct IP for built-in providers', () => {
        const result = validateURLForSSRFSync('https://104.18.33.239/v1', 'openai');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Direct IP addresses are not allowed');
      });
    });

    describe('Custom provider (other) validation', () => {
      it('should accept public IPs for other provider', () => {
        const result = validateURLForSSRFSync('https://104.18.33.239/v1', 'other');
        expect(result.valid).toBe(true);
      });

      it('should reject private IPs for other provider', () => {
        const result = validateURLForSSRFSync('https://192.168.1.1/v1', 'other');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Private or reserved IP addresses');
      });

      it('should reject loopback for other provider', () => {
        const result = validateURLForSSRFSync('https://127.0.0.1/v1', 'other');
        expect(result.valid).toBe(false);
      });

      it('should reject link-local for other provider', () => {
        const result = validateURLForSSRFSync('https://169.254.169.254/v1', 'other');
        expect(result.valid).toBe(false);
      });

      it('should accept any domain for other provider (sync version)', () => {
        // Sync version doesn't do DNS resolution, so it allows any domain
        const result = validateURLForSSRFSync('https://internal.local/v1', 'other');
        expect(result.valid).toBe(true);
      });
    });

    describe('URL format validation', () => {
      it('should reject malformed URLs', () => {
        const result = validateURLForSSRFSync('not-a-url', 'other');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid URL format');
      });

      it('should reject empty URLs', () => {
        const result = validateURLForSSRFSync('', 'other');
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('validateURLForSSRF (async)', () => {
    describe('Built-in provider with custom URL override', () => {
      it('should reject override to untrusted domain', async () => {
        const result = await validateURLForSSRF('https://evil.com/v1', 'openai');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('not in the trusted domains');
      });

      it('should accept override to trusted domain', async () => {
        const result = await validateURLForSSRF('https://api.openai.com/v1', 'openai');
        expect(result.valid).toBe(true);
      });
    });

    describe('DNS resolution for other provider', () => {
      it('should resolve and validate DNS for other provider', async () => {
        // Test with a known public domain
        const result = await validateURLForSSRF('https://example.com/v1', 'other');
        // Note: This test might fail in environments without DNS access
        // In CI, we might want to mock DNS or skip this test
        if (result.valid) {
          expect(result.resolvedIPs).toBeDefined();
          expect(result.resolvedIPs!.length).toBeGreaterThan(0);
        } else {
          // If DNS fails, that's acceptable for this test
          expect(result.error).toContain('resolve');
        }
      });

      it('should skip DNS resolution when option is set', async () => {
        const result = await validateURLForSSRF('https://example.com/v1', 'other', {
          skipDNSResolution: true,
        });
        expect(result.valid).toBe(true);
        expect(result.resolvedIPs).toBeUndefined();
      });
    });
  });

  describe('CIDR range calculations', () => {
    it('should correctly calculate IPv4 CIDR ranges', () => {
      // 10.0.0.0/8
      const range = cidrToRange('10.0.0.0/8');
      expect(range).not.toBeNull();
      expect(range!.start.toString()).toBe('167772160'); // 10.0.0.0
      expect(range!.end.toString()).toBe('184549375'); // 10.255.255.255
    });

    it('should correctly calculate IPv6 CIDR ranges', () => {
      // ::1/128
      const range = cidrToRange('::1/128');
      expect(range).not.toBeNull();
      expect(range!.start).toBe(range!.end); // Single address
    });
  });

  describe('IPv6 address handling', () => {
    it('should expand IPv6 addresses correctly', () => {
      expect(expandIPv6('::1')).toBe('0000:0000:0000:0000:0000:0000:0000:0001');
      expect(expandIPv6('fe80::1')).toBe('fe80:0000:0000:0000:0000:0000:0000:0001');
      expect(expandIPv6('2001:db8::1')).toBe('2001:0db8:0000:0000:0000:0000:0000:0001');
    });

    it('should convert IPv6 to BigInt correctly', () => {
      expect(ipv6ToBigInt('0000:0000:0000:0000:0000:0000:0000:0001')).toBe(1n);
      expect(ipv6ToBigInt('0000:0000:0000:0000:0000:0000:0000:ffff')).toBe(65535n);
    });

    it('should handle IPv4-mapped IPv6 addresses', () => {
      const expanded = expandIPv6('::ffff:192.168.1.1');
      expect(expanded).toBe('0000:0000:0000:0000:0000:ffff:c0a8:0101');
    });
  });

  describe('SSRF bypass patterns', () => {
    it('should block decimal IP representation (Node.js normalizes to standard IP)', () => {
      // 2130706433 = 127.0.0.1 in decimal
      // Node.js URL parser automatically normalizes this to 127.0.0.1
      const syncResult = validateURLForSSRFSync('https://2130706433/v1', 'other');
      // Node.js converts decimal IP to standard format, so our validator catches it
      expect(syncResult.valid).toBe(false);
      expect(syncResult.error).toContain('Private or reserved IP addresses');
    });

    it('should block octal IP representation (Node.js normalizes to standard IP)', () => {
      // 0177.0.0.1 = 127.0.0.1 in octal
      // Node.js URL parser automatically normalizes this to 127.0.0.1
      const result = validateURLForSSRFSync('https://0177.0.0.1/v1', 'other');
      // Node.js converts octal IP to standard format, so our validator catches it
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Private or reserved IP addresses');
    });

    it('should block IPv6 loopback variants', () => {
      expect(isPrivateIP('::1')).toBe(true);
      expect(isPrivateIP('0:0:0:0:0:0:0:1')).toBe(true);
      expect(isPrivateIP('0000:0000:0000:0000:0000:0000:0000:0001')).toBe(true);
    });

    it('should block IPv6-mapped IPv4 private addresses', () => {
      expect(isPrivateIP('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateIP('::ffff:10.0.0.1')).toBe(true);
      expect(isPrivateIP('::ffff:192.168.1.1')).toBe(true);
    });

    it('should block IPv4-compatible IPv6 addresses', () => {
      // ::ffff:127.0.0.1 is IPv4-mapped IPv6
      expect(isPrivateIP('::ffff:127.0.0.1')).toBe(true);
      // ::ffff:7f00:1 would be ::ffff:127.0.0.1 if valid, but this format isn't standard
      // Testing the actual IPv4-mapped format
      expect(isPrivateIP('::ffff:7f00:0001')).toBe(true); // 127.0.0.1 in IPv4-mapped format
    });

    it('should block short IPv6 notation variants', () => {
      // Various IPv6 loopback notations
      expect(isPrivateIP('::1')).toBe(true);
      expect(isPrivateIP('0::1')).toBe(true);
      // ::0.0.0.1 is not standard IPv6, but ::ffff:0.0.0.1 is
      expect(isPrivateIP('::ffff:0.0.0.1')).toBe(true);
    });

    it('should block link-local IPv6 addresses', () => {
      expect(isPrivateIP('fe80::1')).toBe(true);
      expect(isPrivateIP('fe80::1ff:fe23:4567:890a')).toBe(true);
    });

    it('should block unique local IPv6 addresses', () => {
      expect(isPrivateIP('fc00::1')).toBe(true);
      expect(isPrivateIP('fd00::1')).toBe(true);
      expect(isPrivateIP('fd12:3456:789a::1')).toBe(true);
    });

    it('should block IPv6 documentation addresses', () => {
      expect(isPrivateIP('2001:db8::1')).toBe(true);
      expect(isPrivateIP('2001:0db8:85a3::8a2e:0370:7334')).toBe(true);
    });
  });

  describe('Cloud metadata endpoint protection', () => {
    it('should block AWS metadata IP', () => {
      expect(isPrivateIP('169.254.169.254')).toBe(true);
    });

    it('should block GCP metadata IP', () => {
      expect(isPrivateIP('169.254.169.254')).toBe(true); // Same as AWS
    });

    it('should block Azure metadata IP', () => {
      expect(isPrivateIP('169.254.169.254')).toBe(true); // Same as AWS
    });
  });

  describe('Edge cases', () => {
    it('should handle URLs with ports', () => {
      const result = validateURLForSSRFSync('https://api.openai.com:443/v1', 'openai');
      expect(result.valid).toBe(true);
    });

    it('should handle URLs with paths', () => {
      const result = validateURLForSSRFSync('https://api.openai.com/v1/chat', 'openai');
      expect(result.valid).toBe(true);
    });

    it('should handle URLs with query strings', () => {
      const result = validateURLForSSRFSync('https://api.openai.com/v1?test=1', 'openai');
      expect(result.valid).toBe(true);
    });

    it('should handle URLs with fragments', () => {
      const result = validateURLForSSRFSync('https://api.openai.com/v1#section', 'openai');
      expect(result.valid).toBe(true);
    });

    it('should be case-insensitive for hostnames', () => {
      const result = validateURLForSSRFSync('https://API.OPENAI.COM/v1', 'openai');
      expect(result.valid).toBe(true);
    });

    it('should handle subdomains', () => {
      const result = validateURLForSSRFSync('https://chat.openai.com/v1', 'openai');
      expect(result.valid).toBe(true);
    });
  });
});
