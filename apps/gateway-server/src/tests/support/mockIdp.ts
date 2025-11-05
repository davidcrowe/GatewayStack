// tests/support/mockIdp.ts
import express from "express";
import { JWTPayload, SignJWT, exportJWK, generateKeyPair } from "jose";

export type StartedIdp = {
  server: import("http").Server;
  issuer: string;
  jwksUri: string;
  kid: string;
  sign: (payload: JWTPayload & { scope?: string | string[] }, opts: {
    aud: string; sub?: string; expSec?: number;
  }) => Promise<string>;
};

export async function startMockIdp(port = 4001): Promise<StartedIdp> {
  const app = express();
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  const kid = "test-kid-1";
  (jwk as any).kid = kid;

  app.get("/.well-known/jwks.json", (_req, res) => res.json({ keys: [jwk] }));
  app.get("/.well-known/openid-configuration", (_req, res) =>
    res.json({ issuer: `http://localhost:${port}`,
               jwks_uri: `http://localhost:${port}/.well-known/jwks.json` })
  );

  const server = app.listen(port);
  const issuer = `http://localhost:${port}`;
  const jwksUri = `${issuer}/.well-known/jwks.json`;

  async function sign(payload: JWTPayload & { scope?: string | string[] }, opts: {
    aud: string; sub?: string; expSec?: number;
  }) {
    const now = Math.floor(Date.now()/1000);
    const exp = now + (opts.expSec ?? 600);
    const scope = Array.isArray(payload.scope) ? payload.scope.join(" ") : (payload.scope || "");
    return await new SignJWT({ ...payload, scope })
      .setProtectedHeader({ alg: "RS256", kid })
      .setIssuer(issuer).setAudience(opts.aud)
      .setSubject(opts.sub ?? "user-123")
      .setIssuedAt(now).setExpirationTime(exp)
      .sign(privateKey);
  }

  return { server, issuer, jwksUri, kid, sign };
}

export async function makeJwt(
  idp: Pick<StartedIdp, "sign"> & { issuer: string },
  opts: { audience: string; scopes?: string[]; sub?: string; expSec?: number }
): Promise<string> {
  return idp.sign({ scope: opts.scopes ?? [] }, {
    aud: opts.audience, sub: opts.sub, expSec: opts.expSec,
  });
}
