import { describe, it, expect } from "vitest";
import {
  createIdentifiablVerifier,
  type IdentifiablCoreConfig,
  type GatewayIdentity,
} from "../src/index.js";

// NOTE: We can't test actual JWT verification without mocking jose or running
// a real JWKS server. These tests cover the config/factory API surface and
// verify that the verifier rejects invalid tokens gracefully.

describe("createIdentifiablVerifier", () => {
  const config: IdentifiablCoreConfig = {
    issuer: "https://test.auth0.com",
    audience: "https://api.test.com",
    source: "auth0",
    tenantClaim: "org_id",
    roleClaim: "https://test.com/roles",
    scopeClaim: "scope",
  };

  it("returns a function", () => {
    const verify = createIdentifiablVerifier(config);
    expect(typeof verify).toBe("function");
  });

  it("rejects an empty token", async () => {
    const verify = createIdentifiablVerifier(config);
    const result = await verify("");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("invalid_token");
    }
  });

  it("rejects a malformed token", async () => {
    const verify = createIdentifiablVerifier(config);
    const result = await verify("not.a.jwt");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("invalid_token");
    }
  });

  it("rejects garbage data", async () => {
    const verify = createIdentifiablVerifier(config);
    const result = await verify("completely-invalid-garbage");
    expect(result.ok).toBe(false);
  });

  it("trims trailing slashes from issuer", () => {
    const configWithSlash: IdentifiablCoreConfig = {
      issuer: "https://test.auth0.com/",
      audience: "https://api.test.com",
    };
    // Should not throw during construction
    const verify = createIdentifiablVerifier(configWithSlash);
    expect(typeof verify).toBe("function");
  });

  it("defaults jwksUri from issuer", () => {
    // This just ensures the factory doesn't throw when no jwksUri given
    const verify = createIdentifiablVerifier({
      issuer: "https://example.auth0.com",
      audience: "test",
    });
    expect(typeof verify).toBe("function");
  });
});

describe("GatewayIdentity type", () => {
  it("matches expected shape", () => {
    const identity: GatewayIdentity = {
      sub: "user123",
      issuer: "https://test.auth0.com",
      email: "user@test.com",
      name: "Test User",
      roles: ["admin"],
      scopes: ["read", "write"],
      source: "auth0",
      raw: {},
    };
    expect(identity.sub).toBe("user123");
    expect(identity.source).toBe("auth0");
  });
});
