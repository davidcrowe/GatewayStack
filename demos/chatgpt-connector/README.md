# ChatGPT Apps SDK Demo — User-Scoped OAuth

A minimal “Apps SDK-style connector” you can call with curl. It forwards to your gateway’s **/protected** routes so both READ and WRITE share the same verifier (demo JWKS).

---

## Prereqs

- Node 20+ / npm 10+
- Gatewaystack server in demo mode
- MCP demo issuer running (re-uses its PRM + JWKS)

---

## Start everything (3 terminals)

**A) Issuer / PRM / JWKS (5051)**

```bash
npm run --workspace @gatewaystack/demo-mcp-server dev
```

**B) Gateway in demo mode (8080)**

```bash
# apps/gateway-server/.env should include:
# DEMO_MODE=true
# OAUTH_ISSUER_DEMO=http://localhost:5051/
# OAUTH_AUDIENCE_DEMO=https://gateway.local/api
# OAUTH_JWKS_URI_DEMO=http://localhost:5051/.well-known/jwks.json
# OAUTH_SCOPES_DEMO=tool:read tool:write
DEMO_MODE=true npm run --workspace @gatewaystack/gateway-server dev
```

**C) Apps SDK connector demo (5052)**

```bash
npm run --workspace @gatewaystack/demo-chatgpt-connector dev
```

## **Mint tokens**

```bash
READ_TOKEN=$(curl -s -X POST http://localhost:5051/mint \
  -H 'content-type: application/json' \
  --data '{"scope":"tool:read","sub":"user_demo_123"}' | jq -r .access_token)

WRITE_TOKEN=$(curl -s -X POST http://localhost:5051/mint \
  -H 'content-type: application/json' \
  --data '{"scope":"tool:read tool:write","sub":"user_demo_123"}' | jq -r .access_token)
```

## **Call the Apps SDK demo endpoints**
**401 expected (no token)**

```bash
curl -i http://localhost:5052/apps/tools/list
```

**Read (200)**

```bash
curl -i -H "Authorization: Bearer $READ_TOKEN" \
  http://localhost:5052/apps/tools/list
```

**Write with READ token (403)**

```bash
curl -i -X POST -H "Authorization: Bearer $READ_TOKEN" \
  -H 'content-type: application/json' \
  --data '{"msg":"hello"}' \
  http://localhost:5052/apps/tools/create
```

**Write with WRITE token (200)**

```bash
curl -i -X POST -H "Authorization: Bearer $WRITE_TOKEN" \
  -H 'content-type: application/json' \
  --data '{"msg":"hello"}' \
  http://localhost:5052/apps/tools/create
```

## **Expected Results**

- ✅ `200 OK` on `/apps/tools/list` with read token  
- 🚫 `403 Forbidden` on `/apps/tools/create` with read token  
- ✅ `200 OK` on `/apps/tools/create` with write token (echo body + `sub`)

## **Troubleshooting**

- **404s:** This demo serves under `/apps/*`. Use `/apps/tools/list` and `/apps/tools/create`.  
- **401 `invalid_token`:** Restart gateway after restarting issuer (ephemeral JWKS).  
- **502 `bad_gateway`:** Ensure gateway is up and forwarding to `/protected/*`.

## **What this proves**

- ✅ Apps SDK connectors can be user-scoped without changes to your upstream app  
- 🔒 Scopes actually gate model capabilities  
- 🧩 The same gateway primitives work for MCP and Apps SDK


---
