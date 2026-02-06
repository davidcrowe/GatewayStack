// packages/transformabl-core/src/index.ts
//
// Content transformation and safety preprocessing.
// No Express, no HTTP. Pure functions.
//
// FUTURE WORK:
// - Reversible pseudonymization with token mapping + rehydration
//   (replace PII with tokens like [EMAIL_1], restore in responses)
// - ML-based PII detection (plug in NER models for higher accuracy)
// - Advanced content classification:
//   - Hate speech detection
//   - Competitor mention detection
//   - Proprietary information detection
// - Input segmentation (split content into safe/unsafe/neutral zones)
// - Content normalization (standardize formatting, encoding)
// - Routing analysis (recommend provider/model based on content type)
// - Configurable per-tenant transformation pipelines
// - Bidirectional response filtering (detect hallucinated PII in responses)

export * from "./detect.js";
export * from "./redact.js";
export * from "./classify.js";
export * from "./metadata.js";
export * from "./transform.js";
export type * from "./types.js";
