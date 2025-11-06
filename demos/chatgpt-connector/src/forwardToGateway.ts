import { Router } from "express";
import fetch from "node-fetch";

export function forwardRouter() {
  const r = Router();

  // A "tool" the Apps SDK connector would expose
  r.get("/calendar/list", async (req, res) => {
    const auth = req.headers.authorization; // ChatGPT passes user's bearer
    if (!auth) return res.status(401).json({ error: "missing user token" });

    const up = await fetch("http://localhost:8080/protected/calendar", {
      headers: { Authorization: auth }
    });
    const body = await up.text();
    res.status(up.status).type(up.headers.get("content-type") || "application/json").send(body);
  });

  r.post("/calendar/create", async (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "missing user token" });

    const up = await fetch("http://localhost:8080/protected/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify(req.body || {})
    });
    const body = await up.text();
    res.status(up.status).type(up.headers.get("content-type") || "application/json").send(body);
  });

  return r;
}
