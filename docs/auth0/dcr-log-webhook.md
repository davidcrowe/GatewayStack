# Auth0 DCR / Log Webhook — Auto-Promote ChatGPT Clients

Use this guide to wire the gateway’s **Dynamic Client Registration (DCR) + log-stream helper** that auto-promotes new ChatGPT OAuth clients and grants them the right scopes.

---

## 1. What this webhook does

When a new ChatGPT connector triggers DCR in Auth0, the gateway webhook:

1) **Promotes** the client into a PKCE-capable `regular_web` app.  
2) **Enables** the desired connection(s) (e.g., `google-oauth2`).  
3) **Grants** the client access to your API (`OAUTH_AUDIENCE`) with all required scopes.

Result: every new ChatGPT connector “just works” without manual Auth0 dashboard work.

---

## 2. Flow at a glance

1) ChatGPT hits your gateway, gets `401` with `resource_metadata` → `/.well-known/oauth-protected-resource`.  
2) ChatGPT reads PRM and learns `authorization_servers`, `resource`, `scopes_supported`.  
3) ChatGPT performs **DCR**: `POST https://<TENANT>/oidc/register`.  
4) Auth0 emits a log event.  
5) Auth0 Log Stream sends it to your gateway webhook: `POST https://<GATEWAY>/auth0-log-webhook`.  
6) Webhook calls Auth0 Management API to promote, enable connection(s), and create a client grant with all required scopes.  
7) Subsequent logins mint RS256 JWS tokens with correct `aud` and `scope`.

---

## 3. Endpoint and auth

- **URL:** `POST https://<YOUR_GATEWAY>/auth0-log-webhook` (or your chosen path; keep it consistent across Auth0 + gateway config).  
- **Auth:** shared secret header — the gateway accepts **either** of:
  - `Authorization: Bearer <LOG_WEBHOOK_SECRET>`
  - `X-Webhook-Secret: <LOG_WEBHOOK_SECRET>`

If the header does not match, the webhook returns 401/403 and ignores the payload.

---

## 4. Required environment variables

| Variable | Required? | Description |
| --- | --- | --- |
| `MGMT_DOMAIN` | ✅ | Auth0 tenant domain for Management API (e.g., `dev-xxxxxx.us.auth0.com`). |
| `MGMT_CLIENT_ID` | ✅ | Client ID of your Auth0 Management M2M app. |
| `MGMT_CLIENT_SECRET` | ✅ | Client secret for that M2M app. |
| `LOG_WEBHOOK_SECRET` | ✅ | Shared secret expected in `Authorization: Bearer <LOG_WEBHOOK_SECRET>` or `X-Webhook-Secret`.  |
| `GOOGLE_CONNECTION_NAME` | ✅ | Connection to enable on new clients (usually `google-oauth2`). |
| `OAUTH_AUDIENCE` | ✅ | API Identifier for your gateway-protected resource (e.g., `https://inner.app/api`). |
| `REQUIRED_SCOPES` / `TOOL_SCOPES` | ✅ (indirect) | Source scopes used to build the client grant (often derived from tool definitions). |

> In this repo, these map to:
> - `MGMT_DOMAIN` → Auth0 tenant domain
> - `MGMT_CLIENT_ID` / `MGMT_CLIENT_SECRET` → Management API M2M app
> - `LOG_WEBHOOK_SECRET` → shared secret used by the log stream
> - `GOOGLE_CONNECTION_NAME` → usually `google-oauth2`
> - `OAUTH_AUDIENCE` → your API Identifier (e.g., `https://inner.app/api`)
> - `TOOL_SCOPES` / `REQUIRED_SCOPES` → comma-separated list of scopes to grant


---

## 5. Auth0 Management API setup

Create a Machine-to-Machine app in Auth0 (Applications → Applications → Create Application → Machine to Machine) and select **Auth0 Management API** with minimal scopes:

```
read:clients
update:clients
read:connections
update:connections
read:logs
create:client_grants
read:client_grants
```

Set in your environment:

- `MGMT_CLIENT_ID`
- `MGMT_CLIENT_SECRET`
- `MGMT_DOMAIN` (e.g., `dev-xxxxxx.us.auth0.com`)

---

## 6. Auth0 Log Stream → Gateway

