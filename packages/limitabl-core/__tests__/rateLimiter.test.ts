import { describe, it, expect, afterEach } from "vitest";
import { InMemoryRateLimiter, resolveKey } from "../src/rateLimiter.js";

describe("resolveKey", () => {
  it("prefers sub over orgId and ip", () => {
    expect(resolveKey({ sub: "u1", orgId: "o1", ip: "1.2.3.4" })).toBe("u:u1");
  });

  it("falls back to orgId", () => {
    expect(resolveKey({ orgId: "o1" })).toBe("o:o1");
  });

  it("falls back to ip", () => {
    expect(resolveKey({ ip: "1.2.3.4" })).toBe("ip:1.2.3.4");
  });

  it("uses anonymous as last resort", () => {
    expect(resolveKey({})).toBe("anonymous");
  });

  it("includes tenantId prefix", () => {
    expect(resolveKey({ tenantId: "t1", sub: "u1" })).toBe("t:t1|u:u1");
  });
});

describe("InMemoryRateLimiter", () => {
  let limiter: InMemoryRateLimiter;

  afterEach(() => {
    limiter?.destroy();
  });

  it("allows requests within limit", () => {
    limiter = new InMemoryRateLimiter({ windowMs: 60_000, maxRequests: 5 });
    const result = limiter.check({ sub: "user1" });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("denies when limit exceeded", () => {
    limiter = new InMemoryRateLimiter({ windowMs: 60_000, maxRequests: 3 });
    const key = { sub: "user1" };

    limiter.check(key); // 1
    limiter.check(key); // 2
    limiter.check(key); // 3

    const result = limiter.check(key); // 4 — should be denied
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSec).toBeGreaterThan(0);
  });

  it("isolates different users", () => {
    limiter = new InMemoryRateLimiter({ windowMs: 60_000, maxRequests: 1 });

    const r1 = limiter.check({ sub: "user1" });
    const r2 = limiter.check({ sub: "user2" });

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });

  it("provides resetAt timestamp", () => {
    limiter = new InMemoryRateLimiter({ windowMs: 60_000, maxRequests: 10 });
    const result = limiter.check({ sub: "user1" });
    expect(result.resetAt).toBeGreaterThan(Date.now() - 1000);
  });
});
