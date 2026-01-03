# API Contracts: Enhanced Import Flow

**Feature**: 005-enhanced-import-flow  
**Date**: 3 January 2026

This feature is entirely client-side - no new server endpoints are required. All data flows through the existing CRDT sync mechanism.

## Internal TypeScript Interfaces

### Filter API

```typescript
// src/lib/import/filter.ts

export type OldTransactionMode = "ignore-all" | "ignore-duplicates" | "do-not-ignore";

export interface FilterConfig {
  mode: OldTransactionMode;
  cutoffDays: number;
}

export interface FilterResult<T> {
  included: T[];
  excluded: T[];
  stats: FilterStats;
}

export interface FilterStats {
  totalCount: number;
  includedCount: number;
  excludedCount: number;
  oldDuplicatesCount: number;
  oldNonDuplicatesCount: number;
}

/**
 * Filters transactions based on age and duplicate status.
 * 
 * @param transactions - Array of transactions with date and isDuplicate fields
 * @param newestExistingDate - ISO date of the newest transaction in vault, or null if vault empty
 * @param config - Filter configuration
 * @returns Object with included/excluded arrays and statistics
 * 
 * @example
 * const result = filterOldTransactions(parsed, "2026-01-01", {
 *   mode: "ignore-duplicates",
 *   cutoffDays: 10
 * });
 */
export function filterOldTransactions<T extends { date: string; isDuplicate?: boolean }>(
  transactions: T[],
  newestExistingDate: string | null,
  config: FilterConfig
): FilterResult<T>;
```

---

### Duplicate Detection API (Extended)

```typescript
// src/lib/import/duplicates.ts - Extended interface

export type DateMatchMode = "exact" | "within";
export type DescriptionMatchMode = "exact" | "similar";

export interface DuplicateDetectionConfig {
  dateMatchMode: DateMatchMode;
  maxDateDiffDays: number;
  descriptionMatchMode: DescriptionMatchMode;
  minDescriptionSimilarity: number;
  maxAmountDiff: MoneyMinorUnits;
  minConfidence: number;
}

export interface DuplicateCheckResult {
  rowIndex: number;
  isDuplicate: boolean;
  matchedTransactionId: string | null;
  confidence: number;
  matchDetails: {
    dateScore: number;
    descriptionScore: number;
    amountMatches: boolean;
  };
}

/**
 * Check a single imported transaction against existing transactions.
 * 
 * @param imported - The imported transaction to check
 * @param existing - Array of existing transactions in the vault
 * @param config - Duplicate detection configuration
 * @returns Duplicate check result with confidence score
 */
export function checkDuplicate(
  imported: ParsedTransaction,
  existing: Transaction[],
  config: DuplicateDetectionConfig
): DuplicateCheckResult;

/**
 * Batch check multiple imported transactions.
 * 
 * @param imported - Array of imported transactions
 * @param existing - Array of existing transactions in the vault
 * @param config - Duplicate detection configuration
 * @returns Array of results in same order as input
 */
export function checkDuplicates(
  imported: ParsedTransaction[],
  existing: Transaction[],
  config: DuplicateDetectionConfig
): DuplicateCheckResult[];
```

---

### Template Service API

```typescript
// src/lib/import/templates.ts

export interface TemplateService {
  /**
   * Find templates matching a file signature (filename pattern, column headers).
   * Returns templates sorted by lastUsedAt descending.
   */
  findMatchingTemplates(
    fileName: string,
    headers: string[]
  ): ImportTemplate[];

  /**
   * Get the most recently used template for auto-selection.
   */
  getMostRecentTemplate(): ImportTemplate | null;

  /**
   * Save template settings. Creates new if templateId is null.
   * Updates lastUsedAt timestamp.
   */
  saveTemplate(
    templateId: string | null,
    name: string,
    config: ImportConfig
  ): ImportTemplate;

  /**
   * Find account matching OFX account ID.
   */
  findAccountByNumber(accountNumber: string): Account | null;
}
```

---

### Import State Hook API

```typescript
// src/hooks/use-import-state.ts

export interface UseImportStateReturn {
  // State
  session: ImportSession | null;
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  loadFile: (file: File) => Promise<void>;
  setConfig: (updates: Partial<ImportConfig>) => void;
  selectAccount: (accountId: string) => void;
  selectTemplate: (templateId: string | null) => void;
  
  // Computed
  previewTransactions: PreviewTransaction[];
  duplicateStats: { total: number; duplicates: number; filtered: number };
  canImport: boolean;
  validationErrors: ValidationError[];
  
  // Final actions
  importTransactions: () => Promise<ImportResult>;
  saveAsTemplate: (name: string) => Promise<ImportTemplate>;
  cancel: () => void;
}

export function useImportState(vaultId: string): UseImportStateReturn;
```

---

### Component Props Interfaces

```typescript
// src/components/features/import/ImportPanel.tsx
interface ImportPanelProps {
  vaultId: string;
  onComplete: () => void;
  onCancel: () => void;
}

// src/components/features/import/ImportTable.tsx
interface ImportTableProps {
  rawRows: string[][];
  previewTransactions: PreviewTransaction[];
  columnMappings: Record<string, string>;
  onRowClick?: (rowIndex: number) => void;
}

// src/components/features/import/ConfigTabs.tsx
interface ConfigTabsProps {
  config: ImportConfig;
  onChange: (updates: Partial<ImportConfig>) => void;
  headers: string[];  // For column mapping
}

// src/components/features/import/tabs/DuplicatesTab.tsx
interface DuplicatesTabProps {
  config: DuplicateDetectionConfig;
  onChange: (updates: Partial<DuplicateDetectionConfig>) => void;
  stats: { checked: number; duplicates: number };
}

// src/components/features/import/tabs/AccountTab.tsx
interface AccountTabProps {
  accounts: Account[];
  selectedAccountId: string | null;
  detectedAccountNumber: string | null;
  onSelect: (accountId: string) => void;
}
```

---

## Data Flow

```
┌─────────────┐
│  File Drop  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ useImportState.loadFile()                                   │
│ 1. Detect file type (CSV/OFX)                               │
│ 2. Parse raw content                                        │
│ 3. Auto-detect separators, headers, date format             │
│ 4. Extract OFX account ID if applicable                     │
│ 5. Find matching templates                                  │
│ 6. Auto-select most recent template or create defaults      │
│ 7. Initialize session state                                 │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Reactive Computation (on config change)                     │
│ 1. Apply column mappings to raw data                        │
│ 2. Run duplicate detection → mark transactions              │
│ 3. Run old transaction filter → split included/excluded     │
│ 4. Validate all transactions                                │
│ 5. Compute preview with statuses                            │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ UI Render                                                   │
│ - ImportTable shows raw + preview side by side              │
│ - ConfigTabs shows settings with real-time updates          │
│ - Import button enabled when canImport=true                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Validation Rules

| Field | Validation | Error Message |
|-------|-----------|---------------|
| selectedAccountId | Required for CSV and OFX | "Please select an account" |
| date | Valid ISO date | "Invalid date format in row {n}" |
| amount | Valid number | "Invalid amount in row {n}" |
| description | Non-empty after normalization | "Empty description in row {n}" |
| cutoffDays | 1-365 | "Cutoff must be between 1 and 365 days" |
| maxDateDiffDays | 0-365 | "Date range must be between 0 and 365 days" |
| minDescriptionSimilarity | 0-1 | "Similarity must be between 0% and 100%" |
