# Troubleshooting

This page lists the most common errors and how to fix them quickly.

---

## Opaque / encrypted access token (JWE)
**Symptom:** Gateway returns `ACCESS_TOKEN_IS_ENCRYPTED_JWE` or signature verification fails.

**Fix:**
1. In Auth0, open your **API** used for the gateway.
2. Set **Signing Algorithm = RS256**.
3. Enable **RBAC** and **Add Permissions in the Access Token**.
4. Re-authorize in ChatGPT.

---

## Audience mismatch
**Symptom:** 401 with message indicating `aud` mismatch.

**Fix:**
- Ensure your gateway `AUTH0_AUDIENCE` matches the **Identifier** of your Auth0 API (e.g., `https://gateway.yourdomain.com/api`).
- Decode a token at https://jwt.io and confirm the `aud` claim equals that identifier.

---

## insufficient_scope
**Symptom:** 403 with `insufficient_scope` when calling a tool.

**Fix:**
1. In Auth0 → API → **Permissions**, add a permission that maps to your tool (e.g., `messages:read`).
2. In your Application, ensure the permission is granted.
3. In ChatGPT, re-authorize the connector (so a new token with scopes is issued).

---

## DCR promotion didn’t run
**Symptom:** Users can’t log in; the dynamically created client isn’t enabled for your connection or doesn’t have the API audience.

**Fix:**
- Confirm **Log Stream → Webhook** is configured to `https://<YOUR_GATEWAY_DOMAIN>/auth0/logs` with header `X-Webhook-Secret: <LOG_WEBHOOK_SECRET>`.
- Verify your Management API M2M app has scopes: `read:clients update:clients read:connections update:connections read:logs`.
- Check gateway logs for webhook events and promotion actions.

---

## 401 after previous success
**Symptom:** Calls worked, then started failing with 401.

**Fix:** Token likely expired or revoked. Re-authorize the connector in ChatGPT.

---

## Health checks
Use these endpoints to self-diagnose:
```bash
curl -s https://<YOUR_GATEWAY_DOMAIN>/health
curl -s https://<YOUR_GATEWAY_DOMAIN>/health/auth0
```
Interpretation:
- `jwksReachable: true` → JWKS URL ok
- `managementConfigured: true` + `managementTokenOk: true` → Management API credentials valid (if using DCR)
- `issuer`/`audience` → Confirm values match your Auth0 settings
