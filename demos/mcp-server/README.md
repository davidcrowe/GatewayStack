# MCP Demo — User-Scoped OAuth (PRM + JWKS)

This demo runs a minimal **MCP-style resource** that:
- Serves **Protected Resource Metadata (PRM)** at `/.well-known/oauth-protected-resource`
- Exposes a **JWKS** at `/.well-known/jwks.json` (ephemeral RS256 keypair)
- Mints **demo access tokens** at `/mint`
- Proxies **MCP‐like tools** through your Gatewaystack server so you can see:
  - 401 + PRM (no token)
  - 200 with `tool:read`
  - 403 with missing `tool:write`

> This is **auth-initiator agnostic**. It proves the handshake (401→PRM→token) and user-scoped enforcement with your gateway.

---

## Prereqs

- Node 20+ / npm 10+
- Gatewaystack server (this repo) installed via `npm i` at the repo root

---

## Start everything (3 terminals)

**A) MCP demo issuer (port 5051)**
```bash
npm run --workspace @gatewaystack/demo-mcp-server dev
```

**B) Gateway in demo mode (port 8080)**
```bash
# Ensure apps/gateway-server/.env contains:
# DEMO_MODE=true
# OAUTH_ISSUER_DEMO=http://localhost:5051/
# OAUTH_AUDIENCE_DEMO=https://gateway.local/api
# OAUTH_JWKS_URI_DEMO=http://localhost:5051/.well-known/jwks.json
# OAUTH_SCOPES_DEMO=tool:read tool:write
# ENABLE_TEST_ROUTES=true

# Then start gateway in demo mode
DEMO_MODE=true npm run --workspace @gatewaystack/gateway-server dev
```

**C) (Optional) Echo server (port 3333)**

```bash
npm run --workspace @gatewaystack/echo-server dev
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

## **Call the MCP demo endpoints**
**No token → 401 + PRM pointer**

```bash
curl -i http://localhost:5051/mcp/tools/list
```

**Read (200)**

```bash
curl -i -H "Authorization: Bearer $READ_TOKEN" \
  http://localhost:5051/mcp/tools/list
```

**Write with READ token (403)**

```bash
curl -i -X POST -H "Authorization: Bearer $READ_TOKEN" \
  http://localhost:5051/mcp/tools/create
```

**Write with WRITE token (200)**

```bash
curl -i -X POST -H "Authorization: Bearer $WRITE_TOKEN" \
  -H 'content-type: application/json' \
  --data '{"msg":"hello"}' \
  http://localhost:5051/mcp/tools/create
```

## **Expected**

- ✅ `GET /mcp/tools/list` → 200 with token, 401 without (PRM in `WWW-Authenticate`)
- 🚫 `POST /mcp/tools/create` → 403 with read-only token  
- ✅ `POST /mcp/tools/create` → 200 with `tool:write`


## **Troubleshooting**

401 invalid_token / kid mismatch: Restart the gateway after restarting the issuer (new ephemeral keypair).

**502 `bad_gateway`:** Gateway isn’t reachable or wrong path. Check:
```bash
curl -i http://localhost:8080/protected/ping
curl -i -X POST -H "Authorization: Bearer $WRITE_TOKEN" http://localhost:8080/protected/echo
```

404: Ensure demo forwards to /protected/ping and /protected/echo.

---

## **What this proves**

- ✅ Correct 401→PRM→token dance  
- 🔒 RS256 + JWKS verification  
- 🚫 Scope-based deny-by-default (403 for missing `tool:write`)  
- 🧩 Clean bridge from MCP clients to user-scoped gateways
