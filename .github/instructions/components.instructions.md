---
applyTo: "src/components/**"
---

# Components Guidelines

UI components for MoneyFlow using React 19, shadcn/ui, and Tailwind CSS.

## Architecture Overview

```
src/components/
├── ui/           # shadcn/ui primitives (button, input, etc.)
├── features/     # Feature-specific components
│   ├── identity/ # Seed phrase, unlock flow
│   ├── landing/  # Marketing page components
│   ├── presence/ # Collaborative presence indicators
│   ├── transactions/ # Transaction table, filters, cells
│   ├── import/   # Import wizard steps
│   └── vault/    # Vault selector, settings
└── providers/    # React context providers
```

## Component Patterns

### File Structure

```typescript
"use client"; // Only if using hooks/interactivity

/**
 * ComponentName
 *
 * Brief description of what this component does.
 */

import { ... } from "react";
import { cn } from "@/lib/utils";

export interface ComponentNameProps {
  /** Description of prop */
  propName: PropType;
  /** Additional CSS classes */
  className?: string;
}

export function ComponentName({ propName, className }: ComponentNameProps) {
  return (
    <div className={cn("base-classes", className)}>
      {/* content */}
    </div>
  );
}
```

### Naming Conventions

- PascalCase for component files: `TransactionRow.tsx`
- camelCase for utility files: `useTransactionSelection.ts`
- index.ts for barrel exports from feature folders

### Props Interface

- Export interface with `Props` suffix: `TransactionRowProps`
- Document all props with JSDoc comments
- Always include optional `className` for styling flexibility

## Styling Rules

1. **Use Tailwind CSS** - No CSS modules or styled-components
2. **Use cn() utility** - For conditional class merging
3. **shadcn/ui tokens** - Use CSS variables like `text-muted-foreground`, `bg-background`
4. **Dark mode** - All components must support dark mode via Tailwind's `dark:` prefix
5. **Responsive** - Use Tailwind breakpoints (sm, md, lg) for responsive layouts

## State Management

- **Local state**: useState for UI-only state (dropdowns, modals)
- **CRDT state**: useVaultAction/useActiveTransactions for data mutations
- **URL state**: useSearchParams for filters that should persist in URL
- **Selection state**: Custom hooks like useTransactionSelection

## Performance

- Use `useMemo` for expensive computations
- Use `useCallback` for callbacks passed to memoized children
- Virtualize long lists (TransactionTable handles this)
- Avoid inline object/array literals in JSX props

## Accessibility

- Use semantic HTML elements
- Include aria-labels on icon-only buttons
- Ensure keyboard navigation works
- Maintain focus management in modals/dialogs

## Testing

**Write tests for components with logic.** Use @testing-library/react, assert behaviour and roles:

```typescript
import { render, screen } from "@testing-library/react";

it("renders transaction row with amount cell", () => {
  render(<TransactionRow transaction={mockTransaction} />);
  expect(screen.getByRole("cell", { name: /amount/i })).toBeInTheDocument();
});
```

For user flows (identity, import wizard), add E2E tests in `tests/e2e/`.
