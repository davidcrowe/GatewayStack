import { describe, it, expect } from "vitest";
import { assertUrlSafe, sanitizeHeaderValue } from "../src/security.js";

describe("assertUrlSafe", () => {
  it("allows HTTPS URL with host in allowedHosts", () => {
    const url = new URL("https://api.example.com/data");
    expect(() => assertUrlSafe(url, { allowedHosts: ["api.example.com"] })).not.toThrow();
  });

  it("blocks HTTP by default", () => {
    const url = new URL("http://api.example.com/data");
    expect(() => assertUrlSafe(url, { allowedHosts: ["api.example.com"] })).toThrow("Blocked protocol");
  });

  it("allows HTTP when allowHttp is true", () => {
    const url = new URL("http://api.example.com/data");
    expect(() => assertUrlSafe(url, { allowedHosts: ["api.example.com"], allowHttp: true })).not.toThrow();
  });

  it("blocks host not in allowedHosts", () => {
    const url = new URL("https://evil.com/data");
    expect(() => assertUrlSafe(url, { allowedHosts: ["api.example.com"] })).toThrow("Blocked host");
  });

  it("is case-insensitive for host matching", () => {
    const url = new URL("https://API.Example.COM/data");
    expect(() => assertUrlSafe(url, { allowedHosts: ["api.example.com"] })).not.toThrow();
  });

  it("blocks private IPv4 127.0.0.1", () => {
    const url = new URL("https://127.0.0.1/data");
    expect(() => assertUrlSafe(url, { allowedHosts: ["127.0.0.1"] })).toThrow("Blocked private IPv4");
  });

  it("blocks private IPv4 10.x.x.x", () => {
    const url = new URL("https://10.0.0.1/data");
    expect(() => assertUrlSafe(url, { allowedHosts: ["10.0.0.1"] })).toThrow("Blocked private IPv4");
  });

  it("blocks private IPv4 192.168.x.x", () => {
    const url = new URL("https://192.168.1.1/data");
    expect(() => assertUrlSafe(url, { allowedHosts: ["192.168.1.1"] })).toThrow("Blocked private IPv4");
  });

  it("blocks private IPv4 172.16.x.x", () => {
    const url = new URL("https://172.16.0.1/data");
    expect(() => assertUrlSafe(url, { allowedHosts: ["172.16.0.1"] })).toThrow("Blocked private IPv4");
  });

  it("allows private IPs when blockPrivateIps is false", () => {
    const url = new URL("https://127.0.0.1/data");
    expect(() => assertUrlSafe(url, { allowedHosts: ["127.0.0.1"], blockPrivateIps: false })).not.toThrow();
  });

  it("blocks non-http/https protocols", () => {
    const url = new URL("ftp://api.example.com/data");
    expect(() => assertUrlSafe(url, { allowedHosts: ["api.example.com"] })).toThrow("Blocked protocol");
  });

  it("allows multiple hosts in allowedHosts", () => {
    const url = new URL("https://api2.example.com/data");
    expect(() => assertUrlSafe(url, { allowedHosts: ["api1.example.com", "api2.example.com"] })).not.toThrow();
  });
});

describe("sanitizeHeaderValue", () => {
  it("strips CRLF characters", () => {
    expect(sanitizeHeaderValue("value\r\ninjected")).toBe("value injected");
  });

  it("trims whitespace", () => {
    expect(sanitizeHeaderValue("  value  ")).toBe("value");
  });

  it("handles clean values", () => {
    expect(sanitizeHeaderValue("Bearer abc123")).toBe("Bearer abc123");
  });
});
