import { describe, it, expect } from "vitest";
import { resolveProvider, type ProviderRegistry } from "../src/providers.js";

describe("resolveProvider", () => {
  const registry: ProviderRegistry = {
    providers: {
      openai: {
        key: "openai",
        baseUrl: "https://api.openai.com",
        auth: { mode: "api_key", apiKeyHeader: "Authorization", apiKeyValue: "Bearer sk-xxx" },
        allowedHosts: ["api.openai.com"],
      },
      anthropic: {
        key: "anthropic",
        baseUrl: "https://api.anthropic.com",
        auth: { mode: "api_key", apiKeyHeader: "x-api-key", apiKeyValue: "sk-ant-xxx" },
        allowedHosts: ["api.anthropic.com"],
      },
    },
    defaultProvider: "openai",
  };

  it("resolves by explicit key", () => {
    const result = resolveProvider(registry, "anthropic");
    expect(result.key).toBe("anthropic");
    expect(result.baseUrl).toBe("https://api.anthropic.com");
  });

  it("falls back to default provider when no key given", () => {
    const result = resolveProvider(registry);
    expect(result.key).toBe("openai");
  });

  it("throws if provider key not found", () => {
    expect(() => resolveProvider(registry, "google")).toThrow('Provider "google" not found');
  });

  it("throws if no key and no default", () => {
    const noDefault: ProviderRegistry = { providers: registry.providers };
    expect(() => resolveProvider(noDefault)).toThrow("No provider key specified");
  });

  it("includes available providers in error message", () => {
    try {
      resolveProvider(registry, "missing");
    } catch (e: any) {
      expect(e.message).toContain("openai");
      expect(e.message).toContain("anthropic");
    }
  });
});
