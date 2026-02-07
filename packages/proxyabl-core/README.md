# @gatewaystack/proxyabl-core

Framework-agnostic proxy forwarding, SSRF protection, auth mode routing, and provider registry for AI gateways.

`@gatewaystack/proxyabl-core` is the low-level engine behind [@gatewaystack/proxyabl](https://www.npmjs.com/package/@gatewaystack/proxyabl). Use it directly when you need proxy capabilities without Express, or in serverless / edge environments.

## Installation

```bash
npm install @gatewaystack/proxyabl-core
```

## Features

- **Auth mode routing** — resolve credentials for 5 auth modes (API key, forward bearer, service OAuth, user OAuth, none)
- **SSRF protection** — host allowlist, private IP blocking (IPv4 + IPv6), protocol enforcement
- **HTTP proxy execution** — forward requests with timeout, redirect blocking, response size capping, and header sanitization
- **Provider registry** — multi-provider configuration with default fallback
- **JWT verification** — RS256 access token validation via JWKS
- **Tool scope enforcement** — scope-to-tool mapping and assertion

## Quick Start

### Proxy a request to an upstream API

```ts
import { resolveAuth, executeProxyRequest } from "@gatewaystack/proxyabl-core";

const auth = resolveAuth(
  { mode: "api_key", apiKeyHeader: "X-API-Key", apiKeyValue: "sk-..." },
  {}
);

const response = await executeProxyRequest({
  baseUrl: "https://api.openai.com",
  path: "/v1/chat/completions",
  method: "POST",
  body: { model: "gpt-4", messages: [{ role: "user", content: "Hello" }] },
  auth,
  allowedHosts: ["api.openai.com"],
  timeoutMs: 30_000,
});

console.log(response.status, response.body);
```

### Forward the user's Bearer token

```ts
const auth = resolveAuth(
  { mode: "forward_bearer" },
  { bearerToken: req.headers.authorization?.replace("Bearer ", "") }
);
```

### Use a provider registry

```ts
import { resolveProvider, resolveAuth, executeProxyRequest } from "@gatewaystack/proxyabl-core";

const registry = {
  providers: {
    openai: {
      key: "openai",
      baseUrl: "https://api.openai.com",
      auth: { mode: "api_key" as const, apiKeyHeader: "Authorization", apiKeyValue: "Bearer sk-..." },
      allowedHosts: ["api.openai.com"],
    },
    anthropic: {
      key: "anthropic",
      baseUrl: "https://api.anthropic.com",
      auth: { mode: "api_key" as const, apiKeyHeader: "x-api-key", apiKeyValue: "sk-ant-..." },
      allowedHosts: ["api.anthropic.com"],
    },
  },
  defaultProvider: "openai",
};

const provider = resolveProvider(registry, "anthropic");
const auth = resolveAuth(provider.auth, {});
```

## API

### Auth Modes

```ts
resolveAuth(config: AuthModeConfig, context: AuthContext): ResolvedAuth
```

| Mode | Description | Required context |
|------|-------------|-----------------|
| `api_key` | Static API key in a custom header | `apiKeyHeader` + `apiKeyValue` in config |
| `forward_bearer` | Forward the incoming request's Bearer token | `bearerToken` in context |
| `service_oauth` | Use a pre-loaded M2M/service token | `serviceToken` in context |
| `user_oauth` | Use a pre-loaded user OAuth token | `userToken` in context |
| `none` | No authentication | (none) |

### SSRF Protection

```ts
assertUrlSafe(url: URL, config: UrlSafetyConfig): void
```

Throws if the URL fails any check:
- Protocol must be HTTPS (unless `allowHttp: true`)
- Hostname must be in `allowedHosts`
- IP-literal hosts are blocked if they resolve to private ranges (10.x, 127.x, 192.168.x, etc.)

```ts
sanitizeHeaderValue(value: string): string
```

Strips CRLF characters to prevent header injection.

### HTTP Execution

```ts
executeProxyRequest(config: ProxyRequestConfig): Promise<ProxyResponse>
```

- Builds URL from `baseUrl` + `path`
- Runs SSRF check via `assertUrlSafe()`
- Injects auth headers from `ResolvedAuth`
- Filters hop-by-hop headers (host, connection, etc.)
- Uses `AbortController` for timeout (default 10s, max 120s)
- Blocks redirects (`redirect: "manual"`)
- Caps response size (default 512KB, max 5MB)
- Parses JSON responses automatically

### Provider Registry

```ts
resolveProvider(registry: ProviderRegistry, providerKey?: string): ProviderConfig
```

Returns the named provider or the default. Throws with available providers listed if not found.

### JWT Verification

```ts
verifyAccessToken(config: ProxyablConfig, token: string): Promise<VerifiedAccessToken>
assertToolScopes(config: ProxyablConfig, toolName: string, userScopes: string[]): void
```

## Related Packages

- [@gatewaystack/proxyabl](https://www.npmjs.com/package/@gatewaystack/proxyabl) — Express middleware wrapper
- [@gatewaystack/identifiabl-core](https://www.npmjs.com/package/@gatewaystack/identifiabl-core) — JWT identity verification
- [@gatewaystack/validatabl-core](https://www.npmjs.com/package/@gatewaystack/validatabl-core) — Policy enforcement

## License

MIT
