---
name: components
description:
    UI component patterns for React 19, shadcn/ui, and Tailwind. Use when working on files in
    src/components/.
---

# Components Guidelines

## Patterns

- `"use client"` only if using hooks/interactivity
- Export interface with `Props` suffix, document props with JSDoc
- Always include optional `className` prop, use `cn()` for merging

## Styling

- Tailwind only - no CSS modules or styled-components
- Use shadcn/ui tokens: `text-muted-foreground`, `bg-background`, etc.
- All components must support dark mode via `dark:` prefix

## State

- **Local**: `useState` for UI-only state (dropdowns, modals)
- **CRDT**: `useVaultAction`/`useActiveTransactions` for data mutations
- **URL**: `useSearchParams` for filters that should persist

## Performance

- `useMemo`/`useCallback` for expensive computations and callbacks to memoized children
- Virtualize long lists (TransactionTable already does this)
- Avoid inline object/array literals in JSX props

## Accessibility

- Semantic HTML, aria-labels on icon-only buttons
- Keyboard navigation, focus management in modals

## Keyboard shortcuts and commands

- Every shortcut is a command in the registry (`src/lib/commands`). The palette (Cmd/Ctrl+K), the
  keyboard bindings and the `?` cheat sheet all read it, so never add a bare `keydown` listener for
  a page shortcut. Component-local keys (Escape in a popup, the grid's own cell keys) stay local.
- Define a command's id, title, keywords and shortcut in `src/lib/commands/catalog.ts`; register its
  behaviour while mounted with `useCommands` from `@/components/features/commands`, passing a
  memoised array. Use `when` for availability ("a row is selected") rather than registering
  conditionally.
- Bindings use tinykeys syntax (`$mod+KeyK`, `Alt+KeyN`, `[Shift]+?`, `g t`). A binding without
  Cmd/Ctrl/Alt never fires in a text field or the grid; a modified one fires in a text field only
  with `inTextEntry: true`. Do not take Cmd+N/T/W or plain Cmd+F.
- Keys the grid handles itself are listed as `GRID_REFERENCE_COMMANDS` so the cheat sheet stays
  complete; update them alongside `table-model/grid-key-intent.ts`.
