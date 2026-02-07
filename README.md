<p align="center">
  <img src="./assets/gatewaystack-banner.png" alt="GatewayStack banner" />
</p>

<p align="center">
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="MIT License" />
  </a>
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Cloud%20Run-ready-4285F4" alt="Cloud Run" />
  <img src="https://img.shields.io/badge/Auth0-RS256-orange" alt="Auth0 RS256" />
  <a href="https://github.com/davidcrowe/gatewaystack/tree/main/docs/conformance.json">
    <img
      src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fdavidcrowe%2Fgatewaystack%2Fmain%2Fdocs%2Fconformance.json&query=$.version&label=MCP%2FAuth%20Conformance"
      alt="MCP Auth Conformance"
    />
  </a>
</p>

<p align="center"><strong>Trust and governance layer between users, LLMs, and your backend</strong></p>

<p align="center">Make AI agent tool calls <strong>enterprise-ready</strong> by enforcing verified identity, authorization, limits, routing, & auditing</p>

<p align="center">
  <strong><a href="https://github.com/davidcrowe/gatewaystack-chatgpt-starter">Reference implementation</a></strong>
  <br/>
  <strong><a href="https://github.com/davidcrowe/gatewaystack-chatgpt-starter/blob/main/docs/live-demo.md">Live demo in ChatGPT</a></strong>
</p>

```bash
npm install @gatewaystack/identifiabl @gatewaystack/validatabl @gatewaystack/limitabl \
  @gatewaystack/transformabl @gatewaystack/proxyabl @gatewaystack/explicabl @gatewaystack/request-context
```

## Status

All six governance modules are live on npm:

