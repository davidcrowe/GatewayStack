import { describe, it, expect } from "vitest";
import { resolveAuth, type AuthModeConfig, type AuthContext } from "../src/auth-modes.js";

describe("resolveAuth", () => {
  it("resolves api_key mode", () => {
    const cfg: AuthModeConfig = { mode: "api_key", apiKeyHeader: "x-api-key", apiKeyValue: "secret123" };
    const result = resolveAuth(cfg, {});
    expect(result).toEqual({ kind: "api_key", headerName: "x-api-key", value: "secret123" });
  });

  it("throws if api_key is missing header name", () => {
    const cfg: AuthModeConfig = { mode: "api_key", apiKeyHeader: "", apiKeyValue: "secret" };
    expect(() => resolveAuth(cfg, {})).toThrow("apiKeyHeader/apiKeyValue missing");
  });

  it("throws if api_key is missing value", () => {
    const cfg: AuthModeConfig = { mode: "api_key", apiKeyHeader: "x-api-key", apiKeyValue: "" };
    expect(() => resolveAuth(cfg, {})).toThrow("apiKeyHeader/apiKeyValue missing");
  });

  it("resolves forward_bearer mode", () => {
    const cfg: AuthModeConfig = { mode: "forward_bearer" };
    const ctx: AuthContext = { bearerToken: "tok_abc" };
    const result = resolveAuth(cfg, ctx);
    expect(result).toEqual({ kind: "bearer", token: "tok_abc" });
  });

  it("throws if forward_bearer has no incoming token", () => {
    const cfg: AuthModeConfig = { mode: "forward_bearer" };
    expect(() => resolveAuth(cfg, {})).toThrow("requires a Bearer token");
  });

  it("resolves service_oauth mode", () => {
    const cfg: AuthModeConfig = { mode: "service_oauth" };
    const ctx: AuthContext = { serviceToken: "svc_tok" };
    const result = resolveAuth(cfg, ctx);
    expect(result).toEqual({ kind: "bearer", token: "svc_tok" });
  });

  it("throws if service_oauth has no service token", () => {
    const cfg: AuthModeConfig = { mode: "service_oauth" };
    expect(() => resolveAuth(cfg, {})).toThrow("pre-loaded service token");
  });

  it("resolves user_oauth mode", () => {
    const cfg: AuthModeConfig = { mode: "user_oauth" };
    const ctx: AuthContext = { userToken: "usr_tok" };
    const result = resolveAuth(cfg, ctx);
    expect(result).toEqual({ kind: "bearer", token: "usr_tok" });
  });

  it("throws if user_oauth has no user token", () => {
    const cfg: AuthModeConfig = { mode: "user_oauth" };
    expect(() => resolveAuth(cfg, {})).toThrow("pre-loaded user token");
  });

  it("resolves none mode", () => {
    const cfg: AuthModeConfig = { mode: "none" };
    const result = resolveAuth(cfg, {});
    expect(result).toEqual({ kind: "none" });
  });

  it("throws on unknown mode", () => {
    const cfg = { mode: "magic" as any };
    expect(() => resolveAuth(cfg, {})).toThrow("Unknown auth mode");
  });

  it("trims whitespace from api key header and value", () => {
    const cfg: AuthModeConfig = { mode: "api_key", apiKeyHeader: "  x-key  ", apiKeyValue: "  val  " };
    const result = resolveAuth(cfg, {});
    expect(result).toEqual({ kind: "api_key", headerName: "x-key", value: "val" });
  });
});
