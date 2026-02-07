// packages/validatabl-core/src/protectedResource.ts
//
// Moved from the old index.ts location for better organization.

export interface ProtectedResourceConfig {
  issuer: string;
  audience?: string;
  scopes: string[];
}

export function buildProtectedResourcePayload(cfg: ProtectedResourceConfig) {
  const payload: Record<string, unknown> = {
    authorization_servers: [cfg.issuer],
    scopes_supported: cfg.scopes,
  };
  if (cfg.audience) payload.resource = cfg.audience;
  return payload;
}
