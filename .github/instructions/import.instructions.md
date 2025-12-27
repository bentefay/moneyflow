---
applyTo: "src/lib/import/**"
---

# Import Module Guidelines

This module handles parsing and processing transaction imports from CSV and OFX files.

## Architecture Overview

```
Import Flow:
  File Drop → Parse (CSV/OFX) → Column Mapping → Formatting → Preview → Import

Duplicate Detection:
  New Transaction → Check existing by (date + amount + description similarity)
                 → Flag as duplicateOf if match found
```

## Key Files

- `csv.ts` - CSV parsing with auto-detection of separators and headers
- `ofx.ts` - OFX/QFX bank file parsing
- `levenshtein.ts` - String similarity for duplicate detection
- `duplicates.ts` - Duplicate detection logic
- `processor.ts` - Main import processing pipeline
- `index.ts` - Public API exports

## CSV Parser

The CSV parser auto-detects:

- Separator (comma, semicolon, tab, pipe)
- Whether headers are present
- Date and number formats

```typescript
const result = parseCSV(content, {
  hasHeaders: true,
  separator: ",",
  dateFormat: "MM/dd/yyyy",
  decimalSeparator: ".",
  thousandSeparator: ",",
});
```

## OFX Parser

Handles OFX 1.x (SGML) and OFX 2.x (XML) formats:

```typescript
if (isOFXFormat(content)) {
  const result = parseOFX(content);
  // result.transactions, result.accountInfo
}
```

## Duplicate Detection

Uses Levenshtein distance for fuzzy matching:

```typescript
const config: DuplicateDetectionConfig = {
  dateWindowDays: 3, // ±3 days
  amountTolerance: 0.01, // 1 cent
  descriptionThreshold: 0.8, // 80% similarity
};

const matches = detectDuplicates(newTransactions, existingTransactions, config);
```

## Critical Rules

1. **Never trust user input** - Validate all parsed data
2. **Handle encoding** - Support UTF-8, Latin-1, Windows-1252
3. **Preserve original data** - Keep `originalRow` for debugging
4. **Validate dates** - Reject invalid dates, handle timezone carefully
5. **Validate amounts** - Parse carefully, handle negative formats like `(123.45)`
6. **Write tests** - Parsers need table-driven tests with real bank exports in `tests/unit/import/`

## Error Handling

Return structured errors, don't throw:

```typescript
interface ParseResult {
  success: boolean;
  transactions?: Transaction[];
  errors?: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}
```

## Testing

Test with real bank exports (anonymized) covering:

- Different date formats (US, EU, ISO)
- Different number formats (1,234.56 vs 1.234,56)
- Edge cases (empty fields, special characters, unicode)
- Large files (10k+ transactions)
