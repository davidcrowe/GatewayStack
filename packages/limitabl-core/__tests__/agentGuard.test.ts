import { describe, it, expect } from "vitest";
import { AgentGuard } from "../src/agentGuard.js";

describe("AgentGuard", () => {
  it("allows within limits", () => {
    const guard = new AgentGuard({ maxToolCalls: 10, maxWorkflowCost: 500, maxDurationMs: 60_000 });
    const result = guard.check("wf1");
    expect(result.allowed).toBe(true);
    expect(result.toolCallCount).toBe(0);
  });

  it("denies when tool call limit exceeded", () => {
    const guard = new AgentGuard({ maxToolCalls: 3 });

    guard.recordToolCall("wf1");
    guard.recordToolCall("wf1");
    guard.recordToolCall("wf1");

    const result = guard.check("wf1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("max tool calls");
  });

  it("denies when cost limit exceeded", () => {
    const guard = new AgentGuard({ maxWorkflowCost: 100 });

    guard.recordToolCall("wf1", 60);
    guard.recordToolCall("wf1", 50);

    const result = guard.check("wf1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("max cost");
  });

  it("tracks separate workflows independently", () => {
    const guard = new AgentGuard({ maxToolCalls: 2 });

    guard.recordToolCall("wf1");
    guard.recordToolCall("wf1");

    // wf1 is at limit
    expect(guard.check("wf1").allowed).toBe(false);
    // wf2 is fresh
    expect(guard.check("wf2").allowed).toBe(true);
  });

  it("cleans up after endWorkflow", () => {
    const guard = new AgentGuard({ maxToolCalls: 2 });

    guard.recordToolCall("wf1");
    guard.recordToolCall("wf1");
    expect(guard.check("wf1").allowed).toBe(false);

    guard.endWorkflow("wf1");
    // Fresh state after end
    expect(guard.check("wf1").allowed).toBe(true);
  });

  it("reports duration", () => {
    const guard = new AgentGuard({ maxDurationMs: 60_000 });
    const result = guard.check("wf1");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.durationMs).toBeLessThan(1000);
  });
});
