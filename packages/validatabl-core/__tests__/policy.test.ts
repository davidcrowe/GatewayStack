import { describe, it, expect } from "vitest";
import { applyPolicies } from "../src/policy.js";
import type { PolicySet, PolicyRequest } from "../src/types.js";

describe("applyPolicies", () => {
  it("denies by default when no rules match", () => {
    const policySet: PolicySet = { rules: [] };
    const request: PolicyRequest = { identity: { sub: "user1" } };
    const result = applyPolicies(policySet, request);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("default: deny");
  });

  it("allows by default when defaultEffect is allow", () => {
    const policySet: PolicySet = { rules: [], defaultEffect: "allow" };
    const request: PolicyRequest = { identity: { sub: "user1" } };
    const result = applyPolicies(policySet, request);
    expect(result.allowed).toBe(true);
  });

  it("matches equals condition", () => {
    const policySet: PolicySet = {
      rules: [
        {
          id: "allow-admin",
          effect: "allow",
          conditions: [{ field: "sub", operator: "equals", value: "admin" }],
        },
      ],
    };
    const result = applyPolicies(policySet, { identity: { sub: "admin" } });
    expect(result.allowed).toBe(true);
    expect(result.matchedRule?.id).toBe("allow-admin");
  });

  it("matches contains condition on scope", () => {
    const policySet: PolicySet = {
      rules: [
        {
          id: "require-read",
          effect: "allow",
          conditions: [{ field: "scope", operator: "contains", value: "read" }],
        },
      ],
    };
    const result = applyPolicies(policySet, { identity: { scope: "read write" } });
    expect(result.allowed).toBe(true);
  });

  it("matches 'in' condition", () => {
    const policySet: PolicySet = {
      rules: [
        {
          id: "tool-allowlist",
          effect: "allow",
          conditions: [{ field: "tool", operator: "in", value: ["listRepos", "getUser"] }],
        },
      ],
    };
    const result = applyPolicies(policySet, { identity: {}, tool: "listRepos" });
    expect(result.allowed).toBe(true);
  });

  it("evaluates rules in priority order", () => {
    const policySet: PolicySet = {
      rules: [
        {
          id: "low-priority-allow",
          priority: 100,
          effect: "allow",
          conditions: [{ field: "sub", operator: "exists", value: true }],
        },
        {
          id: "high-priority-deny",
          priority: 1,
          effect: "deny",
          conditions: [{ field: "sub", operator: "exists", value: true }],
          reason: "Denied by high-priority rule",
        },
      ],
    };
    const result = applyPolicies(policySet, { identity: { sub: "user1" } });
    expect(result.allowed).toBe(false);
    expect(result.matchedRule?.id).toBe("high-priority-deny");
  });

  it("requires ALL conditions to match (AND logic)", () => {
    const policySet: PolicySet = {
      rules: [
        {
          id: "admin-tool",
          effect: "allow",
          conditions: [
            { field: "scope", operator: "contains", value: "admin" },
            { field: "tool", operator: "equals", value: "deleteTenant" },
          ],
        },
      ],
    };
    // Has admin scope but wrong tool
    const r1 = applyPolicies(policySet, { identity: { scope: "admin" }, tool: "listUsers" });
    expect(r1.allowed).toBe(false);

    // Has both
    const r2 = applyPolicies(policySet, { identity: { scope: "admin" }, tool: "deleteTenant" });
    expect(r2.allowed).toBe(true);
  });

  it("supports matches (regex) operator", () => {
    const policySet: PolicySet = {
      rules: [
        {
          id: "model-pattern",
          effect: "allow",
          conditions: [{ field: "model", operator: "matches", value: "^gpt-4" }],
        },
      ],
    };
    const r1 = applyPolicies(policySet, { identity: {}, model: "gpt-4-turbo" });
    expect(r1.allowed).toBe(true);

    const r2 = applyPolicies(policySet, { identity: {}, model: "claude-3" });
    expect(r2.allowed).toBe(false);
  });
});
