// packages/transformabl-core/src/redact.ts
//
// PII redaction: mask, remove, or replace detected PII.

import type { PiiMatch, RedactionConfig, RedactionMode } from "./types.js";

/**
 * Redact PII matches from text.
 *
 * Modes:
 * - "mask": Replace middle characters with mask char (e.g., "jo**@example.com")
 * - "remove": Remove the PII entirely
 * - "placeholder": Replace with type label (e.g., "[EMAIL]")
 */
export function redactPii(
  text: string,
  matches: PiiMatch[],
  config?: RedactionConfig
): string {
  if (matches.length === 0) return text;

  const mode: RedactionMode = config?.mode ?? "mask";
  const maskChar = config?.maskChar ?? "*";
  const maskKeep = config?.maskKeep ?? 2;
  const typesToRedact = config?.types
    ? new Set(config.types)
    : null; // null = redact all

  // Process matches in reverse order to preserve positions
  const sorted = [...matches].sort((a, b) => b.start - a.start);
  let result = text;

  for (const match of sorted) {
    if (typesToRedact && !typesToRedact.has(match.type)) continue;

    let replacement: string;

    switch (mode) {
      case "mask":
        replacement = maskValue(match.value, maskChar, maskKeep);
        break;
      case "remove":
        replacement = "";
        break;
      case "placeholder":
        replacement = config?.placeholder
          ? config.placeholder.replace("{TYPE}", match.type.toUpperCase())
          : `[${match.type.toUpperCase()}]`;
        break;
    }

    result = result.slice(0, match.start) + replacement + result.slice(match.end);
  }

  return result;
}

function maskValue(value: string, maskChar: string, keep: number): string {
  if (value.length <= keep * 2) {
    return maskChar.repeat(value.length);
  }
  const start = value.slice(0, keep);
  const end = value.slice(-keep);
  const middle = maskChar.repeat(value.length - keep * 2);
  return start + middle + end;
}