1) Auth0 Dashboard → **Monitoring → Streams → + Create Stream → Custom Webhook**.  
2) **URL:** `https://<YOUR_GATEWAY>/auth0-log-webhook`  
3) **Header:** either  
   - `Authorization: Bearer <LOG_WEBHOOK_SECRET>` **or**  
   - `X-Webhook-Secret: <LOG_WEBHOOK_SECRET>`  
4) Enable the stream.

Tip: In dev, send all logs. In prod, you can filter to `sapi` / `mgmt_api_*` / `oidc/register` events.

---

## 7. What the webhook does (step-by-step)

On `POST /auth0-log-webhook` the gateway:

1) Validates the shared secret from either `Authorization: Bearer <LOG_WEBHOOK_SECRET>` or `X-Webhook-Secret`.  
2) Iterates log entries in the payload.  
3) For each DCR-looking entry:  
   - Extracts `client_id`.  
   - `GET /api/v2/clients/{client_id}` (inspect).  
   - `PATCH /api/v2/clients/{client_id}` to promote:  
     - `app_type: regular_web`  
     - `grant_types: ["authorization_code", "refresh_token"]`  
     - `token_endpoint_auth_method: "none"` (PKCE)  
   - `PATCH /api/v2/connections/{GOOGLE_CONNECTION_NAME}` to enable the client.  
   - `POST /api/v2/client-grants` to ensure:  
     - `client_id` = new ChatGPT app  
     - `audience` = `OAUTH_AUDIENCE`  
     - `scope` = union of tool scopes (`REQUIRED_SCOPES` / `TOOL_SCOPES`)

You should see logs resembling:

```
[webhook:sample] [... oidc/register ...]
[dcr] promoting client { client_id: '...' }
[dcr] created client grant { clientId: '...', audience: 'https://inner.app/api', scopes: [...] }
[dcr] promoted+enabled+granted { client_id: '...', audience: 'https://inner.app/api', scopes: [...] }
```

---

## 8. Relationship to the Post-Login Action

- **DCR / Log Webhook (this doc):** runs once per client to fix app type, grant types, connections, and client grant.  
- **Post-Login Action (`chatgpt-post-login-action.md`):** runs on every login for that client to force audience, add scopes, and optionally assign a role + `uid` claim.

Use both for a smooth ChatGPT connector experience.

---

## 9. Health & visibility

If exposed, `GET /health/auth0` can show:

- JWKS reachability  
- Recent Management API status  
- Last time the log webhook saw an event

Example:

```bash
curl -s http://<GATEWAY>/health/auth0 | jq .
```

---

## 10. Troubleshooting

**Webhook never seems to run**  
- Check gateway logs for any `/auth0-log-webhook` entries.  
- In Auth0: Monitoring → Streams → ensure Enabled and not erroring.  
- Temporarily send all log types to confirm connectivity.

**Webhook returns 401/403**  
- Confirm either `Authorization: Bearer <LOG_WEBHOOK_SECRET>` or `X-Webhook-Secret: <LOG_WEBHOOK_SECRET>` in Auth0 matches `LOG_WEBHOOK_SECRET`.   
- Check URL (scheme/host/path, no stray slashes).

**Clients created but not promoted**  
- In Auth0 logs: look for `sapi` / `POST /oidc/register`.  
- In gateway logs: look for `[webhook:sample]` and `[dcr] promoting client`.  
- Verify `MGMT_DOMAIN`, `MGMT_CLIENT_ID`, `MGMT_CLIENT_SECRET` and scopes.

**Client grant missing scopes**  
- Confirm `OAUTH_AUDIENCE` matches your API Identifier exactly.  
- Check the client grant in Auth0.  
- Ensure tool configuration (`TOOL_SCOPES` / `REQUIRED_SCOPES`) includes the scopes you expect.

**ChatGPT still gets `insufficient_scope`**  
- Ensure the **Post-Login Action** is attached and calls `api.accessToken.setAudience(API_AUDIENCE)` and `api.accessToken.addScope(...)`.

---

## 11. TODOs

- Add a diagram: ChatGPT → Auth0 (DCR) → Auth0 Logs → Gateway `/auth0-log-webhook` → Auth0 Management API.  
- Link this doc from the main README and env/deploy docs.  
- Align variable names here (`LOG_WEBHOOK_SECRET` vs `WEBHOOK_SHARED_SECRET`, `MGMT_DOMAIN` vs `AUTH0_TENANT_DOMAIN`) with your `.env`.
