import { Router } from "express";
import { generateKeyPair, exportJWK } from "jose";

// If you want a type for the JWK, keep it loose to avoid version mismatches
type Jwk = Record<string, unknown>;

const alg = "RS256" as const;

// Lazily generate and cache an ephemeral keypair + JWK (dev only)
let keypairPromise: ReturnType<typeof generateKeyPair> | null = null;
let cachedJwk: Jwk | null = null;

async function ensureKeys() {
  if (!keypairPromise) {
    keypairPromise = generateKeyPair(alg);
  }
  const { publicKey, privateKey } = await keypairPromise as any;

  if (!cachedJwk) {
    const jwk = (await exportJWK(publicKey)) as Jwk;
    (jwk as any).alg = alg;
    (jwk as any).use = "sig";
    (jwk as any).kid = "demo-key-1";
    cachedJwk = jwk;
  }

  return { privateKey, jwk: cachedJwk as Jwk };
}

export async function getSigner() {
  return ensureKeys();
}

export function jwksRouter() {
  const r = Router();
  r.get("/.well-known/jwks.json", async (_req, res) => {
    const { jwk } = await ensureKeys();
    res.json({ keys: [jwk] });
  });
  return r;
}
