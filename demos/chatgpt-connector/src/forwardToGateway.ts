import { Router } from "express";
import fetch from "node-fetch";

const GATEWAY = process.env.GATEWAY_URL ?? "http://localhost:8080";
// Use protected routes so both share the same verifier/JWKS
const READ_PATH  = process.env.GATEWAY_READ_PATH  ?? "/protected/ping";  // GET
const WRITE_PATH = process.env.GATEWAY_WRITE_PATH ?? "/protected/echo";  // POST

export function forwardRouter() {
  const r = Router();

  // Apps SDK "tool" list (READ)
  r.get("/tools/list", async (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) {
      // Apps SDK normally initiates auth; 401 is OK here for curl tests
      return res.status(401).json({ error: "missing user token" });
    }
    try {
      const up = await fetch(`${GATEWAY}${READ_PATH}`, {
        headers: { Authorization: auth }
      });
      const text = await up.text();
      res.status(up.status).type(up.headers.get("content-type") || "application/json").send(text);
    } catch (e: any) {
      res.status(502).json({ error: "bad_gateway", detail: e?.message });
    }
  });

  // Apps SDK "tool" create (WRITE)
  r.post("/tools/create", async (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ error: "missing user token" });
    }
    try {
      const up = await fetch(`${GATEWAY}${WRITE_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: auth
        },
        body: JSON.stringify(req.body || {})
      });
      const text = await up.text();
      res.status(up.status).type(up.headers.get("content-type") || "application/json").send(text);
    } catch (e: any) {
      res.status(502).json({ error: "bad_gateway", detail: e?.message });
    }
  });

  return r;
}
