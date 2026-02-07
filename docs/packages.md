# Package Breakdown

GatewayStack ships as composable npm packages. Each governance layer has a `-core` package (framework-agnostic, pure functions) and an Express middleware wrapper.

## identifiabl

`@gatewaystack/identifiabl-core` / `@gatewaystack/identifiabl`

**Trust & Identity Binding.** Verifies RS256 JWTs via JWKS, enforces issuer/audience, maps claims into a canonical `GatewayIdentity`. Supports multi-audience verification and configurable claim extraction (tenant, roles, scopes, plan).

## transformabl

`@gatewaystack/transformabl-core` / `@gatewaystack/transformabl`

**Content Safety & Transformation.** Regex-based PII detection (email, phone, SSN, credit card, IP, DOB), three redaction modes (mask, remove, placeholder), safety classification (prompt injection, jailbreak, code injection), regulatory flagging (GDPR, PCI, COPPA, HIPAA), and risk scoring. Runs *before* authorization so policies can reference content risk.

## validatabl

`@gatewaystack/validatabl-core` / `@gatewaystack/validatabl`

**Authorization & Policy Enforcement.** Deny-by-default policy engine with priority-ordered rules and condition operators (equals, contains, in, matches, exists). Scope/role/permission checking, input schema validation, and a unified `decision()` entry point. Express middleware includes `requireScope()` and `requirePermissions()` guards.

## limitabl

`@gatewaystack/limitabl-core` / `@gatewaystack/limitabl`

**Spend Controls & Resource Governance.** Sliding-window rate limiter per user/org/IP, per-user budget tracking with pre-flight estimation, and agent guard (tool call limits, workflow cost caps, duration caps). Two-phase middleware model: pre-flight check, then post-execution recording.

## proxyabl

`@gatewaystack/proxyabl-core` / `@gatewaystack/proxyabl`

**Execution Control & Identity-Aware Routing.** Five auth modes (API key, forward bearer, service OAuth, user OAuth, none), SSRF protection (host allowlist, private IP blocking), HTTP proxy with timeout/redirect/size controls, multi-provider registry. Express middleware serves PRM/OIDC metadata, enforces scope-to-tool mappings, and injects verified identity into downstream headers.

## explicabl

`@gatewaystack/explicabl`

**Runtime Audit & Conformance.** One structured JSON event per request with HTTP metadata, identity context, and timing. Health endpoints, Auth0 webhook integration, pluggable logger.

## request-context

`@gatewaystack/request-context`

**Request-Scoped Context.** AsyncLocalStorage-based context propagation. Seeds `GatewayContext` per request; all layers read/write their fields without parameter threading.

## compat

`@gatewaystack/compat`

**Interop & Parity Harness.** Legacy/test router that mirrors the original `/echo` shape for regression testing.
