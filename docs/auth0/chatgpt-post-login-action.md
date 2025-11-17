# Auth0 Post-Login Action for ChatGPT Connectors

Use this guide to configure an **Auth0 Post-Login Action** that:

- Detects logins coming from **ChatGPT**.
- Forces the access token audience to your API so you get an RS256 JWT/JWS (not a JWE or opaque token).
- Ensures all scopes required by your **gateway** are present on the token.
- Optionally attaches a stable `uid` claim and auto-assigns a role.

If you skip this Action you may see errors such as:

- `ACCESS_TOKEN_IS_ENCRYPTED_JWE`
- `ACCESS_TOKEN_NOT_JWS`
- 401/403 responses from the gateway due to missing scopes.

---

## 1. Files in this directory

- `docs/auth0/chatgpt-post-login-action.md` ← this guide
- `docs/auth0/chatgpt-post-login-action.js` ← copy-paste Action code example

The JS file contains a **generic Post-Login Action** that you can adapt to your API and scopes.

---

## 2. Prerequisites

You should already have:

1) An Auth0 **tenant** where your gateway and APIs live.  
2) An Auth0 **API** representing your backend / gateway API  
   - Example Identifier: `https://inner.app/api` or `https://your-api.example.com`  
   -must have its Signing Algorithm set to RS256, not HS256
3) A ChatGPT connector pointing at your **gateway** URL and **OAuth issuer** (Auth0).

Optional but recommended: enable the **log stream** to your gateway’s `/auth0-log-webhook` endpoint (see `docs/reference/endpoints/tool-gateway.md` for the DCR/log-stream helper).

---

## 3. Example Post-Login Action code

The full example lives in `docs/auth0/chatgpt-post-login-action.js`. The generic pattern looks like:

```js
/**
 * Post-Login Action for the ChatGPT connector.
 *
 * - Matches ChatGPT client by name (DCR creates new client IDs when you re-add)
 * - Forces audience to your API so access_token is RS256 JWS (3 parts)
 * - Ensures required scopes are present
 * - Keeps your auto-role assignment (optional)
 */
exports.onExecutePostLogin = async (event, api) => {
  const CONNECTOR_ROLE_ID = event.secrets.CONNECTOR_ROLE_ID;
  const API_AUDIENCE = event.secrets.API_AUDIENCE || 'https://your-api.example.com';

  const clientName = (event.client && event.client.name) ? event.client.name.toLowerCase() : '';
  const isChatGPT = clientName.includes('chatgpt');

  console.log('post-login', {
    client_id: event.client && event.client.client_id,
    client_name: event.client && event.client.name,
    isChatGPT,
  });

  // Only run this logic for ChatGPT-origin logins
  if (!isChatGPT) return;

  // 1) Force the audience so Auth0 issues a JWS access token for your API
  api.accessToken.setAudience(API_AUDIENCE);

  // 2) Ensure the scopes your gateway requires
  const REQUIRED_SCOPES = [
    'your-api:read',
    'your-api:write',
    // add more if needed
  ];

  REQUIRED_SCOPES.forEach((s) => api.accessToken.addScope(s));

  // 3) Optional: stable uid claim for your backend
  api.accessToken.setCustomClaim('https://your-api.example.com/uid', event.user.user_id);

  // 4) Optional: auto-assign role
  if (CONNECTOR_ROLE_ID) {
    const alreadyHasRole =
      Array.isArray(event.authorization && event.authorization.roles) &&
      event.authorization.roles.some((r) => r && r.id === CONNECTOR_ROLE_ID);

    if (!alreadyHasRole) {
      try {
        await api.roles.assignUserRoles(event.user.user_id, [CONNECTOR_ROLE_ID]);
        console.log('Assigned connector role', {
          user: event.user.user_id,
          role: CONNECTOR_ROLE_ID,
        });
      } catch (e) {
        console.error('Role assignment failed', { error: e.message });
      }
    }
  }
};
```

**Inner-specific scopes (current production):**

```js
[
  'inner.dreams:read',
  'inner.dreams:write',
  'inner.events:read',
  'inner.images:create',
  'inner.memories:read',
  'inner.memories:write',
]
```

The checked-in `chatgpt-post-login-action.js` keeps the real `inner.*` scopes so it’s copy-paste ready for that app.

---

## 4. Create the Post-Login Action in Auth0

In the Auth0 Dashboard go to **Actions → Library → + Create Action**, then choose:

- **Name:** `auto-assign-openai-connector-role` (or similar)  
- **Trigger:** Login / Post Login  
- **Runtime:** Node 22 (recommended)

Replace the default code with the contents of `docs/auth0/chatgpt-post-login-action.js` and click **Deploy**.

> TODO: add a screenshot of the Post-Login Action editor with the code pasted and the Deploy button highlighted.

---

## 5. Configure Action secrets

In the Action editor sidebar add these secrets:

- `API_AUDIENCE` – your API Identifier, e.g. `https://inner.app/api` or `https://your-api.example.com`
- `CONNECTOR_ROLE_ID` – *(optional)* Auth0 Role ID to auto-assign to connector users

