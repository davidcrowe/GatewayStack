import { describe, it, expect } from "vitest";
import { checkPermissions, checkAnyPermission } from "../src/permissions.js";
import type { IdentityClaims } from "../src/types.js";

describe("checkPermissions", () => {
  it("allows when all required permissions are present in scope", () => {
    const claims: IdentityClaims = { scope: "read write admin" };
    const result = checkPermissions(claims, ["read", "write"]);
    expect(result.allowed).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("denies when a permission is missing", () => {
    const claims: IdentityClaims = { scope: "read" };
    const result = checkPermissions(claims, ["read", "write"]);
    expect(result.allowed).toBe(false);
    expect(result.missing).toContain("write");
  });

  it("allows when no permissions are required", () => {
    const claims: IdentityClaims = {};
    const result = checkPermissions(claims, []);
    expect(result.allowed).toBe(true);
  });

  it("checks Auth0 permissions array", () => {
    const claims: IdentityClaims = { permissions: ["read:users", "write:users"] };
    const result = checkPermissions(claims, ["read:users"]);
    expect(result.allowed).toBe(true);
  });

  it("checks roles", () => {
    const claims: IdentityClaims = { roles: ["admin"] };
    const result = checkPermissions(claims, ["admin"]);
    expect(result.allowed).toBe(true);
  });

  it("merges scopes, permissions, and roles", () => {
    const claims: IdentityClaims = {
      scope: "read",
      permissions: ["write"],
      roles: ["admin"],
    };
    const result = checkPermissions(claims, ["read", "write", "admin"]);
    expect(result.allowed).toBe(true);
  });
});

describe("checkAnyPermission", () => {
  it("allows when at least one permission matches", () => {
    const claims: IdentityClaims = { scope: "read" };
    const result = checkAnyPermission(claims, ["read", "write"]);
    expect(result.allowed).toBe(true);
  });

  it("denies when none match", () => {
    const claims: IdentityClaims = { scope: "execute" };
    const result = checkAnyPermission(claims, ["read", "write"]);
    expect(result.allowed).toBe(false);
  });

  it("allows when empty anyOf", () => {
    const claims: IdentityClaims = {};
    const result = checkAnyPermission(claims, []);
    expect(result.allowed).toBe(true);
  });
});
