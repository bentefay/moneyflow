# Research: Enhanced Import Flow

**Feature**: 005-enhanced-import-flow  
**Date**: 3 January 2026

## Technology Decisions

### 1. Animated Tabs Component

**Decision**: Use animate-ui/radix-tabs (`@animate-ui/components-radix-tabs`)

**Rationale**:
- Built on Radix UI primitives (same foundation as existing shadcn/ui)
- Provides smooth height animations between tab contents via `TabsContents` wrapper
- Drop-in compatible with existing Tailwind/shadcn styling conventions
- Installs via shadcn CLI: `npx shadcn@latest add @animate-ui/components-radix-tabs`

**Alternatives Considered**:
- Plain shadcn/ui tabs: No animation, less polished feel
- Framer Motion custom tabs: More work, same result
- Headless UI tabs: Different primitive ecosystem, would require more integration work

**Integration Notes**:
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContents, TabsContent } from "@/components/ui/tabs";

<Tabs defaultValue="template">
  <TabsList>
    <TabsTrigger value="template">Template</TabsTrigger>
    <TabsTrigger value="mapping">Mapping</TabsTrigger>
    {/* ... */}
  </TabsList>
  <TabsContents mode="auto-height">
    <TabsContent value="template">...</TabsContent>
    <TabsContent value="mapping">...</TabsContent>
  </TabsContents>
</Tabs>
```

---

### 2. Duplicate Detection Algorithm

**Decision**: Extend existing `src/lib/import/duplicates.ts` with configurable matching modes

**Rationale**:
- Current implementation already has Levenshtein-based similarity (`normalizedSimilarity`)
- Current config (`DuplicateDetectionConfig`) supports `maxDateDiffDays` and `minDescriptionSimilarity`
- Need to add explicit "exact match" mode for stricter matching
- Need to make config user-controllable (currently hardcoded defaults)

**Current Implementation** (from `duplicates.ts`):
```typescript
export interface DuplicateDetectionConfig {
  maxDateDiffDays: number;           // Default: 3
  maxAmountDiff: MoneyMinorUnits;    // Default: 1 (cent)
  minDescriptionSimilarity: number;  // Default: 0.6 (60%)
  minConfidence: number;             // Default: 0.7 (70%)
}
```

**Changes Needed**:
1. Add `dateMatchMode: "exact" | "within"` field
2. Add `descriptionMatchMode: "exact" | "similar"` field
3. Expose config through template schema
4. Update `checkDuplicate()` to respect new modes

---

### 3. Old Transaction Filtering

**Decision**: New pure function `filterOldTransactions()` in `src/lib/import/filter.ts`

**Rationale**:
- Separates concerns: filtering is distinct from duplicate detection
- Pure function enables easy unit testing
- Three modes map to simple conditional logic:
  - "ignore all": Filter out all transactions older than cutoff
  - "ignore duplicates": Filter out old transactions that ARE duplicates
  - "do not ignore": No filtering (pass-through)

**Function Signature**:
```typescript
export type OldTransactionMode = "ignore-all" | "ignore-duplicates" | "do-not-ignore";

export interface FilterConfig {
  cutoffDays: number;
  mode: OldTransactionMode;
}

export function filterOldTransactions<T extends { date: string; isDuplicate?: boolean }>(
  transactions: T[],
  newestExistingDate: string | null,
  config: FilterConfig
): { included: T[]; excluded: T[] }
```

---

### 4. Account External ID Field

**Decision**: Reuse existing `accountNumber` field in account schema for OFX matching

**Rationale**:
- Schema already has `accountNumber: schema.String()` on accounts
- OFX files contain `<ACCTID>` which maps to this field
- No schema migration needed
- Rename consideration: "accountNumber" is accurate for OFX account IDs

**OFX Account ID Extraction** (from `src/lib/import/ofx.ts`):
- `<ACCTID>` tag in OFX contains bank's account identifier
- Already parsed into `ParsedOFXAccount.accountId`

---

### 5. Import Template Schema Extension

**Decision**: Extend `importTemplateSchema` in CRDT schema to include new settings

**Current Schema** (from `schema.ts`):
```typescript
export const importTemplateSchema = schema.LoroMap({
  id: schema.String({ required: true }),
  name: schema.String({ required: true }),
  columnMappings: schema.LoroMapRecord(schema.String()),
  formatting: schema.LoroMap({
    hasHeaders: schema.Boolean({ defaultValue: true }),
    thousandSeparator: schema.String({ defaultValue: "," }),
    decimalSeparator: schema.String({ defaultValue: "." }),
    dateFormat: schema.String({ defaultValue: "yyyy-MM-dd" }),
  }),
  deletedAt: schema.Number(),
});
```

**Additions Needed**:
```typescript
// Add to importTemplateSchema:
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
formatting: schema.LoroMap({
  // ... existing fields ...
  collapseWhitespace: schema.Boolean({ defaultValue: false }),
}),
lastUsedAt: schema.Number(),  // For auto-selecting most recent template
```

---

### 6. Split Table Layout

**Decision**: CSS Grid with `repeat(auto-fit, minmax())` for responsive raw/preview columns

**Rationale**:
- Grid handles side-by-side (desktop) and stacked (mobile) layouts naturally
- Strong vertical divider achieved with `border-r-4` class
- TanStack Virtual can be applied to both raw and preview simultaneously
- Existing `PreviewStep.tsx` table structure can be adapted

**Layout Strategy**:
```tsx
// Desktop: side-by-side
<div className="grid grid-cols-[1fr_4px_1fr] lg:grid-cols-[1fr_4px_2fr]">
  <RawDataColumns />
  <div className="bg-border" /> {/* Strong vertical divider */}
  <PreviewColumns />
</div>

// Mobile (<768px): stacked via CSS
@media (max-width: 768px) {
  .import-table { grid-template-columns: 1fr; }
}
```

---

### 7. Auto-Detection Timing

**Decision**: Run auto-detection on file load, not on user action

**Rationale**:
- Current implementation has `detectSeparator()`, `detectHeaders()` in `csv.ts`
- Current implementation has `initializeColumnMappings()` that auto-maps common headers
- These are already called in `handleFileSelect` callback
- Remove "Auto-detect" buttons; detection runs automatically
- User can still override any auto-detected setting via tabs

**Implementation**: No new code needed; remove UI buttons that manually trigger detection.

---

## Best Practices

### Import Flow State Management

Use a single `useImportState` hook to manage all import session state:
- File content and metadata
- Parsed raw data (CSV rows or OFX transactions)
- Current configuration (template settings)
- Computed preview transactions
- Validation state

This follows the pattern established in `useTransactionSelection.ts` - centralized state with computed derivations.

### Testing Strategy

1. **Unit Tests** (`tests/unit/import/`):
   - `filter.test.ts`: Table-driven tests for `filterOldTransactions()` covering all three modes
   - `duplicates.test.ts`: Add tests for exact vs. similar matching modes
   - Property-based tests: Amount comparisons are exact integers, date comparisons respect timezone

2. **E2E Tests** (`tests/e2e/import.spec.ts`):
   - Test tab navigation and preview updates
   - Test account selection validation
   - Test duplicate detection with different settings
   - Test old transaction filtering
