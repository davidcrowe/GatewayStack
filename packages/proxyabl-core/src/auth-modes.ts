// packages/proxyabl-core/src/auth-modes.ts
//
// Framework-agnostic credential resolution for proxy forwarding.
// Extracted from gatewaystack-connect executor.ts resolveAccessToken().

export type AuthMode = "api_key" | "forward_bearer" | "service_oauth" | "user_oauth" | "none";

export interface ApiKeyAuth { kind: "api_key"; headerName: string; value: string }
export interface BearerAuth { kind: "bearer"; token: string }
export interface NoAuth { kind: "none" }
export type ResolvedAuth = ApiKeyAuth | BearerAuth | NoAuth;

export interface AuthModeConfig {
  mode: AuthMode;
  apiKeyHeader?: string;
  apiKeyValue?: string;
}

export interface AuthContext {
  bearerToken?: string;
  serviceToken?: string;
  userToken?: string;
}

/**
 * Resolve auth config + runtime context into concrete credentials.
 * Pure function — no framework deps, no I/O.
 *
 * For service_oauth and user_oauth, the caller is responsible for loading
 * the token beforehand and passing it as serviceToken / userToken.
 */
export function resolveAuth(cfg: AuthModeConfig, ctx: AuthContext): ResolvedAuth {
  const { mode } = cfg;

  if (mode === "api_key") {
    const headerName = (cfg.apiKeyHeader ?? "").trim();
    const value = (cfg.apiKeyValue ?? "").trim();
    if (!headerName || !value) {
      throw new Error("API key auth configured but apiKeyHeader/apiKeyValue missing");
    }
    return { kind: "api_key", headerName, value };
  }

  if (mode === "forward_bearer") {
    if (!ctx.bearerToken) {
      throw new Error("forward_bearer mode requires a Bearer token on the incoming request");
    }
    return { kind: "bearer", token: ctx.bearerToken };
  }

  if (mode === "service_oauth") {
    if (!ctx.serviceToken) {
      throw new Error("service_oauth mode requires a pre-loaded service token");
    }
    return { kind: "bearer", token: ctx.serviceToken };
  }

  if (mode === "user_oauth") {
    if (!ctx.userToken) {
      throw new Error("user_oauth mode requires a pre-loaded user token");
    }
    return { kind: "bearer", token: ctx.userToken };
  }

  if (mode === "none") {
    return { kind: "none" };
  }

  throw new Error(`Unknown auth mode: ${String(mode)}`);
}
