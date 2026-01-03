# Component Contracts: Transaction Table UX

**Date**: 2025-12-31  
**Feature**: 004-transaction-table-ux

This file defines TypeScript interfaces for new and modified components.

## New Components

### EditableCell

Base component providing always-editable appearance for all cell types.

```typescript
interface EditableCellProps {
  /** Current value */
  value: string;
  /** Callback when value changes (on blur/enter) */
  onChange: (value: string) => void;
  /** Callback when cell receives focus */
  onFocus?: () => void;
  /** Callback when cell loses focus */
  onBlur?: () => void;
  /** Callback for keyboard events (for navigation) */
  onKeyDown?: (event: React.KeyboardEvent) => void;
  /** Input type */
  type?: "text" | "number" | "date";
  /** Placeholder text */
  placeholder?: string;
  /** Text alignment */
  align?: "left" | "center" | "right";
  /** Whether input is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}
```

### CheckboxCell

Selection checkbox for individual rows.

```typescript
interface CheckboxCellProps {
  /** Whether the checkbox is checked */
  checked: boolean;
  /** Whether the checkbox is in indeterminate state (for header) */
  indeterminate?: boolean;
  /** Callback when checkbox is toggled */
  onChange: (checked: boolean) => void;
  /** Callback with event for shift-click detection */
  onChangeWithEvent?: (checked: boolean, event: React.MouseEvent) => void;
  /** Accessible label */
  ariaLabel?: string;
  /** Additional CSS classes */
  className?: string;
}
```

### TransactionTableHeader

Extracted header component with select-all checkbox.

```typescript
interface TransactionTableHeaderProps {
  /** Column configuration */
  columns: ColumnDef[];
  /** Whether all filtered transactions are selected */
  isAllSelected: boolean;
  /** Whether some (but not all) are selected */
  isSomeSelected: boolean;
  /** Callback when select-all checkbox is clicked */
  onSelectAll: () => void;
  /** Current sort column */
  sortColumn?: ColumnId;
  /** Current sort direction */
  sortDirection?: "asc" | "desc";
  /** Callback when column header is clicked for sorting */
  onSort?: (column: ColumnId) => void;
  /** Additional CSS classes */
  className?: string;
}
```

### TransactionDescriptionRow

Expandable row showing transaction description/memo.

```typescript
interface TransactionDescriptionRowProps {
  /** Transaction ID */
  transactionId: string;
  /** Current description value */
  description: string;
  /** Callback when description changes */
  onChange: (description: string) => void;
  /** Callback to collapse the row */
  onCollapse: () => void;
  /** Whether the row is currently visible */
  isExpanded: boolean;
  /** Additional CSS classes */
  className?: string;
}
```

### ActionsCell

Action buttons column for row operations.

```typescript
interface ActionsCellProps {
  /** Transaction ID */
  transactionId: string;
  /** Whether transaction has a description */
  hasDescription: boolean;
  /** Whether description row is expanded */
  isDescriptionExpanded: boolean;
  /** Callback to toggle description row */
  onToggleDescription: () => void;
  /** Callback to delete transaction */
  onDelete: () => void;
  /** Whether delete confirmation is shown */
  showDeleteConfirm?: boolean;
  /** Additional actions (for extensibility) */
  additionalActions?: Array<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
  }>;
  /** Additional CSS classes */
  className?: string;
}
```

### MerchantCell

Cell for displaying/editing merchant name.

```typescript
interface MerchantCellProps extends Omit<EditableCellProps, "type" | "align"> {
  /** Transaction ID for presence tracking */
  transactionId?: string;
}
```

## New Hooks

### useTableSelection

Manages selection state across virtualized rows.

```typescript
interface UseTableSelectionOptions {
  /** All transaction IDs matching current filter */
  filteredIds: string[];
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: Set<string>) => void;
  /** Initial selected IDs */
  initialSelectedIds?: Set<string>;
}

interface UseTableSelectionReturn {
  /** Currently selected transaction IDs */
  selectedIds: Set<string>;
  /** Last selected ID (for range selection) */
  lastSelectedId: string | null;
  /** Whether all filtered transactions are selected */
  isAllSelected: boolean;
  /** Whether some (but not all) are selected */
  isSomeSelected: boolean;
  /** Number of selected transactions */
  selectedCount: number;
  /** Toggle select-all */
  selectAll: () => void;
  /** Toggle single row (with optional shift for range) */
  toggleRow: (id: string, shiftKey?: boolean) => void;
  /** Clear all selection */
  clearSelection: () => void;
  /** Check if a specific row is selected */
  isSelected: (id: string) => boolean;
}

function useTableSelection(options: UseTableSelectionOptions): UseTableSelectionReturn;
```

