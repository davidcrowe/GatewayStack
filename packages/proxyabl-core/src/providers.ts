// packages/proxyabl-core/src/providers.ts
//
// Provider registry types for multi-provider proxy routing.

import type { AuthModeConfig } from "./auth-modes.js";

export interface ProviderConfig {
  key: string;
  baseUrl: string;
  auth: AuthModeConfig;
  allowedHosts: string[];
  timeoutMs?: number;
  maxResponseBytes?: number;
  headers?: Record<string, string>;
}

export interface ProviderRegistry {
  providers: Record<string, ProviderConfig>;
  defaultProvider?: string;
}

/**
 * Resolve a provider from the registry by key.
 * Returns the specified provider or the default provider.
 * Throws if the provider is not found.
 */
export function resolveProvider(registry: ProviderRegistry, providerKey?: string): ProviderConfig {
  const key = providerKey ?? registry.defaultProvider;

  if (!key) {
    throw new Error("No provider key specified and no default provider configured");
  }

  const provider = registry.providers[key];
  if (!provider) {
    const available = Object.keys(registry.providers).join(", ") || "(none)";
    throw new Error(`Provider "${key}" not found. Available: ${available}`);
  }

  return provider;
}
