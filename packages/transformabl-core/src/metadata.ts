// packages/transformabl-core/src/metadata.ts
//
// Metadata extraction from content.

import type { PiiMatch, ClassificationResult, ContentMetadata } from "./types.js";

/**
 * Extract metadata from content analysis results.
 */
export function extractMetadata(
  content: string,
  piiMatches: PiiMatch[],
  classification: ClassificationResult
): ContentMetadata {
  const piiTypes = [...new Set(piiMatches.map((m) => m.type))];

  return {
    contentLength: content.length,
    piiTypesDetected: piiTypes,
    piiMatchCount: piiMatches.length,
    riskScore: classification.riskScore,
    labels: classification.labels,
  };
}