### useKeyboardNavigation

Arrow key navigation between cells.

```typescript
interface UseKeyboardNavigationOptions {
  /** Row IDs in display order */
  rowIds: string[];
  /** Column IDs in display order */
  columnIds: ColumnId[];
  /** Columns that can receive focus */
  focusableColumns: ColumnId[];
  /** Callback when focus changes */
  onFocusChange?: (cell: { rowId: string; column: ColumnId } | null) => void;
  /** Callback when Enter is pressed on a cell */
  onActivate?: (cell: { rowId: string; column: ColumnId }) => void;
}

interface UseKeyboardNavigationReturn {
  /** Currently focused cell */
  focusedCell: { rowId: string; column: ColumnId } | null;
  /** Whether focused cell is in edit mode */
  isEditing: boolean;
  /** Set focus to a specific cell */
  setFocus: (rowId: string, column: ColumnId) => void;
  /** Clear focus */
  clearFocus: () => void;
  /** Enter edit mode for focused cell */
  startEditing: () => void;
  /** Exit edit mode */
  stopEditing: () => void;
  /** Keyboard event handler (attach to container) */
  handleKeyDown: (event: React.KeyboardEvent) => void;
}

function useKeyboardNavigation(options: UseKeyboardNavigationOptions): UseKeyboardNavigationReturn;
```

### useBulkEdit

Bulk operation logic for selected transactions.

```typescript
interface UseBulkEditOptions {
  /** Currently selected transaction IDs */
  selectedIds: Set<string>;
  /** Callback to update transactions in CRDT */
  onUpdate: (updates: Map<string, Partial<TransactionInput>>) => void;
  /** Callback when bulk edit completes */
  onComplete?: () => void;
}

interface UseBulkEditReturn {
  /** Whether a bulk edit is in progress */
  isProcessing: boolean;
  /** Progress (0-100) for large operations */
  progress: number;
  /** Set tags on all selected transactions */
  setTags: (tagIds: string[]) => Promise<void>;
  /** Set description on all selected transactions */
  setDescription: (description: string) => Promise<void>;
  /** Set amount on all selected transactions */
  setAmount: (amount: number) => Promise<void>;
  /** Set status on all selected transactions */
  setStatus: (statusId: string) => Promise<void>;
  /** Delete all selected transactions */
  deleteSelected: () => Promise<void>;
}

function useBulkEdit(options: UseBulkEditOptions): UseBulkEditReturn;
```

## Modified Components

### TransactionTable

```typescript
// Add to existing props
interface TransactionTableProps {
  // ... existing props ...
  
  /** Callback when transactions are updated (for bulk edit) */
  onTransactionsUpdate?: (updates: Map<string, Partial<TransactionInput>>) => void;
  
  /** All filtered transaction IDs (for select-all) */
  filteredTransactionIds?: string[];
}
```

### TransactionRow

```typescript
// Add to existing props
interface TransactionRowProps {
  // ... existing props ...
  
  /** Whether the row's checkbox is selected */
  isSelected: boolean;
  
  /** Callback when checkbox is toggled */
  onSelectionChange: (selected: boolean, shiftKey?: boolean) => void;
  
  /** Currently focused column in this row */
  focusedColumn?: ColumnId;
  
  /** Whether the focused column is in edit mode */
  isFocusedEditing?: boolean;
  
  /** Whether description row is expanded */
  isDescriptionExpanded?: boolean;
  
  /** Callback to toggle description row */
  onToggleDescription?: () => void;
}
```

### BulkEditToolbar

```typescript
// Add to existing props
interface BulkEditToolbarProps {
  // ... existing props ...
  
  /** Callback to set description on selected transactions */
  onSetDescription?: (description: string) => void;
  
  /** Callback to set amount on selected transactions */
  onSetAmount?: (amount: number) => void;
  
  /** Progress indicator (0-100) for large operations */
  progress?: number;
  
  /** Whether a bulk operation is in progress */
  isProcessing?: boolean;
}
```

### InlineTagEditor

```typescript
// Add to existing props
interface InlineTagEditorProps {
  // ... existing props ...
  
  /** Always show create button, even when matches exist */
  alwaysShowCreate?: boolean;  // Default: true (changed from false)
}
```
