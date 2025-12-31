# Research: Optional Account Currency & Accounts Page Improvements

**Feature**: 003-account-currency-styling  
**Date**: 2024-12-31

## Research Questions

### 1. loro-mirror Optional Fields

**Question**: How to make a schema field optional that previously had a default value?

**Finding**: In loro-mirror, `schema.String()` without `{ required: true }` or `{ defaultValue: "..." }` allows `undefined` values. The current `currency: schema.String({ defaultValue: "USD" })` makes the field always have a value.

**Decision**: Change to `currency: schema.String()` (no options) to allow undefined. The resolution logic handles fallback at display time.

**Code Reference**:
```typescript
// Current (always has value)
currency: schema.String({ defaultValue: "USD" }),

// New (allows undefined)
currency: schema.String(),
```

### 2. Inline Editing Patterns with shadcn/ui

**Question**: Best practices for table inline editing with shadcn/ui?

**Finding**: The existing `AccountRow.tsx` already implements inline editing for name, account number, and type fields:
- Uses `useState` for `isEditing` mode
- Input/Select components replace display text when editing
- Save on button click, cancel on Cancel button or Escape
- `onClick={(e) => e.stopPropagation()}` prevents row expansion during edits

**Decision**: Extend existing pattern to currency field. Add per-field click-to-edit instead of single "edit mode" for better UX.

**Pattern**:
```tsx
// Per-field editing state
const [editingField, setEditingField] = useState<'name' | 'type' | 'currency' | null>(null);

// Click handler on display value
<div onClick={() => setEditingField('currency')}>
  {editingField === 'currency' ? <CurrencySelect ... /> : <span>USD</span>}
</div>
```

### 3. Currency Selector UX

**Question**: How to show "Use vault default" as first option?

**Finding**: The shadcn/ui `Select` component supports custom option rendering. The first option should be semantically distinct (null/undefined value) with dynamic label showing current vault default.

**Decision**: Create `CurrencySelect` component that:
1. Accepts `value: string | undefined` (undefined = use vault default)
2. Accepts `vaultDefaultCurrency: string` for display
3. First option: `undefined` → "Use vault default (USD)"
4. Remaining options: Explicit currency codes from `Currencies` constant

**Component API**:
```tsx
interface CurrencySelectProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  vaultDefaultCurrency: string;
}
```

### 4. Backward Compatibility

**Question**: How do existing accounts with explicit currency behave after schema change?

**Finding**: Existing accounts already have `currency` set (e.g., "USD"). Removing the `defaultValue` from schema doesn't affect existing data—it only affects new accounts created without explicitly setting currency.

**Decision**: No migration needed. Existing accounts continue to work. New accounts can omit currency to inherit from vault.

## Key Decisions Summary

| # | Decision | Chosen Approach | Rationale |
|---|----------|-----------------|-----------|
| 1 | Schema field | `schema.String()` (no options) | Allows explicit undefined for inheritance |
| 2 | Inline editing | Per-field click-to-edit | Better UX than global edit mode |
| 3 | Currency selector | Custom component with vault default option | Clear UX for inheritance behavior |
| 4 | Migration | None required | Existing data unaffected |

## Dependencies

No new npm dependencies required. Uses existing:
- `loro-mirror` for schema
- `shadcn/ui` Select component
- Existing `Currencies` constant from `@/lib/domain/currencies`

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Existing tests assume currency is always defined | Medium | Low | Update tests to handle undefined; add new tests for resolution |
| TypeScript type changes break existing code | Medium | Medium | Use `account.currency ?? resolvedCurrency` pattern |
| User confusion about "(default)" meaning | Low | Low | Tooltip or help text explaining vault inheritance |
