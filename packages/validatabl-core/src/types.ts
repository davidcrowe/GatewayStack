// packages/validatabl-core/src/types.ts

/** Identity claims as they arrive from identifiabl / JWT verification. */
export interface IdentityClaims {
  sub?: string;
  scope?: string | string[];
  scopes?: string[];
  permissions?: string[];
  roles?: string[];
  org_id?: string;
  [key: string]: unknown;
}

/** A single policy rule. Evaluated in priority order (lowest number = highest priority). */
export interface PolicyRule {
  /** Unique identifier for this rule. */
  id: string;
  /** Lower number = evaluated first. Default: 100. */
  priority?: number;
  /** "allow" | "deny". Deny-by-default: if no rule matches, the request is denied. */
  effect: "allow" | "deny";
  /** Conditions that must ALL be true for this rule to match. */
  conditions: PolicyCondition[];
  /** Human-readable reason (included in deny responses). */
  reason?: string;
}

/**
 * A condition within a policy rule.
 * All conditions in a rule are ANDed together.
 */
export interface PolicyCondition {
  /** The field to check: "scope", "permission", "role", "org_id", "tool", "model", "sub". */
  field: string;
  /** The operator: "equals", "contains", "in", "matches", "exists". */
  operator: "equals" | "contains" | "in" | "matches" | "exists";
  /** The value to compare against. */
  value: string | string[] | boolean;
}

/** The result of evaluating a policy set against a request. */
export interface PolicyDecision {
  /** Whether the request is allowed. */
  allowed: boolean;
  /** The rule that matched (if any). */
  matchedRule?: PolicyRule;
  /** Why the request was allowed/denied. */
  reason: string;
  /** All rules that were evaluated. */
  evaluatedCount: number;
}

/** A set of policies to evaluate. */
export interface PolicySet {
  /** The rules in this policy set, evaluated in priority order. */
  rules: PolicyRule[];
  /** Default effect when no rules match. Default: "deny". */
  defaultEffect?: "allow" | "deny";
}

/** Request context for policy evaluation. */
export interface PolicyRequest {
  /** The identity claims from the verified JWT. */
  identity: IdentityClaims;
  /** The tool being invoked (if applicable). */
  tool?: string;
  /** The model being requested (if applicable). */
  model?: string;
  /** The input payload (for schema validation). */
  input?: unknown;
  /** Additional context fields for condition matching. */
  [key: string]: unknown;
}

/** Configuration for schema validation. */
export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

/** Configuration for permission checks. */
export interface PermissionCheckResult {
  allowed: boolean;
  missing: string[];
  reason: string;
}
