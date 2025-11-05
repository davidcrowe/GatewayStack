export function buildProtectedResourcePayload(cfg) {
    const payload = {
        authorization_servers: [cfg.issuer],
        scopes_supported: cfg.scopes
    };
    if (cfg.audience)
        payload.resource = cfg.audience;
    return payload;
}
