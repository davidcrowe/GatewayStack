# @gatewaystack/transformabl

Express middleware for PII detection, content redaction, safety classification, and risk-based request blocking.

Wraps [@gatewaystack/transformabl-core](https://www.npmjs.com/package/@gatewaystack/transformabl-core) with HTTP-aware middleware for Express applications.

## Installation

```bash
npm install @gatewaystack/transformabl
```

## Features

- **Content analysis** — detect PII + classify safety risks on every request
- **Optional body redaction** — replace PII in request body before it reaches your handler
- **Risk-based blocking** — reject requests above a configurable risk score threshold
- **Downstream metadata** — attaches `req.transformabl` for policy decisions and audit logging
- Re-exports all `@gatewaystack/transformabl-core` functions for direct use

## Quick Start

### Analyze content (annotate only)

```ts
import express from "express";
import { transformabl } from "@gatewaystack/transformabl";

const app = express();
app.use(express.json());

// Analyze all requests, attach metadata, don't modify body
app.use("/api/tools", transformabl());

app.post("/api/tools/invoke", (req, res) => {
  const analysis = req.transformabl;
  console.log("Risk score:", analysis.classification.riskScore);
  console.log("PII found:", analysis.piiMatches.length);
  // Body is unchanged — use metadata for logging/decisions
  res.json({ ok: true });
});
```

### Redact PII from request body

```ts
app.use("/api/tools", transformabl({
  redaction: { mode: "placeholder" },
  redactBody: true,
}));

// req.body now has PII replaced with [EMAIL], [SSN], etc.
```

### Block high-risk requests

```ts
app.use("/api/tools", transformabl({
  blockThreshold: 70, // Block requests with riskScore >= 70
}));

// Requests with prompt injection + PII get 403:
// { "error": "content_blocked", "message": "Content risk score (75) exceeds threshold (70)", "labels": [...] }
```

### Custom content extraction

```ts
app.use(transformabl({
  extractContent: (req) => req.body?.messages?.map((m: any) => m.content).join("\n"),
  redaction: { mode: "mask" },
  blockThreshold: 80,
}));
```

## How It Works

1. Extracts text from `req.body` (or custom extractor)
2. Runs the full `transformContent()` pipeline from transformabl-core:
   - PII detection (email, phone, SSN, credit card, IP, DOB)
   - Content classification (safety risks + regulatory flags)
   - Risk scoring (0-100)
   - Optional redaction
3. Attaches results to `req.transformabl`
4. If `blockThreshold` is set and risk score exceeds it, returns `403`
5. If `redactBody` is true, replaces `req.body` with redacted content

## Configuration

```ts
interface TransformablMiddlewareConfig {
  // Content extraction
  extractContent?: (req: any) => string;

  // Redaction options (from transformabl-core)
  redaction?: {
    mode?: "mask" | "remove" | "placeholder";
    maskChar?: string;
    maskKeep?: number;
    placeholder?: string;
    types?: PiiType[];
  };

  // Middleware behavior
  redactBody?: boolean;       // Replace req.body with redacted content (default: false)
  blockThreshold?: number;    // Risk score to reject requests (0-100, default: undefined)
}
```

## Middleware Chain

Place transformabl **before** validatabl in your middleware chain so policies can reference content classification:

```
identifiabl (JWT) → transformabl (PII/safety) → validatabl (policies) → limitabl (limits) → handler
```

## Related Packages

- [@gatewaystack/transformabl-core](https://www.npmjs.com/package/@gatewaystack/transformabl-core) — Framework-agnostic engine
- [@gatewaystack/validatabl](https://www.npmjs.com/package/@gatewaystack/validatabl) — Policy decisions based on classification
- [@gatewaystack/explicabl](https://www.npmjs.com/package/@gatewaystack/explicabl) — Audit logging with transformation metadata

## License

MIT
