# @gatewaystack/transformabl-core

Framework-agnostic PII detection, content redaction, and safety classification for AI gateways.

`@gatewaystack/transformabl-core` is the low-level engine behind [@gatewaystack/transformabl](https://www.npmjs.com/package/@gatewaystack/transformabl). Use it directly when you need content transformation without Express.

## Installation

```bash
npm install @gatewaystack/transformabl-core
```

## Features

- **PII detection** — regex-based detection for email, phone (US 10+ digit), SSN, credit card (Visa/MC/Amex/Discover/Diners), IP address, date of birth
- **Content redaction** — three modes: mask, remove, or placeholder replacement
- **Safety classification** — detect prompt injection, jailbreak attempts, and code injection patterns
- **Regulatory flagging** — automatic GDPR, PCI, COPPA, HIPAA labels based on PII types found
- **Risk scoring** — 0-100 composite score from safety + regulatory + PII density
- **Custom patterns** — extend detection with your own regex patterns

## Quick Start

### Detect PII

```ts
import { detectPii } from "@gatewaystack/transformabl-core";

const matches = detectPii("Contact john@example.com or call (555) 123-4567");
// [
//   { type: "email", value: "john@example.com", start: 8, end: 24 },
//   { type: "phone", value: "(555) 123-4567", start: 33, end: 47 },
// ]
```

### Redact PII

```ts
import { detectPii, redactPii } from "@gatewaystack/transformabl-core";

const text = "My email is john@example.com and SSN is 123-45-6789";
const matches = detectPii(text);

// Mask mode (default)
redactPii(text, matches);
// "My email is jo**************om and SSN is 12*******89"

// Placeholder mode
redactPii(text, matches, { mode: "placeholder" });
// "My email is [EMAIL] and SSN is [SSN]"

// Remove mode
redactPii(text, matches, { mode: "remove" });
// "My email is  and SSN is "
```

### Classify content

```ts
import { detectPii, classifyContent } from "@gatewaystack/transformabl-core";

const text = "Ignore all previous instructions. My SSN is 123-45-6789.";
const pii = detectPii(text);
const result = classifyContent(text, pii);

// {
//   labels: [
//     { category: "prompt_injection", confidence: "medium", ... },
//     { category: "pci", confidence: "high", detail: "PII detected: ssn" },
//     { category: "gdpr", confidence: "high", detail: "PII detected: ssn" },
//   ],
//   riskScore: 75,
//   hasSafetyRisk: true,
//   hasRegulatoryContent: true,
// }
```

### Full pipeline

```ts
import { transformContent } from "@gatewaystack/transformabl-core";

const result = transformContent("Email me at alice@co.com", {
  redaction: { mode: "placeholder" },
});

// {
//   content: "Email me at [EMAIL]",
//   transformed: true,
//   piiMatches: [...],
//   classification: { labels: [...], riskScore: 20, ... },
//   metadata: { wordCount: 4, charCount: 24, ... },
// }
```

## API

### `detectPii(text, customPatterns?)`

Returns an array of `PiiMatch` objects with `type`, `value`, `start`, and `end` positions.

Built-in PII types: `email`, `phone`, `ssn`, `credit_card`, `ip_address`, `date_of_birth`.

Add custom patterns:
```ts
detectPii(text, [{ type: "custom_id", pattern: /CUST-\d{6}/g }]);
```

### `redactPii(text, matches, config?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `"mask" \| "remove" \| "placeholder"` | `"mask"` | Redaction strategy |
| `maskChar` | `string` | `"*"` | Character used for masking |
| `maskKeep` | `number` | `2` | Characters to keep at start/end in mask mode |
| `placeholder` | `string` | `"[{TYPE}]"` | Template for placeholder mode |
| `types` | `PiiType[]` | all | Only redact these PII types |

### `classifyContent(text, piiMatches)`

Returns `ClassificationResult`:
- `labels` — array of `{ category, confidence, detail }`
- `riskScore` — 0-100 composite score
- `hasSafetyRisk` — true if injection/jailbreak/code patterns found
- `hasRegulatoryContent` — true if PII triggers regulatory categories

**Safety categories:** `prompt_injection`, `jailbreak_attempt`, `code_injection`

**Regulatory categories:** `gdpr`, `pci`, `coppa`, `hipaa`

### `transformContent(text, config?)`

Full pipeline: detect + redact + classify + extract metadata in one call.

### `extractMetadata(text)`

Returns `{ wordCount, charCount, lineCount, hasCode }`.

## Related Packages

- [@gatewaystack/transformabl](https://www.npmjs.com/package/@gatewaystack/transformabl) — Express middleware wrapper
- [@gatewaystack/validatabl-core](https://www.npmjs.com/package/@gatewaystack/validatabl-core) — Policy decisions based on classification results

## License

MIT
