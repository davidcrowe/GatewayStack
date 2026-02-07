# @gatewaystack/limitabl-core

Framework-agnostic rate limiting, budget tracking, and agent guard for AI gateways.

`@gatewaystack/limitabl-core` is the low-level engine behind [@gatewaystack/limitabl](https://www.npmjs.com/package/@gatewaystack/limitabl). Use it directly when you need usage controls without Express.

## Installation

```bash
npm install @gatewaystack/limitabl-core
```

## Features

- **Sliding-window rate limiter** — per-user/org/IP request throttling
- **Budget tracker** — per-user spend caps with preflight estimation
- **Agent guard** — tool call limits, workflow cost caps, and duration caps to prevent runaway agents
- **Unified preflight engine** — runs all checks in a single call
- **Key resolution** — automatic key priority: `sub` > `orgId` > `ip` > `anonymous`, with optional tenant prefix

## Quick Start

### Rate limiting

```ts
import { InMemoryRateLimiter } from "@gatewaystack/limitabl-core";

const limiter = new InMemoryRateLimiter({ windowMs: 60_000, maxRequests: 10 });

const result = limiter.check({ sub: "user1" });
// { allowed: true, remaining: 9, resetAt: 1738886400000 }
```

### Budget tracking

```ts
import { InMemoryBudgetTracker } from "@gatewaystack/limitabl-core";

const budget = new InMemoryBudgetTracker({ maxSpend: 100, periodMs: 86_400_000 });

// Pre-flight check with estimated cost
budget.check({ sub: "user1" }, 25);
// { allowed: true, currentSpend: 0, maxSpend: 100, percentUsed: 0 }

// Record actual usage after execution
budget.record({ sub: "user1" }, { timestamp: Date.now(), cost: 22, tokens: 1500 });
```

### Agent guard

```ts
import { AgentGuard } from "@gatewaystack/limitabl-core";

const guard = new AgentGuard({ maxToolCalls: 20, maxWorkflowCost: 500, maxDurationMs: 120_000 });

// Before each tool call
const result = guard.check("workflow-abc");
// { allowed: true, toolCallCount: 0, workflowCost: 0, durationMs: 3 }

// After each tool call
guard.recordToolCall("workflow-abc", 12); // cost = 12

// When workflow finishes
guard.endWorkflow("workflow-abc");
```

### Unified preflight

```ts
import { LimitablEngine } from "@gatewaystack/limitabl-core";

const engine = new LimitablEngine({
  rateLimit: { windowMs: 60_000, maxRequests: 100 },
  budget: { maxSpend: 1000, periodMs: 86_400_000 },
  agentGuard: { maxToolCalls: 50 },
});

const result = engine.preflight(
  { sub: "user1", tenantId: "tenant-a" },
  { estimatedCost: 5, workflowId: "wf-123" }
);
// { allowed: true, reason: "All checks passed", rateLimit: {...}, budget: {...}, agentGuard: {...} }

// Record usage post-execution
engine.recordUsage({
  key: { sub: "user1" },
  workflowId: "wf-123",
  usage: { timestamp: Date.now(), cost: 4.5, tokens: 800 },
});

// Cleanup on shutdown
engine.destroy();
```

## API

### `InMemoryRateLimiter`

```ts
new InMemoryRateLimiter(config: { windowMs: number, maxRequests: number })
```

| Method | Description |
|--------|-------------|
| `check(key)` | Check and record a request. Returns `{ allowed, remaining, resetAt, retryAfterSec? }` |
| `destroy()` | Stop the internal cleanup interval |

### `InMemoryBudgetTracker`

```ts
new InMemoryBudgetTracker(config: { maxSpend: number, periodMs: number })
```

| Method | Description |
|--------|-------------|
| `check(key, estimatedCost?)` | Pre-flight budget check. Returns `{ allowed, currentSpend, maxSpend, percentUsed }` |
| `record(key, usage)` | Record actual usage after execution |
| `getUsageSummary(key)` | Returns `{ totalSpend, totalTokens, requestCount }` |
| `destroy()` | Stop the internal cleanup interval |

### `AgentGuard`

```ts
new AgentGuard(config?: { maxToolCalls?, maxWorkflowCost?, maxDurationMs? })
```

| Method | Description |
|--------|-------------|
| `check(workflowId)` | Check if a tool call is allowed. Returns `{ allowed, toolCallCount, workflowCost, durationMs }` |
| `recordToolCall(workflowId, cost?)` | Record a tool call with optional cost |
| `endWorkflow(workflowId)` | Clean up workflow state |

### `LimitablEngine`

Orchestrates all three components. Configure any combination of rate limiting, budget tracking, and agent guard.

### `resolveKey(key)`

Resolves a `LimitKey` to a string: `sub` > `orgId` > `ip` > `anonymous`, with optional `tenantId` prefix.

```ts
resolveKey({ tenantId: "t1", sub: "u1" })  // "t:t1|u:u1"
resolveKey({ ip: "1.2.3.4" })               // "ip:1.2.3.4"
resolveKey({})                               // "anonymous"
```

## Related Packages

- [@gatewaystack/limitabl](https://www.npmjs.com/package/@gatewaystack/limitabl) — Express middleware wrapper
- [@gatewaystack/identifiabl-core](https://www.npmjs.com/package/@gatewaystack/identifiabl-core) — JWT identity (provides `sub`, `orgId`)
- [@gatewaystack/validatabl-core](https://www.npmjs.com/package/@gatewaystack/validatabl-core) — Policy enforcement

## License

MIT
