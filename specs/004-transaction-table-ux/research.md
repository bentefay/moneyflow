# Research: Transaction Table UX Improvements

**Date**: 2025-12-31  
**Feature**: 004-transaction-table-ux

## Research Task 1: Temporal API Browser Support & Polyfill Strategy

### Decision: Use `@js-temporal/polyfill` with dynamic import

### Rationale

The Temporal API is at Stage 3 in TC39 and not yet shipped in any major browser (as of December 2025). However, it provides significant advantages for date handling:

1. **Explicit timezone handling** - No more UTC/local confusion
2. **ISO 8601 string parsing** - Native support for YYYY-MM-DD format we use
3. **Locale-aware formatting** - `Temporal.PlainDate.toLocaleString()` respects `Intl` options

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **Temporal polyfill** ✅ | Future-proof, correct API | ~20KB gzipped, polyfill overhead |
| `Intl.DateTimeFormat` only | No polyfill needed | No Temporal types, less ergonomic |
| `date-fns` | Battle-tested, tree-shakeable | Another dependency, not Temporal API |

### Implementation

```typescript
// src/lib/utils/date-format.ts
import { Temporal } from "@js-temporal/polyfill";

export function formatDate(isoDate: string, locale?: string): string {
  const date = Temporal.PlainDate.from(isoDate);
  return date.toLocaleString(locale ?? navigator.language, {
    month: "short",
    day: "numeric", 
    year: "numeric",
  });
}

// Usage in DateCell.tsx
const formatted = formatDate(transaction.date); // "Dec 31, 2025" for en-US
```

### Performance Note

Polyfill should be imported at app root to avoid repeated initialization. The polyfill is tree-shakeable—only import what we use.

---

## Research Task 2: TanStack Virtual Selection Tracking

### Decision: Maintain selection state externally from virtualizer

### Rationale

TanStack Virtual doesn't manage selection—it only manages which rows are rendered. Selection state must be tracked separately as a `Set<string>` of transaction IDs.

### Key Insight

When "Select All Filtered" is clicked:
1. We need ALL filtered transaction IDs, not just rendered ones
2. The filter is applied before virtualization
3. We pass `filteredTransactionIds: string[]` to the selection hook

### Implementation Pattern

```typescript
// useTableSelection.ts
interface UseTableSelectionOptions {
  filteredIds: string[];  // All IDs matching current filter
  onSelectionChange?: (ids: Set<string>) => void;
}

function useTableSelection({ filteredIds, onSelectionChange }: UseTableSelectionOptions) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  
  const isAllSelected = filteredIds.length > 0 && 
    filteredIds.every(id => selectedIds.has(id));
  
  const isSomeSelected = filteredIds.some(id => selectedIds.has(id));
  
  const selectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIds));
    }
  }, [filteredIds, isAllSelected]);
  
  const toggleRow = useCallback((id: string, shiftKey: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (shiftKey && lastSelectedId) {
        // Range select
        const startIdx = filteredIds.indexOf(lastSelectedId);
        const endIdx = filteredIds.indexOf(id);
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        for (let i = from; i <= to; i++) {
          next.add(filteredIds[i]);
        }
      } else {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      return next;
    });
    setLastSelectedId(id);
  }, [filteredIds, lastSelectedId]);
  
  return { selectedIds, isAllSelected, isSomeSelected, selectAll, toggleRow };
}
```

---

## Research Task 3: Always-Editable Cell Pattern

### Decision: Single component state, CSS-only focus indication

### Rationale

The "always-editable" appearance means:
1. Cell always renders an `<input>` or appropriate control
2. Unfocused: subtle border (transparent or `border-muted`)
3. Focused: visible border (`border-primary`)
4. No height/layout changes between states

### Key CSS Pattern

```css
/* Always-editable input */
.editable-cell {
  @apply border border-transparent bg-transparent px-2 py-1;
  @apply focus:border-primary focus:outline-none focus:ring-0;
  @apply transition-colors duration-100;
}

/* Numeric values get monospace */
.editable-cell-numeric {
  @apply font-mono tabular-nums text-right;
}
```

### Implementation

```tsx
// EditableCell.tsx - Base wrapper
interface EditableCellProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  type?: "text" | "number" | "date";
  className?: string;
}

export function EditableCell({ value, onChange, type = "text", className }: EditableCellProps) {
  const [localValue, setLocalValue] = useState(value);
  
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };
  
  return (
    <input
      type={type}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      className={cn(
        "w-full border border-transparent bg-transparent px-2 py-1",
        "focus:border-primary focus:outline-none",
        "transition-colors duration-100",
        type === "number" && "font-mono tabular-nums text-right",
        className
      )}
    />
  );
}
```

### No "isEditing" State

The previous implementation had `isEditing` state that caused mode switching. The new pattern:
- Always render the input
- Focus/blur events handle save logic
- CSS handles visual feedback

---

## Research Task 4: Bulk CRDT Operations with loro-mirror

### Decision: Use `setState` with batch mutations inside single callback

### Rationale

loro-mirror's `setState` batches all mutations in a single callback into one CRDT operation. This is already the optimal pattern.

### Implementation Pattern

```typescript
// Bulk edit 100 transactions
const bulkSetTags = useCallback((transactionIds: string[], tagIds: string[]) => {
  setState((draft) => {
    for (const txId of transactionIds) {
      if (draft.transactions[txId]) {
        draft.transactions[txId].tagIds = tagIds;
      }
    }
  });
}, [setState]);
```

### Performance Considerations

1. **Batch size**: For 1000+ transactions, consider chunking with `requestIdleCallback`:

```typescript
async function bulkEditChunked(ids: string[], update: (draft: Transaction) => void) {
  const CHUNK_SIZE = 100;
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    setState((draft) => {
      for (const id of chunk) {
        if (draft.transactions[id]) {
          update(draft.transactions[id]);
        }
      }
    });
    // Yield to UI
    await new Promise(resolve => requestIdleCallback(resolve));
  }
}
```

2. **Progress indicator**: Track completion percentage for large operations

3. **CRDT sync**: Loro handles merging; multiple users bulk-editing is safe

---

## Summary of Decisions

| Task | Decision | Key Rationale |
|------|----------|---------------|
| Temporal API | `@js-temporal/polyfill` | Future-proof, correct API |
| Selection tracking | External `Set<string>` | Virtualizer doesn't manage state |
| Editable cells | Single component, CSS focus | No mode switch, no layout shift |
| Bulk CRDT ops | Single `setState` callback | Already optimal batching |
