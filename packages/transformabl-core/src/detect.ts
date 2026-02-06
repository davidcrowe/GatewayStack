// packages/transformabl-core/src/detect.ts
//
// Regex-based PII detection.
//
// FUTURE WORK:
// - ML-based NER detection (plug in spaCy, Presidio, or cloud NER APIs)
// - Address detection (street addresses, zip codes)
// - Name detection (requires NER - too many false positives with regex)
// - International phone number formats
// - Passport numbers, driver's license numbers

import type { PiiType, PiiMatch } from "./types.js";

interface PiiPattern {
  type: PiiType;
  pattern: RegExp;
}

/**
 * Built-in PII detection patterns.
 * Each pattern uses the global flag for multi-match detection.
 */
const BUILTIN_PATTERNS: PiiPattern[] = [
  {
    type: "email",
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  },
  {
    type: "phone",
    // US phone numbers: (xxx) xxx-xxxx, xxx-xxx-xxxx, xxx.xxx.xxxx, +1xxxxxxxxxx
    pattern: /(?:\+1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g,
  },
  {
    type: "ssn",
    // US Social Security Numbers: xxx-xx-xxxx
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
  },
  {
    type: "credit_card",
    // Major card formats (Visa, MC, Amex, Discover) with optional separators
    pattern: /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  },
  {
    type: "ip_address",
    // IPv4 addresses
    pattern: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
  },
  {
    type: "date_of_birth",
    // Common date formats that might be DOBs: MM/DD/YYYY, DD-MM-YYYY, YYYY-MM-DD
    pattern: /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}-\d{2}-\d{2})\b/g,
  },
];

/**
 * Detect PII in text content.
 * Returns all matches with their positions.
 */
export function detectPii(
  text: string,
  customPatterns?: Array<{ type: string; pattern: RegExp }>
): PiiMatch[] {
  const matches: PiiMatch[] = [];
  const allPatterns: Array<{ type: string; pattern: RegExp }> = [
    ...BUILTIN_PATTERNS,
    ...(customPatterns ?? []),
  ];

  for (const { type, pattern } of allPatterns) {
    // Reset lastIndex for global regex reuse
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      matches.push({
        type: type as PiiType,
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  // Sort by position
  matches.sort((a, b) => a.start - b.start);
  return matches;
}
