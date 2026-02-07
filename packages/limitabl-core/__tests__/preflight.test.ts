import { describe, it, expect, afterEach } from "vitest";
import { LimitablEngine } from "../src/preflight.js";

describe("LimitablEngine", () => {
  let engine: LimitablEngine;

  afterEach(() => {
    engine?.destroy();
  });

  it("allows when no limits configured", () => {
    engine = new LimitablEngine({});
    const result = engine.preflight({ sub: "user1" });
    expect(result.allowed).toBe(true);
  });

  it("enforces rate limits", () => {
    engine = new LimitablEngine({ rateLimit: { windowMs: 60_000, maxRequests: 2 } });
    const key = { sub: "user1" };

    expect(engine.preflight(key).allowed).toBe(true);
    expect(engine.preflight(key).allowed).toBe(true);
    expect(engine.preflight(key).allowed).toBe(false);
  });

  it("enforces budget limits", () => {
    engine = new LimitablEngine({ budget: { maxSpend: 50, periodMs: 86_400_000 } });
    const key = { sub: "user1" };

    engine.recordUsage({ key, usage: { timestamp: Date.now(), cost: 45 } });
    const result = engine.preflight(key, { estimatedCost: 10 });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Budget exceeded");
  });

  it("enforces agent guard", () => {
    engine = new LimitablEngine({ agentGuard: { maxToolCalls: 2 } });
    const key = { sub: "user1" };

    engine.recordUsage({ key, usage: { timestamp: Date.now(), cost: 0 }, workflowId: "wf1" });
    engine.recordUsage({ key, usage: { timestamp: Date.now(), cost: 0 }, workflowId: "wf1" });

    const result = engine.preflight(key, { workflowId: "wf1" });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("max tool calls");
  });

  it("runs all checks together", () => {
    engine = new LimitablEngine({
      rateLimit: { windowMs: 60_000, maxRequests: 100 },
      budget: { maxSpend: 1000, periodMs: 86_400_000 },
      agentGuard: { maxToolCalls: 50 },
    });

    const result = engine.preflight({ sub: "user1" }, { workflowId: "wf1" });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("All checks passed");
  });
});
