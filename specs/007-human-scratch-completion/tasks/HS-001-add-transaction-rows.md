# HS-001 — Normal Empty Add Transaction Rows

- **Status:** queued
- **Source:** `specs/human-scratch.md:151-155`; exact frozen text is in `SCOPE.json#HS-001`
- **Package:** P13
- **Depends on:** P09 undo grouping; P11A–C manual-description alias semantics

## Frozen requirement

> When clicking "Add Transaction" on the Transactions tab, it should just add a new empty row with
> all normal affordances. Empty descriptions are acceptable. It is a normal selectable row without
> tick/cross actions, arrow keys move normally, and multiple empty rows may exist.

## Current evidence to revalidate

- `src/app/(app)/transactions/page.tsx` uses a single `isAddingTransaction` boolean and creates the
  transaction only after a special add-row submit.
- `src/components/features/transactions/TransactionTableToolbar.tsx` disables Add while that boolean
  is true.
- `src/components/features/transactions/AddTransactionRow.tsx` switches between placeholder and a
  special `TransactionRow mode="add"`.
- `src/components/features/transactions/TransactionRow.tsx` maintains add-mode local fields,
  requires a description, and renders plus/confirm/cancel affordances rather than a normal row.

## Acceptance direction

- Each Add click atomically inserts a persisted empty transaction with valid defaults and selects or
  focuses it predictably; rapid repeated clicks create distinct rows.
- The row immediately uses the normal selection, editing, deletion, status, account, date, and
  keyboard-grid affordances. No tick/cross/add-only mode remains.
- Empty manual description is valid; entered manual text follows HS-004 and stores an alias rather
  than imported raw text.
- Rows survive refresh/offline cache and sync/converge across tabs without duplicate IDs or stuck
  UI.
- Undo treats each Add as one user action and redo restores the same logical row.

## Implementation and review checkpoints

- Replace special form state with the narrowest ordinary-row creation path; retain virtual focus and
  scroll stability. Check empty-row sort/date behavior and accessibility names.
- Reviewer inspects P13 BASE..HEAD, confirms no hidden add mode or broad unrelated table rewrite,
  and maps all behavior to meaningful E2E coverage.

## Automated tests

- Unit/integration: default entity validity, empty description, unique IDs, persistence/sync and
  undo.
- E2E journey: click Add repeatedly, assert multiple ordinary rows, edit different fields, select,
  delete, undo/redo, arrow between rows, reload and verify persistence. Repeat with retries
  disabled.

## Manual Playwright CLI charter

- Use a unique headless CLI session, create a vault, add three empty rows quickly, and inspect
  focus, scrolling, layout, and normal row controls with pointer and keyboard only.
- Exercise arrows, Tab/Shift+Tab, Enter/Escape, selection, edit, undo/redo, refresh, duplicate tab,
  narrow viewport, dark mode and reduced motion. Test offline/reconnect where sync is touched.
- Inspect browser console and network before/after refresh; reject jank, surprise focus jumps,
  special confirm/cancel controls, disabled Add, or infinite loading. Close/delete the session.

## UX, style, and E2E review

Apply `.claude` component, CRDT, sync, TypeScript and E2E guidance: semantic controls, visible
focus, tokens/dark/responsive styling, draft mutations, memoized virtual rows, no sleeps, and
behavior-led assertions. The UX must feel immediate and unsurprising.

## Risks and questions

- Risks: empty-row ordering, alias invariant violation, virtual focus churn, rapid-click races, undo
  fragmentation. Return unresolved defaults as Q proposals for root transcription; do not pause or
  invent new design.
