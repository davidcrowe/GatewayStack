import express, { type RequestHandler } from "express";
import bodyParser from "body-parser";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { createRemoteJWKSet, jwtVerify } from "jose";

import { protectedResourceRouter } from "@gatewaystack/access-express";
import { healthRoutes } from "@gatewaystack/observability-express";
import { toolGatewayRouter } from "@gatewaystack/routing-express";
import { auth0LogsWebhook } from "@gatewaystack/audit-express";
import { testEchoRoutes } from "./routes/testEcho";

export function buildApp(env: NodeJS.ProcessEnv) {
  console.log("[boot] ENABLE_TEST_ROUTES=%s", env.ENABLE_TEST_ROUTES);
  console.log("[boot] ROUTE_ALLOWLIST=%s", env.ROUTE_ALLOWLIST);

  const DEMO = env.DEMO_MODE === "true";

  // pick DEMO_* when DEMO_MODE=true, otherwise the real ones
  const OAUTH_ISSUER = (DEMO ? env.OAUTH_ISSUER_DEMO : env.OAUTH_ISSUER) || "";
  const OAUTH_AUDIENCE = (DEMO ? env.OAUTH_AUDIENCE_DEMO : env.OAUTH_AUDIENCE)!;
  const OAUTH_JWKS_URI =
    (DEMO ? env.OAUTH_JWKS_URI_DEMO : env.OAUTH_JWKS_URI) ||
    env.JWKS_URI_FALLBACK ||
    "";

  const OAUTH_SCOPES = (
    (DEMO ? env.OAUTH_SCOPES_DEMO : env.OAUTH_SCOPES) ||
    "openid email profile"
  )
    .trim()
    .split(/\s+/);

  console.log("[boot] DEMO_MODE=%s", DEMO);
  console.log("[boot] OAUTH_ISSUER=%s", OAUTH_ISSUER);
  console.log("[boot] OAUTH_AUDIENCE=%s", OAUTH_AUDIENCE);
  console.log("[boot] OAUTH_JWKS_URI=%s", OAUTH_JWKS_URI);

  // Fail fast in demo if required vars are missing
  if (DEMO && (!OAUTH_ISSUER || !OAUTH_AUDIENCE)) {
    throw new Error(
      "[demo] Missing OAUTH_*_DEMO envs. Set OAUTH_ISSUER_DEMO and OAUTH_AUDIENCE_DEMO."
    );
  }

  const app = express();
  app.use(bodyParser.json({ limit: "2mb" }));

  app.get("/", (_req, res) => res.status(200).json({ ok: true }));

  // ✅ Health (public)
  app.use(healthRoutes(env) as unknown as RequestHandler);

  // ✅ Test routes (public)
  if (env.ENABLE_TEST_ROUTES === "true") {
    console.log("[__test__] routes enabled");
    app.use("/__test__", testEchoRoutes(env));
  }

  // ✅ PRM / protected resource metadata (public)
  app.use(
    protectedResourceRouter({
      issuer: OAUTH_ISSUER.replace(/\/+$/, ""),
      audience: OAUTH_AUDIENCE,
      scopes: OAUTH_SCOPES,
    }) as unknown as RequestHandler
  );

  // ---- JWT verification config ----
  const rawIssuer = OAUTH_ISSUER;
  const issuerNoSlash = rawIssuer.replace(/\/+$/, "");

  const issuerPattern = new RegExp(
    `^${issuerNoSlash.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\/?$`
  );

  const audience = OAUTH_AUDIENCE;
  const jwksUri = OAUTH_JWKS_URI || `${issuerNoSlash}/.well-known/jwks.json`;
  const JWKS = createRemoteJWKSet(new URL(jwksUri));

  const requireJwt: RequestHandler = async (req: any, res, next) => {
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token) return res.status(401).json({ error: "missing_bearer" });

      // Verify signature & audience only (issuer checked manually)
      const { payload } = await jwtVerify(token, JWKS, { audience });

      const iss = String(payload.iss || "");
      if (!issuerPattern.test(iss)) {
        return res.status(401).json({
          error: "invalid_token",
          detail: `unexpected "iss" claim value: ${iss}`,
        });
      }

      req.user = payload;
      next();
    } catch (e: any) {
      res.status(401).json({ error: "invalid_token", detail: e?.message });
    }
  };

  // ---- simple scope helpers for demos ----
  const hasScope = (req: any, scope: string) => {
    const s: string =
      (req.user?.scope as string) ||
      (Array.isArray(req.user?.scopes) ? req.user.scopes.join(" ") : "");
    return new RegExp(`(^|\\s)${scope}(\\s|$)`).test(s);
  };

  const requireScope =
    (scope: string): RequestHandler =>
    (req: any, res, next) => {
      if (!hasScope(req, scope)) {
        return res.status(403).json({ error: "insufficient_scope", needed: scope });
      }
      next();
    };

  // 🧯 Per-user rate limit (applies only to protected area)
  const limiter = rateLimit({
    windowMs: +(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
    limit: +(process.env.RATE_LIMIT_MAX ?? 10),
    keyGenerator: (req: any) =>
      req.user?.sub || req.user?.org_id || ipKeyGenerator(req),
    standardHeaders: true,
    legacyHeaders: false,
  });

  // 🔐 Mount protected area
  app.use("/protected", requireJwt, limiter);

  // READ example (no extra scope)
  app.get("/protected/ping", (_req, res) => res.json({ ok: true }));

  // WRITE example (requires tool:write)
  app.post("/protected/echo", requireScope("tool:write"), (req: any, res) => {
    res.json({
      ok: true,
      sub: req.user?.sub ?? null,
      body: req.body ?? null,
    });
  });

  // 🔐 Gateway (proxy/MCP/etc.)
  app.use(toolGatewayRouter as unknown as RequestHandler);

  // 🔐 Webhooks (they do their own secret checks)
  app.use("/webhooks/auth0", auth0LogsWebhook as unknown as RequestHandler);

  return app;
}
