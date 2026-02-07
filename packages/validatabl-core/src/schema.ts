// packages/validatabl-core/src/schema.ts
//
// checkSchema: ensures tool calls and payloads conform to expected structures.
// Uses a simple JSON Schema subset (no external dependencies).

import type { SchemaValidationResult } from "./types.js";

/**
 * Validate an input payload against a JSON Schema-like descriptor.
 *
 * This is a lightweight validator for common cases. For full JSON Schema
 * validation, use Ajv in the consuming application. This covers:
 * - required fields
 * - type checking (string, number, boolean, object, array)
 * - enum values
 */
export function checkSchema(
  input: unknown,
  schema: SimpleSchema
): SchemaValidationResult {
  const errors: string[] = [];

  if (schema.type === "object") {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return { valid: false, errors: ["Expected an object"] };
    }

    const obj = input as Record<string, unknown>;

    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in obj) || obj[field] === undefined) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    // Check property types
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in obj && obj[key] !== undefined) {
          const propErrors = validateValue(obj[key], propSchema, key);
          errors.push(...propErrors);
        }
      }
    }
  } else {
    const topErrors = validateValue(input, schema, "input");
    errors.push(...topErrors);
  }

  return { valid: errors.length === 0, errors };
}

function validateValue(
  value: unknown,
  schema: SimplePropertySchema,
  path: string
): string[] {
  const errors: string[] = [];

  if (schema.type) {
    const actual = Array.isArray(value) ? "array" : typeof value;
    if (actual !== schema.type) {
      errors.push(`${path}: expected ${schema.type}, got ${actual}`);
    }
  }

  if (schema.enum && !schema.enum.includes(value as string)) {
    errors.push(`${path}: must be one of [${schema.enum.join(", ")}]`);
  }

  return errors;
}

/** Simplified JSON Schema type for lightweight validation. */
export interface SimplePropertySchema {
  type?: "string" | "number" | "boolean" | "object" | "array";
  enum?: (string | number)[];
}

export interface SimpleSchema extends SimplePropertySchema {
  required?: string[];
  properties?: Record<string, SimplePropertySchema>;
}
