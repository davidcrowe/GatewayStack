import { describe, it, expect } from "vitest";
import { redactPii } from "../src/redact.js";
import type { PiiMatch } from "../src/types.js";

describe("redactPii", () => {
  const emailMatch: PiiMatch = { type: "email", value: "john@example.com", start: 6, end: 22 };

  it("masks PII by default", () => {
    const result = redactPii("Email john@example.com here", [emailMatch]);
    expect(result).not.toContain("john@example.com");
    expect(result).toContain("**");
  });

  it("removes PII in remove mode", () => {
    const result = redactPii("Email john@example.com here", [emailMatch], { mode: "remove" });
    expect(result).toBe("Email  here");
  });

  it("uses placeholder mode", () => {
    const result = redactPii("Email john@example.com here", [emailMatch], { mode: "placeholder" });
    expect(result).toBe("Email [EMAIL] here");
  });

  it("supports custom placeholder format", () => {
    const result = redactPii("Email john@example.com here", [emailMatch], {
      mode: "placeholder",
      placeholder: "<<{TYPE}>>",
    });
    expect(result).toBe("Email <<EMAIL>> here");
  });

  it("only redacts specified types", () => {
    const matches: PiiMatch[] = [
      { type: "email", value: "a@b.com", start: 0, end: 7 },
      { type: "ssn", value: "123-45-6789", start: 8, end: 19 },
    ];
    const result = redactPii("a@b.com 123-45-6789", matches, { mode: "placeholder", types: ["ssn"] });
    expect(result).toContain("a@b.com");
    expect(result).toContain("[SSN]");
  });

  it("returns original text when no matches", () => {
    const result = redactPii("clean text", []);
    expect(result).toBe("clean text");
  });

  it("handles multiple matches in correct positions", () => {
    const matches: PiiMatch[] = [
      { type: "email", value: "a@b.com", start: 0, end: 7 },
      { type: "email", value: "c@d.com", start: 12, end: 19 },
    ];
    const result = redactPii("a@b.com and c@d.com", matches, { mode: "placeholder" });
    expect(result).toBe("[EMAIL] and [EMAIL]");
  });
});
