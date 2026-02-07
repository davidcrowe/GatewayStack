// packages/limitabl-core/src/rateLimiter.ts
//
// Sliding window rate limiter. In-memory implementation.
//
// FUTURE WORK:
// - Redis adapter: replace InMemoryRateLimiter with RedisRateLimiter
//   that uses MULTI/EXEC for atomic window operations.
// - Token bucket algorithm option for burst-friendly workloads.

import type { LimitKey, RateLimitConfig, RateLimitResult } from "./types.js";

interface WindowEntry {
  timestamps: number[];
}

/**
 * Resolve a LimitKey to a string key.
 * Priority: sub > orgId > ip > "anonymous".
 */
export function resolveKey(key: LimitKey): string {
  const parts: string[] = [];
  if (key.tenantId) parts.push(`t:${key.tenantId}`);
  if (key.sub) parts.push(`u:${key.sub}`);
  else if (key.orgId) parts.push(`o:${key.orgId}`);
  else if (key.ip) parts.push(`ip:${key.ip}`);
  else parts.push("anonymous");
  return parts.join("|");
}

export class InMemoryRateLimiter {
  private windows = new Map<string, WindowEntry>();
  private config: RateLimitConfig;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: RateLimitConfig) {
    this.config = config;
    // Periodically clean expired entries
    this.cleanupInterval = setInterval(() => this.cleanup(), config.windowMs * 2);
    // Allow process to exit even if interval is active
    if (this.cleanupInterval.unref) this.cleanupInterval.unref();
  }

  /** Check if a request is allowed and record it if so. */
  check(key: LimitKey): RateLimitResult {
    const k = resolveKey(key);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let entry = this.windows.get(k);
    if (!entry) {
      entry = { timestamps: [] };
      this.windows.set(k, entry);
    }

    // Remove expired timestamps
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    if (entry.timestamps.length >= this.config.maxRequests) {
      const oldestInWindow = entry.timestamps[0];
      const resetAt = oldestInWindow + this.config.windowMs;
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfterSec: Math.ceil((resetAt - now) / 1000),
      };
    }

    // Record this request
    entry.timestamps.push(now);

    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.timestamps.length,
      resetAt: now + this.config.windowMs,
    };
  }

  /** Remove expired entries to prevent memory growth. */
  private cleanup() {
    const cutoff = Date.now() - this.config.windowMs;
    for (const [key, entry] of this.windows) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) this.windows.delete(key);
    }
  }

  /** Stop the cleanup interval (for graceful shutdown / testing). */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