| Module | npm | What it does |
|--------|-----|-------------|
| `@gatewaystack/identifiabl` | [![npm](https://img.shields.io/npm/v/@gatewaystack/identifiabl)](https://www.npmjs.com/package/@gatewaystack/identifiabl) | RS256 JWT verification, identity normalization |
| `@gatewaystack/transformabl` | [![npm](https://img.shields.io/npm/v/@gatewaystack/transformabl)](https://www.npmjs.com/package/@gatewaystack/transformabl) | PII detection, redaction, safety classification |
| `@gatewaystack/validatabl` | [![npm](https://img.shields.io/npm/v/@gatewaystack/validatabl)](https://www.npmjs.com/package/@gatewaystack/validatabl) | Deny-by-default policy engine, scope/permission enforcement |
| `@gatewaystack/limitabl` | [![npm](https://img.shields.io/npm/v/@gatewaystack/limitabl)](https://www.npmjs.com/package/@gatewaystack/limitabl) | Rate limits, budget tracking, agent guard |
| `@gatewaystack/proxyabl` | [![npm](https://img.shields.io/npm/v/@gatewaystack/proxyabl)](https://www.npmjs.com/package/@gatewaystack/proxyabl) | Auth mode routing, SSRF protection, identity-aware proxy |
| `@gatewaystack/explicabl` | [![npm](https://img.shields.io/npm/v/@gatewaystack/explicabl)](https://www.npmjs.com/package/@gatewaystack/explicabl) | Structured audit logging, health endpoints |

Each module has a `-core` package (framework-agnostic, pure functions) and an Express middleware wrapper.

## The three-party problem

Modern AI apps involve three actors — the **user**, the **LLM**, and **your backend** — yet there is no shared identity layer binding them together. This creates data leakage, policy bypass, and audit gaps.

```
        USER
      (Alice/Doctor)
           │
           │ ✓ Authenticated
           │   (logged in)
           ▼
         LLM
    (ChatGPT/Claude)
           │
           │ ❌ Identity NOT transferred
           │    (shared API key used)
           ▼
       BACKEND
    (Your API/Data)
           │
           │ ❓ Who is this request for?
           │ ❓ What role do they have?
           │ ❓ What are they allowed to do?
```

- Users want AI to access *their* data (ChatGPT reading *my* calendar).
- Enterprises want to control *who* can use AI models (only doctors can use medical models, only directors can send sensitive prompts).

Both the LLM and your backend require **cryptographic proof of user identity** tied to every AI request... but AI platforms authenticate users on their side while your backend has no verified identity to enforce policies, filter data, or log actions.

**This creates two critical problems:**
- Enterprises can't control who uses which models
- Users' data leaks to other users

Read the full [three-party problem breakdown](docs/three-party-problem.md)

### How GatewayStack Solves This

**GatewayStack attaches a cryptographically verified user identity to every AI request** and enforces structured governance around it.

```
         USER
      (Alice/Doctor)
           │
           │ ✓ Authenticated
           ▼
         LLM
    (ChatGPT/Claude)
           │
           │ ✓ Cryptographic proof
           │   (RS256 JWT token)
           ▼
     GATEWAYSTACK
   (Verify & Inject)
           │
           │ ✓ Identity transferred
           │   (X-User-Id, X-Role, etc.)
           ▼
       BACKEND
    (Your API/Data)
           │
           │ ✅ Knows: Alice, Doctor, Scopes
           │ ✅ Can filter & enforce policy
```

Drop GatewayStack between AI clients (ChatGPT, Claude, your own self-hosted models, MCP) and your backend. It validates OAuth tokens, enforces scopes, and injects verified identity—so you can safely answer the two questions that matter most:

1. **Who** did what, with **which** data, via **which** model?
2. Was it **authorized**, **bounded**, and **logged** under policy?

Every AI request flows through six governance checkpoints:
> **Identified → Transformed → Validated → Constrained → Routed → Audited**

## GatewayStack lets you

- Verify **real user identity** on every AI request (RS256 JWTs via your IdP)
- Enforce **per-user / per-tenant** policies and scopes for tools and models
- Detect and redact **PII** in prompts before they reach LLMs
- Apply **rate limits & spend caps** per user/team/org
- Prevent **agent runaway** with tool call limits and workflow cost caps
- Inject **X-User-Id / X-Org-Id** into downstream services (no JWT handling there)
- Emit **audit-ready logs** for "who did what, with which data, via which model"

See full examples: **[docs/examples.md](docs/examples.md)**

## Quickstart — Code (3 minutes)

Install all six governance layers:

```bash
npm install \
  @gatewaystack/identifiabl \
  @gatewaystack/transformabl \
  @gatewaystack/validatabl \
  @gatewaystack/limitabl \
  @gatewaystack/proxyabl \
  @gatewaystack/explicabl \
  @gatewaystack/request-context \
  express

# (optional, if you don't have them yet)
npm install -D typescript ts-node
```

Create **app.ts**:

```ts
import express from "express";
import { runWithGatewayContext } from "@gatewaystack/request-context";
import { identifiabl } from "@gatewaystack/identifiabl";
import { transformabl } from "@gatewaystack/transformabl";
import { validatabl } from "@gatewaystack/validatabl";
import { limitabl } from "@gatewaystack/limitabl";
import { createProxyablRouter, configFromEnv } from "@gatewaystack/proxyabl";
import { createConsoleLogger, explicablLoggingMiddleware } from "@gatewaystack/explicabl";

const app = express();
app.use(express.json());

// 1. Establish request context for downstream layers
app.use((req, _res, next) => {
  runWithGatewayContext(
    { request: { method: req.method, path: req.path } },
    () => next()
  );
});

// 2. Log every request
app.use(explicablLoggingMiddleware(createConsoleLogger()));

// 3. Require verified RS256 token
app.use(identifiabl({
  issuer: process.env.OAUTH_ISSUER!,
  audience: process.env.OAUTH_AUDIENCE!,
}));

// 4. Detect PII and classify content safety
app.use("/tools", transformabl({ blockThreshold: 80 }));

// 5. Enforce authorization policies
app.use("/tools", validatabl({
  requiredPermissions: ["tool:read"],
}));

// 6. Apply rate limits and budget caps
app.use("/tools", limitabl({
  rateLimit: { windowMs: 60_000, maxRequests: 100 },
  budget: { maxSpend: 500, periodMs: 86_400_000 },
}));

// 7. Route /tools to your tool/model backends
app.use("/tools", createProxyablRouter(configFromEnv(process.env)));

app.listen(8080, () => {
  console.log("GatewayStack running on :8080");
});
```

Run it:

```bash
npx ts-node app.ts
# or:
# npx tsx app.ts
# or compile with tsc and run:
# npx tsc && node dist/app.js
```

## Quickstart — CLI

Clone the repo and run the reference gateway:

```bash
git clone https://github.com/davidcrowe/GatewayStack
cd GatewayStack
npm install
npm run dev
```

This starts:

- Gateway server on :8080
- Admin UI on :5173 (visualizes /health)

### What You Get

- **RS256 JWT Verification** via JWKS (issuer, audience, exp, nbf, sub checks)
- **PII detection and redaction** (email, phone, SSN, credit card, IP, DOB)
- **Content safety classification** (prompt injection, jailbreak, code injection detection)
- **Deny-by-default policy engine** with scope/role/permission enforcement
- **Per-user rate limits and budget caps** with pre-flight checks
- **Agent guard** (tool call limits, workflow cost caps, duration limits)
- **Per-tool scope enforcement** (401/403 outcomes)
- **SSRF protection** (host allowlist, private IP blocking, protocol enforcement)
- **Auth mode routing** (API key, forward bearer, service OAuth, user OAuth)
- **Verified identity injection** into downstream headers (`X-User-Id`, `X-Org-Id`)
- **Structured audit logging** (one JSON event per request)
- **Health endpoints** (`/health`, `/health/auth0`)
- *(Optional)* **DCR webhook** to auto-promote new OAuth clients from Auth0 logs
- **Echo test servers** to validate proxy/header injection

### Prerequisites

- Node.js **20+** (or 22)
- npm **10+** (or pnpm 9)
- An **Auth0 tenant** (or equivalent OIDC provider issuing RS256 access tokens)
- *(Optional)* Google Cloud SDK for Cloud Run deploys

### Core Governance Layers

| Layer         | Status | Purpose |
|---------------|--------|---------|
| **identifiabl**  | Live | Trust & identity binding — RS256 JWT verification, multi-audience, claim mapping |
| **transformabl** | Live | Content safety — PII detection/redaction, prompt injection detection, regulatory flags |
| **validatabl**   | Live | Authorization — deny-by-default policies, scope/role/permission enforcement, schema validation |
| **limitabl**     | Live | Resource governance — sliding-window rate limits, budget tracking, agent guard |
| **proxyabl**     | Live | Execution control — auth mode routing, SSRF protection, HTTP proxy, provider registry |
| **explicabl**    | Live | Audit & observability — structured JSON logging, health endpoints, webhook integration |

### GatewayStack vs Traditional API Gateways

| Feature | Kong/Apigee/AWS API Gateway | GatewayStack |
|---------|---------------------------|--------------|
| **JWT validation** | Built-in | Built-in |
| **Rate limiting** | Built-in | Built-in |
| **Path/method routing** | Built-in | Built-in |
| **User identity normalization** | Manual (custom plugin) | Built-in |
| **Three-party identity binding (LLM → backend)** | Manual (custom logic) | Built-in |
| **Per-tool scope enforcement** | Manual (custom policy) | Built-in |
| **PII detection & redaction** | Not available | Built-in |
| **Content safety classification** | Not available | Built-in |
| **Pre-flight budget checks** | Manual (custom plugin) | Built-in |
| **Agent runaway prevention** | Not available | Built-in |
| **Apps SDK / MCP compliance** | Manual (PRM endpoint) | Built-in |
| **Model-specific policies** | Manual (custom logic) | Built-in |
| **AI audit trails** | Manual (log forwarding) | Built-in |

## Repository layout

| Path | Highlights |
| ---- | ---------- |
| `apps/gateway-server` | Express reference server wiring all six governance layers, `/protected/*` samples, demo/test routes, and a ready-to-build Docker image. |
| `apps/admin-ui` | Minimal Vite/React dashboard that polls `/health` so you can monitor the gateway while iterating. |
| `packages/` | Publishable packages for each layer — six `-core` packages (framework-agnostic) and six Express middleware wrappers, plus `request-context`, `compat`, and `integrations`. |
| `demos/` | Working MCP issuer + ChatGPT Apps SDK connectors that mint demo JWTs and exercise the gateway. |
| `tools/` | Supporting utilities (echo server, mock tool backend, Cloud Run deploy helper, smoke harnesses). |
| `tests/` | Vitest entry points and smoke tests. |
| `docs/` | Auth0 walkthroughs, conformance output, endpoint references, troubleshooting notes. |

### Package breakdown

- `@gatewaystack/identifiabl-core` / `@gatewaystack/identifiabl` — **Trust & Identity Binding.** Verifies RS256 JWTs via JWKS, enforces issuer/audience, maps claims into a canonical `GatewayIdentity`. Supports multi-audience verification and configurable claim extraction (tenant, roles, scopes, plan).

- `@gatewaystack/transformabl-core` / `@gatewaystack/transformabl` — **Content Safety & Transformation.** Regex-based PII detection (email, phone, SSN, credit card, IP, DOB), three redaction modes (mask, remove, placeholder), safety classification (prompt injection, jailbreak, code injection), regulatory flagging (GDPR, PCI, COPPA, HIPAA), and risk scoring. Runs *before* authorization so policies can reference content risk.

- `@gatewaystack/validatabl-core` / `@gatewaystack/validatabl` — **Authorization & Policy Enforcement.** Deny-by-default policy engine with priority-ordered rules and condition operators (equals, contains, in, matches, exists). Scope/role/permission checking, input schema validation, and a unified `decision()` entry point. Express middleware includes `requireScope()` and `requirePermissions()` guards.

- `@gatewaystack/limitabl-core` / `@gatewaystack/limitabl` — **Spend Controls & Resource Governance.** Sliding-window rate limiter per user/org/IP, per-user budget tracking with pre-flight estimation, and agent guard (tool call limits, workflow cost caps, duration caps). Two-phase middleware model: pre-flight check, then post-execution recording.

- `@gatewaystack/proxyabl-core` / `@gatewaystack/proxyabl` — **Execution Control & Identity-Aware Routing.** Five auth modes (API key, forward bearer, service OAuth, user OAuth, none), SSRF protection (host allowlist, private IP blocking), HTTP proxy with timeout/redirect/size controls, multi-provider registry. Express middleware serves PRM/OIDC metadata, enforces scope-to-tool mappings, and injects verified identity into downstream headers.

- `@gatewaystack/explicabl` — **Runtime Audit & Conformance.** One structured JSON event per request with HTTP metadata, identity context, and timing. Health endpoints, Auth0 webhook integration, pluggable logger.

- `@gatewaystack/request-context` — **Request-Scoped Context.** AsyncLocalStorage-based context propagation. Seeds `GatewayContext` per request; all layers read/write their fields without parameter threading.

- `@gatewaystack/compat` — **Interop & Parity Harness.** Legacy/test router that mirrors the original `/echo` shape for regression testing.

## Docs

- [The Three-Party Problem](docs/three-party-problem.md)
- [Examples](docs/examples.md)
- [Demos](docs/demo.md)
- [Environment & health endpoints](docs/operations.md)
- [Deployment](docs/deployment.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Production checklist](docs/production-checklist.md)

## Testing

Run the full test suite:

```bash
npm test
```

135 tests across 17 test files covering all five core packages (proxyabl-core, transformabl-core, validatabl-core, identifiabl-core, limitabl-core).

## Contributing

- Run the tests: `npm test`
- Read [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Report issues on [GitHub Issues](https://github.com/davidcrowe/GatewayStack/issues)
- Star the repo if GatewayStack helps you

Built by [reducibl applied AI studio](https://reducibl.com)
