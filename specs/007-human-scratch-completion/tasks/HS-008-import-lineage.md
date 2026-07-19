# HS-008 — Import Lineage, Original Amount, and Reversible Deletion

- **Status:** queued
- **Source:** `specs/human-scratch.md:297-300`; exact frozen text is in `SCOPE.json#HS-008`
- **Package:** P14
- **Depends on:** P09 undo grouping

## Frozen requirement

> Save importId on imported transactions. When an amount is edited, retain the original amount and
> show it in a table tooltip. Deleting an import deletes all associated transactions.

## Current evidence to revalidate

- Transaction schema/import creation already includes `importId` in core paths, including duplicate
  representations that require consistency review.
- Imports-page deletion calls a delete-by-import mutation and integration coverage exists.
- `originalAmount` is absent from the transaction schema; an unrelated duplicate badge prop does not
  provide amount-cell provenance.

## Acceptance direction

- Every imported parent/nested transaction retains the correct import ID; manual transactions do not
  acquire one.
- First edit of imported amount stores original minor units exactly once; later edits never
  overwrite it. Currency formatting/rounding follows the original transaction currency.
- A shadcn tooltip communicates the original formatted amount accessibly without appearing for
  unedited/manual rows.
- Delete import atomically removes/soft-deletes every associated representation and prunes only safe
  empty buckets, is one undoable action, persists/syncs and cannot delete another import's rows.

## Implementation and review checkpoints

- Migrate old imported data safely and centralize amount edits/import deletion. Reviewer checks
  duplicate/nested paths, currencies, undo and data preservation.

## Automated tests

- Unit/integration: import lineage, first-edit immutability, multiple currencies, duplicate/nested
  deletion, empty-bucket safety, undo/redo and cross-import isolation.
- E2E: import CSV/OFX, edit amount twice, inspect tooltip after reload, delete import, verify all
  and only linked rows disappear, undo/redo. Repeat no-retry.

## Manual Playwright CLI charter

- Import two files with duplicates and different currencies, edit positive/negative/zero amounts,
  hover/focus tooltip, refresh/duplicate tab, delete one import and undo.
- Verify keyboard access, responsive/dark/reduced-motion UX, offline/reconnect, console/network and
  no raw source leakage. Reject ambiguous destructive feedback or stale rows.

## UX, style, and E2E review

Apply import, money, CRDT, component, sync and E2E rules. Require a meaningful full journey and
precise destructive behavior, not only schema assertions.

## Risks and questions

- Risks: overwriting provenance, currency mismatch, orphan duplicates, overbroad delete, huge undo.
  Return retention/soft-delete ambiguity as a Q proposal using data preservation first.
