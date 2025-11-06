import { Router } from "express";

export function prmRouter() {
  const r = Router();
  r.get("/.well-known/oauth-protected-resource", (_req, res) => {
    res.json({
      resource: "https://gateway.local/mcp",
      authorization_servers: ["http://localhost:5051/"],
      scopes_supported: ["tool:read", "tool:write"]
    });
  });
  return r;
}
