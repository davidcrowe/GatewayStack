import { describe, it, expect } from "vitest";
import { checkSchema } from "../src/schema.js";

describe("checkSchema", () => {
  it("validates required fields", () => {
    const result = checkSchema({}, { type: "object", required: ["name"] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing required field: name");
  });

  it("passes when required fields present", () => {
    const result = checkSchema({ name: "test" }, { type: "object", required: ["name"] });
    expect(result.valid).toBe(true);
  });

  it("validates property types", () => {
    const result = checkSchema(
      { age: "not a number" },
      { type: "object", properties: { age: { type: "number" } } }
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("expected number");
  });

  it("validates enum values", () => {
    const result = checkSchema(
      { color: "green" },
      { type: "object", properties: { color: { enum: ["red", "blue"] } } }
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("must be one of");
  });

  it("rejects non-object input when object expected", () => {
    const result = checkSchema("string", { type: "object" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Expected an object");
  });

  it("passes valid input", () => {
    const result = checkSchema(
      { name: "test", age: 25 },
      {
        type: "object",
        required: ["name"],
        properties: { name: { type: "string" }, age: { type: "number" } },
      }
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
