// packages/validatabl/src/index.ts
//
// Express middleware for validatabl governance layer.
// Wraps @gatewaystack/validatabl-core with HTTP-aware middleware.

export { requireScope } from "./requireScope.js";
export { requirePermissions } from "./requirePermissions.js";
export { validatabl } from "./middleware.js";
export { protectedResourceRouter } from "./protectedResourceRouter.js";

// Re-export core types and functions for convenience
export {
  decision,
  applyPolicies,
  checkPermissions,
  checkAnyPermission,
  checkSchema,
  hasScope,
  getScopeStringFromClaims,
  buildProtectedResourcePayload,
} from "@gatewaystack/validatabl-core";

export type {
  PolicyRule,
  PolicyCondition,
  PolicyDecision,
  PolicySet,
  PolicyRequest,
  IdentityClaims,
  PermissionCheckResult,
  SchemaValidationResult,
  ValidationDecision,
  DecisionOptions,
} from "@gatewaystack/validatabl-core";
