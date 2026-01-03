# Data Model: Enhanced Import Flow

**Feature**: 005-enhanced-import-flow  
**Date**: 3 January 2026

## Entity Changes

### 1. ImportTemplate (Extended)

The existing `importTemplateSchema` gains new fields for duplicate detection and filtering.

```typescript
// src/lib/crdt/schema.ts - Extended ImportTemplate
{
  id: string;                      // UUID
  name: string;                    // User-assigned name
  
  // Existing fields
  columnMappings: Record<string, string>;
  formatting: {
    hasHeaders: boolean;           // Default: true
    thousandSeparator: string;     // Default: ","
    decimalSeparator: string;      // Default: "."
    dateFormat: string;            // Default: "yyyy-MM-dd"
    collapseWhitespace: boolean;   // NEW - Default: false
  };
  
  // NEW: Duplicate detection settings
  duplicateDetection: {
    dateMatchMode: "exact" | "within";              // Default: "within"
    maxDateDiffDays: number;                        // Default: 3 (only when mode="within")
    descriptionMatchMode: "exact" | "similar";      // Default: "similar"
    minDescriptionSimilarity: number;               // Default: 0.6 (only when mode="similar")
  };
  
  // NEW: Old transaction filtering
  oldTransactionFilter: {
    mode: "ignore-all" | "ignore-duplicates" | "do-not-ignore";  // Default: "ignore-duplicates"
    cutoffDays: number;                             // Default: 10
  };
  
  // NEW: Usage tracking for auto-selection
  lastUsedAt: number | null;       // Unix timestamp of last import
  
  // Soft delete
  deletedAt: number | null;
}
```

**Validation Rules**:
- `id`: Required, valid UUID
- `name`: Required, 1-100 characters, unique within vault
- `maxDateDiffDays`: 0-365 inclusive
- `cutoffDays`: 1-365 inclusive
- `minDescriptionSimilarity`: 0.0-1.0 inclusive

**State Transitions**: None (template is a settings object, not a state machine)

---

### 2. Account (Unchanged - Use Existing Field)

The existing `accountNumber` field in accounts is reused for OFX matching. No schema changes required.

```typescript
// Existing account schema (relevant fields)
{
  id: string;
  name: string;
  accountNumber: string | null;    // Used for OFX <ACCTID> matching
  currency: string;
  // ... other fields
}
```

**OFX Matching Logic**:
1. Parse `<ACCTID>` from OFX file
2. Find accounts where `accountNumber === ofxAccountId`
3. If match found: pre-select that account
4. If no match: require user selection

---

### 3. ImportSession (Ephemeral - Client State Only)

Import session state is **not persisted to CRDT** - it exists only during the import process in React state.

```typescript
// src/lib/import/types.ts
interface ImportSession {
  // File metadata
  fileId: string;                  // Random ID for this import session
  fileName: string;
  fileType: "csv" | "ofx";
  rawContent: string;              // Original file content
  
  // Parsed data
  rawRows: string[][];             // For CSV: [row][column]
  parsedTransactions: ParsedTransaction[];
  
  // Configuration (from selected template, editable)
  templateId: string | null;
  config: ImportConfig;
  
  // Account selection
  selectedAccountId: string | null;
  detectedAccountNumber: string | null;  // From OFX <ACCTID>
  
  // Computed state
  previewTransactions: PreviewTransaction[];
  duplicateResults: DuplicateCheckResult[];
  filteredOut: ParsedTransaction[];      // Transactions excluded by filter
  
  // Validation
  validationErrors: ValidationError[];
  canImport: boolean;
}

interface ImportConfig {
  formatting: FormattingSettings;
  duplicateDetection: DuplicateDetectionSettings;
  oldTransactionFilter: FilterSettings;
  columnMappings: Record<string, string>;
}
```

---

### 4. PreviewTransaction (View Model)

Represents a transaction in the preview table with computed status.

```typescript
interface PreviewTransaction {
  rowIndex: number;                // Original row in raw data
  
  // Core fields (displayed in preview)
  date: string;                    // ISO 8601 date
  description: string;             // Cleaned/normalized description
  amount: MoneyMinorUnits;         // Integer in minor units
  
  // Status indicators
  status: "valid" | "invalid" | "duplicate" | "filtered";
  duplicateOf: string | null;      // ID of matching existing transaction
  duplicateConfidence: number;     // 0.0-1.0
  validationErrors: string[];      // e.g., ["Invalid date format"]
}
```

---

### 5. DuplicateDetectionConfig (Refined)

Extends existing config with user-controllable match modes.

```typescript
// src/lib/import/duplicates.ts
interface DuplicateDetectionConfig {
  // Date matching
  dateMatchMode: "exact" | "within";
  maxDateDiffDays: number;         // Only used when mode="within"
  
  // Description matching
  descriptionMatchMode: "exact" | "similar";
  minDescriptionSimilarity: number;  // Only used when mode="similar"
  
  // Amount matching (unchanged)
  maxAmountDiff: MoneyMinorUnits;  // Default: 1 (cent)
  
  // Threshold for flagging as duplicate
  minConfidence: number;           // Default: 0.7
}
```

---

### 6. FilterResult

Output of old transaction filtering.

```typescript
// src/lib/import/filter.ts
interface FilterResult<T> {
  included: T[];           // Transactions to show in preview
  excluded: T[];           // Transactions filtered out (shown grayed/hidden)
  stats: {
    totalCount: number;
    includedCount: number;
    excludedCount: number;
    oldDuplicatesCount: number;    // When mode="ignore-duplicates"
    oldNonDuplicatesCount: number; // Old but NOT duplicates (still included)
  };
}
```

---

## Relationships

```
Vault 1───* ImportTemplate
       1───* Account
       1───* Transaction (existing)

ImportTemplate ───uses─── DuplicateDetectionConfig
               ───uses─── FilterSettings
               ───uses─── FormattingSettings

ImportSession ───references─── ImportTemplate
              ───references─── Account
              ───produces─── PreviewTransaction[]

OFX File ───detected─── accountNumber ───matches─── Account.accountNumber
```

---

## Schema Migration

No database migration required. All changes are to the CRDT schema:

```typescript
// src/lib/crdt/schema.ts additions
export const importTemplateSchema = schema.LoroMap({
  // ... existing fields ...
  
  // Add these new nested maps:
  duplicateDetection: schema.LoroMap({
    dateMatchMode: schema.String({ defaultValue: "within" }),
    maxDateDiffDays: schema.Number({ defaultValue: 3 }),
    descriptionMatchMode: schema.String({ defaultValue: "similar" }),
    minDescriptionSimilarity: schema.Number({ defaultValue: 0.6 }),
  }),
  
  oldTransactionFilter: schema.LoroMap({
    mode: schema.String({ defaultValue: "ignore-duplicates" }),
    cutoffDays: schema.Number({ defaultValue: 10 }),
  }),
  
  lastUsedAt: schema.Number(),
});

// Add collapseWhitespace to existing formatting map
formatting: schema.LoroMap({
  // ... existing ...
  collapseWhitespace: schema.Boolean({ defaultValue: false }),
}),
```

Existing templates without these fields will use default values (schema's defaultValue mechanism handles this).
