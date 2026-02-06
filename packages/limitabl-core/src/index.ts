// packages/limitabl-core/src/index.ts
//
// Core rate-limiting, budget, and agent protection logic.
// No Express, no HTTP. Pure functions + in-memory stores.
//
// FUTURE WORK:
// - Redis adapter for distributed rate limiting across instances
// - Anomaly detection (spike detection, unusual patterns)
// - Fallback provider routing (route to cheaper model when budget low)
// - Recursion depth tracking and duplicate tool call detection
// - Configurable storage backends (Redis, DynamoDB, Firestore)

export * from "./rateLimiter.js";
export * from "./budgetTracker.js";
export * from "./agentGuard.js";
export * from "./preflight.js";
export type * from "./types.js";
