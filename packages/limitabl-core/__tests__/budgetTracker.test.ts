import { describe, it, expect, afterEach } from "vitest";
import { InMemoryBudgetTracker } from "../src/budgetTracker.js";

describe("InMemoryBudgetTracker", () => {
  let tracker: InMemoryBudgetTracker;

  afterEach(() => {
    tracker?.destroy();
  });

  it("allows when within budget", () => {
    tracker = new InMemoryBudgetTracker({ maxSpend: 1000, periodMs: 86_400_000 });
    const result = tracker.check({ sub: "user1" });
    expect(result.allowed).toBe(true);
    expect(result.currentSpend).toBe(0);
    expect(result.percentUsed).toBe(0);
  });

  it("denies when budget exceeded", () => {
    tracker = new InMemoryBudgetTracker({ maxSpend: 100, periodMs: 86_400_000 });
    const key = { sub: "user1" };

    tracker.record(key, { timestamp: Date.now(), cost: 90 });
    const result = tracker.check(key, 20); // 90 + 20 = 110 > 100
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Budget exceeded");
  });

  it("tracks estimated cost in preflight", () => {
    tracker = new InMemoryBudgetTracker({ maxSpend: 100, periodMs: 86_400_000 });
    const key = { sub: "user1" };

    tracker.record(key, { timestamp: Date.now(), cost: 80 });

    // 80 + 15 = 95 < 100 → allowed
    expect(tracker.check(key, 15).allowed).toBe(true);

    // 80 + 25 = 105 > 100 → denied
    expect(tracker.check(key, 25).allowed).toBe(false);
  });

  it("calculates percentUsed", () => {
    tracker = new InMemoryBudgetTracker({ maxSpend: 200, periodMs: 86_400_000 });
    const key = { sub: "user1" };
    tracker.record(key, { timestamp: Date.now(), cost: 100 });

    const result = tracker.check(key);
    expect(result.percentUsed).toBe(50);
  });

  it("provides usage summary", () => {
    tracker = new InMemoryBudgetTracker({ maxSpend: 1000, periodMs: 86_400_000 });
    const key = { sub: "user1" };

    tracker.record(key, { timestamp: Date.now(), cost: 10, tokens: 100 });
    tracker.record(key, { timestamp: Date.now(), cost: 20, tokens: 200 });

    const summary = tracker.getUsageSummary(key);
    expect(summary.totalSpend).toBe(30);
    expect(summary.totalTokens).toBe(300);
    expect(summary.requestCount).toBe(2);
  });
});
