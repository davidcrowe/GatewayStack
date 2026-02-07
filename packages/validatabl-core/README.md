# @gatewaystack/validatabl-core

Framework-agnostic policy engine for AI gateway authorization. Deny-by-default, scope/role/permission checking, policy rules with conditions, and input schema validation.

`@gatewaystack/validatabl-core` is the low-level engine behind [@gatewaystack/validatabl](https://www.npmjs.com/package/@gatewaystack/validatabl). Use it directly when you need policy evaluation without Express.

## Installation

```bash
npm install @gatewaystack/validatabl-core
```

## Features

- **Deny-by-default** policy engine with priority-ordered rules
- **Permission checking** — verify scopes, permissions, and roles from JWT claims
- **Policy rules** with conditions (equals, contains, in, matches, exists)
- **Input schema validation** — type and required-field checking
- **Unified `decision()` function** — runs all checks in sequence, fails fast

## Quick Start

### Check permissions

```ts
import { checkPermissions } from "@gatewaystack/validatabl-core";

const claims = {
  scope: "tool:read tool:write",
  permissions: ["admin"],
  roles: ["editor"],
};

const result = checkPermissions(claims, ["tool:write", "admin"]);
// { allowed: true, missing: [], reason: "All permissions granted" }
```

### Evaluate policies

```ts
import { applyPolicies } from "@gatewaystack/validatabl-core";

const policySet = {
  defaultEffect: "deny" as const,
  rules: [
    {
      id: "allow-read-tools",
      effect: "allow" as const,
      priority: 10,
      conditions: [
        { field: "scope", operator: "contains" as const, value: "tool:read" },
      ],
    },
    {
      id: "block-gpt4-for-free",
      effect: "deny" as const,
      priority: 5,
      conditions: [
        { field: "model", operator: "equals" as const, value: "gpt-4" },
        { field: "identity.plan", operator: "equals" as const, value: "free" },
      ],
      reason: "GPT-4 requires a paid plan",
    },
  ],
};

const result = applyPolicies(policySet, {
  identity: { sub: "user1", scope: "tool:read" },
  tool: "search",
});
// { allowed: true, matchedRule: { id: "allow-read-tools", ... }, ... }
```

### Unified decision

```ts
import { decision } from "@gatewaystack/validatabl-core";

const result = decision(
  { identity: { sub: "user1", scope: "tool:read tool:write" }, tool: "search" },
  {
    requiredPermissions: ["tool:read"],
    policies: policySet,
    inputSchema: {
      type: "object",
      required: ["query"],
    },
  }
);
// Runs permission check, then policy evaluation, then schema validation
// Returns { allowed: boolean, reason: string, checks: { ... } }
```

## API

### `checkPermissions(claims, required)`

Check that the identity has ALL required permissions. Merges scopes, permissions, and roles.

### `checkAnyPermission(claims, anyOf)`

Check that the identity has at least ONE of the specified permissions.

### `applyPolicies(policySet, request)`

Evaluate a policy set against a request. Rules sorted by priority (lowest first). First match wins. Deny by default if no rules match.

**Condition operators:**
| Operator | Description |
|----------|-------------|
| `equals` | Exact match |
| `contains` | Field (string or array) contains the value |
| `in` | Field value is in the provided array |
| `matches` | Field matches a regex pattern |
| `exists` | Field is present (or absent if `value: false`) |

**Field resolution** supports shorthand (`scope`, `sub`, `tool`, `model`) and dotted paths (`identity.org_id`).

### `checkSchema(input, schema)`

Validate input against a simple schema (type checking, required fields).

### `decision(request, options)`

Unified entry point. Runs checks in order and returns on first failure:
1. Permission check
2. Policy evaluation
3. Schema validation

### Scope Utilities

```ts
hasScope(claims, "tool:read")              // boolean
getScopeStringFromClaims(claims)           // "tool:read tool:write"
```

## Related Packages

- [@gatewaystack/validatabl](https://www.npmjs.com/package/@gatewaystack/validatabl) — Express middleware wrapper
- [@gatewaystack/identifiabl-core](https://www.npmjs.com/package/@gatewaystack/identifiabl-core) — JWT identity (provides the claims)
- [@gatewaystack/limitabl-core](https://www.npmjs.com/package/@gatewaystack/limitabl-core) — Rate limiting and budget tracking

## License

MIT
