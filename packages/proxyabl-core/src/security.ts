// packages/proxyabl-core/src/security.ts
//
// SSRF protection and header sanitization for proxy forwarding.
// Extracted from gatewaystack-connect security.ts.

export interface UrlSafetyConfig {
  allowedHosts: string[];
  allowHttp?: boolean;       // default false (HTTPS only)
  blockPrivateIps?: boolean; // default true
}

function normalizeHost(h: string): string {
  return h.trim().toLowerCase();
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((x) => Number(x));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;

  const [a, b] = parts;

  if (a === 10) return true;                          // 10.0.0.0/8
  if (a === 127) return true;                         // 127.0.0.0/8
  if (a === 169 && b === 254) return true;            // 169.254.0.0/16
  if (a === 172 && b >= 16 && b <= 31) return true;   // 172.16.0.0/12
  if (a === 192 && b === 168) return true;            // 192.168.0.0/16
  if (a === 0) return true;                           // 0.0.0.0/8

  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const s = ip.toLowerCase();
  if (s === "::1") return true;
  if (s.startsWith("fc") || s.startsWith("fd")) return true;
  if (s.startsWith("fe8") || s.startsWith("fe9") || s.startsWith("fea") || s.startsWith("feb")) return true;
  return false;
}

function isIp(host: string): false | 4 | 6 {
  // Simple detection — covers dotted-quad IPv4 and bracket-stripped IPv6
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return 4;
  if (host.includes(":")) return 6;
  return false;
}

/**
 * Assert that a URL is safe for proxy forwarding.
 * Throws if:
 * - Protocol is not HTTPS (unless allowHttp is true)
 * - Hostname is not in allowedHosts
 * - Hostname resolves to a private IP (unless blockPrivateIps is false)
 *
 * NOTE: This is the synchronous/pure version. It checks IP-literal hosts directly
 * but does NOT do DNS resolution (that requires Node `dns` module).
 * For full DNS-level SSRF protection in Node, use the async version in
 * gatewaystack-connect's security.ts which calls dns.lookup().
 */
export function assertUrlSafe(url: URL, config: UrlSafetyConfig): void {
  const { allowedHosts, allowHttp = false, blockPrivateIps = true } = config;

  const proto = url.protocol.toLowerCase();
  if (proto !== "https:" && !(allowHttp && proto === "http:")) {
    throw new Error(`Blocked protocol: ${url.protocol}`);
  }

  const host = normalizeHost(url.hostname);
  const allowed = allowedHosts.map(normalizeHost);

  if (!allowed.includes(host)) {
    throw new Error(`Blocked host: ${host} (not in allowedHosts)`);
  }

  if (blockPrivateIps) {
    const ipType = isIp(host);
    if (ipType === 4 && isPrivateIpv4(host)) {
      throw new Error(`Blocked private IPv4 host: ${host}`);
    }
    if (ipType === 6 && isPrivateIpv6(host)) {
      throw new Error(`Blocked private IPv6 host: ${host}`);
    }
  }
}

/**
 * Sanitize a header value to prevent CRLF injection.
 */
export function sanitizeHeaderValue(v: string): string {
  return v.replace(/[\r\n]+/g, " ").trim();
}
