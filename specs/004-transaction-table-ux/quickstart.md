# Quickstart Guide: Transaction Table UX Improvements

**Date**: 2025-12-31  
**Feature**: 004-transaction-table-ux

## Implementation Order

Follow this order to minimize merge conflicts and enable incremental testing.

### Phase A: Foundation (No UI Changes Visible)

1. **Install Temporal polyfill**
   ```bash
   pnpm add @js-temporal/polyfill
   ```

2. **Create date formatting utility**
   - File: `src/lib/utils/date-format.ts`
   - Uses Temporal API with locale support
   - Unit test: `tests/unit/transactions/date-format.test.ts`

3. **Create selection hook**
   - File: `src/components/features/transactions/hooks/useTableSelection.ts`
   - Pure logic, no UI dependencies
   - Unit test: `tests/unit/transactions/selection.test.ts`

4. **Create keyboard navigation hook**
   - File: `src/components/features/transactions/hooks/useKeyboardNavigation.ts`
   - Pure logic, state machine
   - Unit test with state transitions

### Phase B: Core Cell Components

5. **Create EditableCell base component**
   - File: `src/components/features/transactions/cells/EditableCell.tsx`
   - Always-editable appearance
   - Handles focus, blur, keyboard events
   - No mode switching

6. **Create CheckboxCell component**
   - File: `src/components/features/transactions/cells/CheckboxCell.tsx`
   - Supports indeterminate state
   - Passes shift-key info to parent

7. **Refactor DateCell to use Temporal API**
   - Modify: `src/components/features/transactions/cells/DateCell.tsx`
   - Use new date-format utility
   - Inherit from EditableCell pattern

8. **Create MerchantCell (rename from description)**
   - File: `src/components/features/transactions/cells/MerchantCell.tsx`
   - Simple text cell
   - Inherits EditableCell pattern

9. **Fix column alignments in all cells**
   - Modify: All cell components
   - Add `align` prop consistent with data-model.md

### Phase C: Table Structure

10. **Extract TransactionTableHeader**
    - File: `src/components/features/transactions/TransactionTableHeader.tsx`
    - Select-all checkbox
    - Column headers with proper alignment

11. **Create ActionsCell**
    - File: `src/components/features/transactions/cells/ActionsCell.tsx`
    - Add description button
    - Delete button with confirmation

12. **Create TransactionDescriptionRow**
    - File: `src/components/features/transactions/TransactionDescriptionRow.tsx`
    - Expandable row below main row
    - Full-width text area

13. **Update TransactionRow**
    - Add checkbox column (leftmost)
    - Replace description with merchant
    - Add account column
    - Add actions column (rightmost)
    - Support expanded description row

14. **Update TransactionTable**
    - Integrate useTableSelection
    - Integrate useKeyboardNavigation
    - Pass selection state to rows
    - Handle expanded rows in virtualization

### Phase D: Bulk Operations

15. **Create useBulkEdit hook**
    - File: `src/components/features/transactions/hooks/useBulkEdit.ts`
    - Batch CRDT mutations
    - Progress tracking

16. **Update BulkEditToolbar**
    - Add "Set Description" button
    - Add "Set Amount" button
    - Show progress indicator

### Phase E: Tag Editor Enhancement

17. **Update InlineTagEditor**
    - Always show "Create" button
    - Position at bottom of dropdown

18. **Update TagsCell**
    - Connect to updated InlineTagEditor

### Phase F: E2E Tests

19. **Update transactions.spec.ts**
    - Inline editing tests
    - Checkbox selection tests
    - Bulk edit tests
    - Keyboard navigation tests

---

## Key Patterns

### Always-Editable Cell Pattern

```tsx
// ❌ OLD: Mode switching
function OldCell({ value, isEditing, onEditStart }) {
  if (isEditing) {
    return <input value={value} />;
  }
  return <span onDoubleClick={onEditStart}>{value}</span>;
}

// ✅ NEW: Always editable
function NewCell({ value, onChange }) {
  const [local, setLocal] = useState(value);
  return (
    <input
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => local !== value && onChange(local)}
      className="border-transparent focus:border-primary"
    />
  );
}
```

### Selection with Virtualization

```tsx
// Selection state is tracked by ID, not by rendered rows
const { selectedIds, toggleRow, selectAll } = useTableSelection({
  filteredIds: allFilteredTransactionIds, // Not just visible ones!
});

// Each row checks its own selection status
<TransactionRow
  isSelected={selectedIds.has(transaction.id)}
  onSelectionChange={(checked, shiftKey) => toggleRow(transaction.id, shiftKey)}
/>
```

### Keyboard Navigation

```tsx
// Container handles keyboard events
<div onKeyDown={handleKeyDown}>
  {rows.map(row => (
    <TransactionRow
      focusedColumn={focusedCell?.rowId === row.id ? focusedCell.column : undefined}
    />
  ))}
</div>

// Arrow keys move focus (when not editing)
// Enter starts editing
// Tab moves to next cell and saves
// Escape cancels edit
```

### Bulk CRDT Mutations

```tsx
// All updates in single setState = single CRDT operation
const { setTags } = useBulkEdit({
  selectedIds,
  onUpdate: (updates) => {
    setState((draft) => {
      for (const [id, update] of updates) {
        Object.assign(draft.transactions[id], update);
      }
    });
  },
});
```

---

## Testing Checklist

### Unit Tests
- [ ] `date-format.ts` - locale formatting, edge cases
- [ ] `useTableSelection` - select all, range select, toggle
- [ ] `useKeyboardNavigation` - arrow keys, edit mode transitions
- [ ] `useBulkEdit` - batching, progress tracking

### E2E Tests
- [ ] Single-click edits cell (no double-click)
- [ ] Tab moves to next cell and saves
- [ ] Escape reverts changes
- [ ] Header checkbox selects all filtered
- [ ] Shift+click selects range
- [ ] Bulk edit tags applies to all selected
- [ ] Bulk edit description applies to all selected
- [ ] Arrow keys navigate between cells
- [ ] Description row expands/collapses

---

## Common Gotchas

1. **Virtualization + Selection**: Don't rely on rendered rows for selection count. Always use `filteredIds.length`.

2. **Focus Management**: When expanding description row, don't steal focus. Let user continue with current task.

3. **Temporal API Types**: Import types from polyfill:
   ```typescript
   import { Temporal } from "@js-temporal/polyfill";
   // NOT from @types/temporal-polyfill
   ```

4. **loro-mirror Draft Mutations**: Always mutate the draft, never return new objects:
   ```typescript
   // ✅ Correct
   setState(draft => { draft.transactions[id].merchant = "New"; });
   
   // ❌ Wrong
   setState(state => ({ ...state, transactions: { ... } }));
   ```

5. **Column Order**: Always follow FR-033a:
   `Checkbox → Date → Merchant → Account → Tags → Status → Amount → Balance → Actions`
