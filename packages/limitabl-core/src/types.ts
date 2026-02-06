// packages/limitabl-core/src/types.ts

/** Identity key used for rate limiting and budget tracking. */
export interface LimitKey {
  /** User ID (from JWT sub claim). */
  sub?: string;
  /** Organization ID (from JWT org_id claim). */
  orgId?: string;
  /** IP address (fallback). */
  ip?: string;
  /** Tenant ID (for multi-tenant deployments). */
  tenantId?: string;
}

/** Rate limit configuration. */
export interface RateLimitConfig {
  /** Window size in milliseconds. */
  windowMs: number;
  /** Maximum requests per window. */
  maxRequests: number;
}

/** Result of a rate limit check. */
export interface RateLimitResult {
  allowed: boolean;
  /** Requests remaining in current window. */
  remaining: number;
  /** When the current window resets (epoch ms). */
  resetAt: number;
  /** Retry-After value in seconds (if denied). */
  retryAfterSec?: number;
}

/** Budget configuration for a single entity (user, org, tenant). */
export interface BudgetConfig {
  /** Maximum spend in the budget period (in cents or smallest currency unit). */
  maxSpend: number;
  /** Budget period in milliseconds (e.g., 30 days). */
  periodMs: number;
  /** Optional per-model spend limits. */
  modelLimits?: Record<string, number>;
}

/** A single usage record (post-execution). */
export interface UsageRecord {
  /** When the usage occurred (epoch ms). */
  timestamp: number;
  /** Cost in cents or smallest currency unit. */
  cost: number;
  /** Token count (input + output). */
  tokens?: number;
  /** Model used. */
  model?: string;
  /** Tool invoked. */
  tool?: string;
}

/** Result of a budget check. */
export interface BudgetCheckResult {
  allowed: boolean;
  /** Current spend in the budget period. */
  currentSpend: number;
  /** Maximum allowed spend. */
  maxSpend: number;
  /** Percentage of budget used (0-100+). */
  percentUsed: number;
  reason: string;
}

/** Agent guard configuration. */
export interface AgentGuardConfig {
  /** Maximum tool calls per workflow/session. Default: 50. */
  maxToolCalls?: number;
  /** Maximum total cost per workflow (cents). Default: 1000 ($10). */
  maxWorkflowCost?: number;
  /** Maximum workflow duration in milliseconds. Default: 300000 (5 min). */
  maxDurationMs?: number;
}

/** Result of an agent guard check. */
export interface AgentGuardResult {
  allowed: boolean;
  reason: string;
  toolCallCount: number;
  workflowCost: number;
  durationMs: number;
}

/** Combined pre-flight check result. */
export interface PreflightResult {
  allowed: boolean;
  reason: string;
  rateLimit?: RateLimitResult;
  budget?: BudgetCheckResult;
  agentGuard?: AgentGuardResult;
}

/** Post-execution recording input. */
export interface PostExecutionInput {
  key: LimitKey;
  usage: UsageRecord;
  workflowId?: string;
}
