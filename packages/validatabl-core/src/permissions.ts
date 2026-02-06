// packages/validatabl-core/src/permissions.ts
//
// checkPermissions: verifies user/agent access to specific models, tools, or operations.

import type { IdentityClaims, PermissionCheckResult } from "./types.js";
import { getScopeStringFromClaims } from "./scopes.js";

/**
 * Check whether an identity has ALL the required permissions.
 *
 * Permissions are drawn from:
 * - `scope` claim (space-delimited string or array)
 * - `permissions` claim (array, used by Auth0 RBAC)
 * - `roles` claim (array)
 *
 * All sources are merged and deduplicated.
 */
export function checkPermissions(
  claims: IdentityClaims,
  required: string[]
): PermissionCheckResult {
  if (required.length === 0) {
    return { allowed: true, missing: [], reason: "No permissions required" };
  }

  const granted = getAllGrants(claims);
  const missing = required.filter((r) => !granted.has(r));

  if (missing.length === 0) {
    return { allowed: true, missing: [], reason: "All permissions granted" };
  }

  return {
    allowed: false,
    missing,
    reason: `Missing permissions: ${missing.join(", ")}`,
  };
}

/**
 * Check whether an identity has ANY of the specified permissions.
 */
export function checkAnyPermission(
  claims: IdentityClaims,
  anyOf: string[]
): PermissionCheckResult {
  if (anyOf.length === 0) {
    return { allowed: true, missing: [], reason: "No permissions required" };
  }

  const granted = getAllGrants(claims);
  const hasAny = anyOf.some((p) => granted.has(p));

  if (hasAny) {
    return { allowed: true, missing: [], reason: "Has required permission" };
  }

  return {
    allowed: false,
    missing: anyOf,
    reason: `Requires one of: ${anyOf.join(", ")}`,
  };
}

/** Merge all grant sources into a single Set. */
function getAllGrants(claims: IdentityClaims): Set<string> {
  const grants = new Set<string>();

  // Scopes
  const scopeStr = getScopeStringFromClaims(claims);
  for (const s of scopeStr.split(" ").filter(Boolean)) {
    grants.add(s);
  }

  // Permissions (Auth0 RBAC style)
  if (Array.isArray(claims.permissions)) {
    for (const p of claims.permissions) grants.add(p);
  }

  // Roles
  if (Array.isArray(claims.roles)) {
    for (const r of claims.roles) grants.add(r);
  }

  return grants;
}
