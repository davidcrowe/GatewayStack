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

  // ✅ Publish well-known OAuth/OIDC metadata (public)
  app.use(
    protectedResourceRouter({
      issuer: (env.OAUTH_ISSUER || "").replace(/\/+$/, ""),
      audience: env.OAUTH_AUDIENCE,
      scopes: (env.OAUTH_SCOPES || "openid email profile").trim().split(/\s+/),
    }) as unknown as RequestHandler
  );

  const rawIssuer = env.OAUTH_ISSUER || "";
const issuerNoSlash = rawIssuer.replace(/\/+$/, "");

// Accept with or without trailing slash
const issuerPattern = new RegExp(
  `^${issuerNoSlash.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\/?$`
);

const audience = env.OAUTH_AUDIENCE!;
const jwksUri =
  env.OAUTH_JWKS_URI ||
  env.JWKS_URI_FALLBACK ||
  `${issuerNoSlash}/.well-known/jwks.json`;

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


  // 🧯 Per-user rate limit (applies only to protected area)
const limiter = rateLimit({
  windowMs: +(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
  limit: +(process.env.RATE_LIMIT_MAX ?? 10),

  // Prefer user/tenant; safe IPv6 fallback via helper
  keyGenerator: (req: any) =>
    req.user?.sub || req.user?.org_id || ipKeyGenerator(req),

  standardHeaders: true,
  legacyHeaders: false,
});

  // 🔐 Mount protected area
  app.use("/protected", requireJwt, limiter);
  app.get("/protected/ping", (_req, res) => res.json({ ok: true }));

  // 🔐 Gateway (proxy/MCP/etc.)
  app.use(toolGatewayRouter as unknown as RequestHandler);

  // 🔐 Webhooks (they do their own secret checks)
  app.use("/webhooks/auth0", auth0LogsWebhook as unknown as RequestHandler);

  return app;
}
