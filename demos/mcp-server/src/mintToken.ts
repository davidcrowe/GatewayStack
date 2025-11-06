import { Router } from "express";
import * as jose from "jose";
import { getSigner } from "./jwks";

const ISSUER = process.env.DEMO_ISSUER ?? "http://localhost:5051/";
const AUDIENCE = process.env.DEMO_AUDIENCE ?? "https://gateway.local/api";

export function mintRouter() {
  const r = Router();
  r.post("/mint", async (req, res) => {
    const { sub = "user_demo_123", scope = "tool:read" } = req.body || {};
    const { privateKey } = await getSigner();
    const jwt = await new jose.SignJWT({ scope })
      .setProtectedHeader({ alg: "RS256", kid: "demo-key-1" })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setSubject(sub)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
    res.json({ access_token: jwt, token_type: "Bearer", expires_in: 300, scope });
  });
  return r;
}
