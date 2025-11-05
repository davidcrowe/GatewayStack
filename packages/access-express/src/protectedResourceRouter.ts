// packages/access-express/src/protectedResourceRouter.ts
import { Router } from "express";
import { buildProtectedResourcePayload } from "@gatewaystack/access-core"; // adjust name if different

export function protectedResourceRouter(cfg: { issuer: string; audience?: string; scopes: string[] }) {
  const r = Router();
  r.get("/.well-known/oauth-protected-resource", (_req, res) => {
    res.json(buildProtectedResourcePayload(cfg));
  });
  return r;
}
