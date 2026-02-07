import { describe, it, expect } from "vitest";
import { decision } from "../src/decision.js";

describe("decision", () => {
  it("allows when no checks configured", () => {
    const result = decision({ identity: {} }, {});
    expect(result.allowed).toBe(true);
  });

  it("denies when permissions are missing", () => {
    const result = decision(
      { identity: { scope: "read" } },
      { requiredPermissions: ["read", "write"] }
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("write");
  });

  it("denies when policy denies", () => {
    const result = decision(
      { identity: { sub: "user1" }, tool: "dangerousTool" },
      {
        policies: {
          rules: [
            {
              id: "deny-dangerous",
              effect: "deny",
              conditions: [{ field: "tool", operator: "equals", value: "dangerousTool" }],
              reason: "Dangerous tool not allowed",
            },
          ],
        },
      }
    );
    expect(result.allowed).toBe(false);
  });

  it("denies when schema validation fails", () => {
    const result = decision(
      { identity: {}, input: { name: 123 } },
      {
        inputSchema: {
          type: "object",
          properties: { name: { type: "string" } },
        },
      }
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Schema validation failed");
  });

  it("allows when all checks pass", () => {
    const result = decision(
      { identity: { scope: "read write" }, tool: "listRepos", input: { limit: 10 } },
      {
        requiredPermissions: ["read"],
        policies: {
          rules: [
            {
              id: "allow-read-tools",
              effect: "allow",
              conditions: [{ field: "scope", operator: "contains", value: "read" }],
            },
          ],
        },
        inputSchema: {
          type: "object",
          properties: { limit: { type: "number" } },
        },
      }
    );
    expect(result.allowed).toBe(true);
  });
});
