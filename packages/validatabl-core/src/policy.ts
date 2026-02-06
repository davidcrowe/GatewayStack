// packages/validatabl-core/src/policy.ts
//
// applyPolicies: evaluate a policy set against a request.
// Deny-by-default. Rules evaluated in priority order (lowest number first).

import type {
  PolicyRule,
  PolicyCondition,
  PolicyDecision,
  PolicySet,
  PolicyRequest,
} from "./types.js";
import { getScopeStringFromClaims } from "./scopes.js";

/**
 * Evaluate a policy set against a request.
 *
 * Rules are sorted by priority (ascending). The first matching rule wins.
 * If no rule matches, the default effect is applied (deny by default).
 *
 * FUTURE WORK:
 * - YAML policy file loading (currently JSON only)
 * - Compiled evaluation trees for high-throughput scenarios
 * - Caching of decisions per (user, model, tool, scope) tuple with configurable TTL
 * - Modification actions (strip fields, downgrade model, reduce token limits)
 *   beyond simple allow/deny
 */
export function applyPolicies(
  policySet: PolicySet,
  request: PolicyRequest
): PolicyDecision {
  const sorted = [...policySet.rules].sort(
    (a, b) => (a.priority ?? 100) - (b.priority ?? 100)
  );

  for (const rule of sorted) {
    if (matchesAllConditions(rule.conditions, request)) {
      return {
        allowed: rule.effect === "allow",
        matchedRule: rule,
        reason: rule.reason ?? `Matched rule: ${rule.id} (${rule.effect})`,
        evaluatedCount: sorted.indexOf(rule) + 1,
      };
    }
  }

  const defaultEffect = policySet.defaultEffect ?? "deny";
  return {
    allowed: defaultEffect === "allow",
    matchedRule: undefined,
    reason: `No rules matched; default: ${defaultEffect}`,
    evaluatedCount: sorted.length,
  };
}

function matchesAllConditions(
  conditions: PolicyCondition[],
  request: PolicyRequest
): boolean {
  return conditions.every((c) => matchesCondition(c, request));
}

function matchesCondition(
  condition: PolicyCondition,
  request: PolicyRequest
): boolean {
  const fieldValue = resolveField(condition.field, request);

  switch (condition.operator) {
    case "equals":
      return fieldValue === condition.value;

    case "contains": {
      // fieldValue is a space-delimited string or array; check if it contains the target
      if (typeof fieldValue === "string") {
        return fieldValue.split(" ").includes(String(condition.value));
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(condition.value);
      }
      return false;
    }

    case "in": {
      // value is an array; check if fieldValue is in it
      if (Array.isArray(condition.value)) {
        return condition.value.includes(String(fieldValue));
      }
      return false;
    }

    case "matches": {
      // value is a regex pattern
      if (typeof fieldValue !== "string" || typeof condition.value !== "string") {
        return false;
      }
      try {
        return new RegExp(condition.value).test(fieldValue);
      } catch {
        return false;
      }
    }

    case "exists":
      return condition.value
        ? fieldValue !== undefined && fieldValue !== null
        : fieldValue === undefined || fieldValue === null;

    default:
      return false;
  }
}

/**
 * Resolve a field name to a value from the request context.
 * Supports dotted paths like "identity.org_id".
 */
function resolveField(field: string, request: PolicyRequest): unknown {
  // Shorthand fields
  switch (field) {
    case "scope":
      return getScopeStringFromClaims(request.identity);
    case "permission":
    case "permissions":
      return request.identity.permissions ?? [];
    case "role":
    case "roles":
      return request.identity.roles ?? [];
    case "org_id":
      return request.identity.org_id;
    case "sub":
      return request.identity.sub;
    case "tool":
      return request.tool;
    case "model":
      return request.model;
  }

  // Dotted path traversal
  const parts = field.split(".");
  let current: unknown = request;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
