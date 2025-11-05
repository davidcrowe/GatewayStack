# 1) Well-known (resource metadata)
curl -sS https://YOUR_RUN_DOMAIN/.well-known/oauth-protected-resource | jq

# 2) Prompt OAuth (no token)
curl -i -sS https://YOUR_RUN_DOMAIN/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | sed -n '1,20p'

# Expect: 401 with WWW-Authenticate:
# Bearer resource_metadata="https://YOUR_RUN_DOMAIN/.well-known/oauth-protected-resource", scope="...", resource="https://inner.app/api"