To find the role ID:

1) Go to **User Management → Roles**.  
2) Click your role (e.g. `chatgpt-connector`).  
3) Copy the `rol_123ABC...` portion from the URL (`https://YOUR_DOMAIN/dashboard/us/roles/rol_123ABC...`).  

Paste these into the **Secrets** section of the Action.

> TODO: add a screenshot of the Secrets panel showing `API_AUDIENCE` and `CONNECTOR_ROLE_ID`.

---

## 6. Attach the Action to the Post Login flow

Creating an Action is not enough—you must attach it to the Post Login flow:

1) Go to **Actions → Flows → Login / Post Login**.  
2) Drag your `auto-assign-openai-connector-role` Action from the right sidebar onto the canvas.  
3) Drop it between the **Start** and **Complete** nodes and click **Apply**.  

You should see: `Start (User Logged In) → auto-assign-openai-connector-role → Complete (Token Issued)`.

> TODO: add a screenshot of the Post Login flow with the Action node between Start and Complete.

---

## 7. How this interacts with the gateway DCR helper

If you’re using the gateway’s Auth0 log-stream / DCR helper:

- When ChatGPT first connects, Auth0 performs Dynamic Client Registration (`/oidc/register`).
- Your gateway’s `/auth0-log-webhook` receives that log event and:
  - Promotes the new ChatGPT client to a public, regular web application.
  - Enables the `google-oauth2` connection for that client.
  - Ensures a client grant exists for `API_AUDIENCE` with all `REQUIRED_SCOPES` (from the gateway’s `TOOL_SCOPES`).

This Action is the per-login fixup (audience and scopes per user). The DCR helper is the per-client fixup (grant types, connections, client grant). Together they produce an RS256 JWS token with the correct `aud` and `scope` for a dynamically-created ChatGPT application.

---

## 8. Verifying that everything works

### 8.1. In Auth0 Logs

1) Go to **Monitoring → Logs** and connect from ChatGPT again.  
2) Look for:
   - A **Success Login** for the ChatGPT application.
   - An **Actions Execution Success** entry for your Action.  

If you see **Actions Execution Failed** with messages like `Cannot read properties of undefined (reading 'debug')`, the Action code has a bug (e.g., `api.logging.debug` instead of `console.log`). Fix and redeploy.

### 8.2. In gateway logs

After reconnection you should **not** see `ACCESS_TOKEN_IS_ENCRYPTED_JWE`, `ACCESS_TOKEN_NOT_JWS`, or `insufficient_scope`. You should see:

- `iss` = your Auth0 domain  
- `aud` = your API identifier (`API_AUDIENCE`)  
- `scope` including all required scopes (e.g., `inner.dreams:read`, etc.)

If DCR is enabled, the helper logs will show messages like:

- `promoting client { client_id: '...' }`
- `created client grant { clientId: '...', audience: '...', scopes: [...] }`
- `promoted+enabled+granted { ... }`

---

## 9. Troubleshooting checklist

**A. Action never runs**  
- In Post Login flow, confirm the Action node is present between Start and Complete.  
- Confirm you clicked **Apply** after editing the flow.  
- In Logs, filter by `type: actions_execution_failed OR actions_execution_succeeded` and `client_name: ChatGPT`. If there is no Actions log, the Action is not attached or the login is happening through a different flow/application.

**B. ChatGPT asks for old or missing scopes**  
- Hit the gateway’s `GET /.well-known/oauth-protected-resource` and confirm `scopes_supported` includes all expected scopes.  
- Confirm `REQUIRED_SCOPES` match between the gateway code and the Post-Login Action.  
- Confirm the DCR helper created a client grant with the full scope list.

**C. Still seeing JWE / non-JWT tokens**  
- Ensure the Action calls `api.accessToken.setAudience(API_AUDIENCE);`.  
- Confirm `API_AUDIENCE` is set correctly in the Auth0 API Identifier, the Action secret, and the gateway environment (`OAUTH_AUDIENCE`).  
- In Auth0, make sure the API is configured for **RS256**.

**D. Deep inspection with `/debug-token` (optional)**  
- Capture an access token from gateway logs.  
- Call `GET /debug-token` with `Authorization: Bearer <token>`.  
- Inspect `sub`, `aud`, `scope`, and `permissions` as the gateway sees them to verify the Action and DCR helper are producing the intended token.

---

## 10. Summary

- Post-Login Action = per-login fixup (audience, scopes, optional role + uid).  
- DCR/log-stream helper = per-client fixup (grant types, Google connection, client grant).  
- For ChatGPT connectors to work with the gateway, you need **both**: this Post-Login Action wired into the Login/Post Login flow **and** the gateway’s `/auth0-log-webhook` configured as an Auth0 log stream.

Once in place, adding a new ChatGPT connector should be:

1) Add the connector in ChatGPT with your gateway URL.  
2) Approve the Auth0 consent screen once.  
3) Use tools.
