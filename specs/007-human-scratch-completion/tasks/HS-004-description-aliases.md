# HS-004 — Description Aliases

- **Status:** queued
- **Source:** `specs/human-scratch.md:165-236`; the complete exact 72-line frozen text is in
  `SCOPE.json#HS-004`
- **Packages:** P11A schema/invariants; P11B cell/management UX; P11C integrated flows/performance
- **Depends on:** P09 UndoManager; later P12/P13/P17 depend on this epic

## Frozen requirement

The source defines a curated Tx Descriptions page; immutable raw imported descriptions; a one-click
editable autocomplete cell; seamless exact-match/create-on-blur behavior; special manual-transaction
storage; shared-alias change/remove modal; original-description tooltip; and an O(1), one-hop alias
symlink model with `transactionIds`/`symlinkIds` bookkeeping and no chains. Read the full frozen
text in SCOPE before implementation or review; summaries are not substitutes.

## Current evidence to revalidate

- `src/lib/crdt/schema.ts` already includes description alias entities, transaction alias IDs and a
  root alias collection.
- `src/lib/domain/description-aliases.ts` resolves/counts aliases and builds symlink plans.
- `src/app/(app)/tx-descriptions/page.tsx`, `DescriptionAliasesTable.tsx`,
  `InlineEditableDescriptionAlias.tsx` and `DescriptionAliasChangeModal.tsx` form a partial UI.
- Current transaction handlers appear non-atomic across several vault actions. Exact typed matches,
  blank removal, new-target change-all semantics, manual storage, deletion bookkeeping, arrow
  navigation and first-item selection need direct revalidation.
- Existing E2E coverage focuses on management CRUD rather than the transaction-cell/shared flows.

## Acceptance direction

### P11A — Model and invariant checkpoint

- Represent real versus symlink aliases as legal typed states; resolve one hop in O(1), never create
  a chain, always link new transactions to a final real alias, and maintain exact forward/back
  links.
- Make assign/create/rename/change-one/change-all/remove-one/remove-all/delete-transaction atomic,
  one-step undoable mutations with concurrency/property tests and a safe migration for partial data.

### P11B — Interaction checkpoint

- Cell always displays alias or immutable imported raw text. One click positions the caret.
- Lazily mount autocomplete only for interactive cells; no initial option selection. Down/Up enters
  and moves selection, Enter accepts, Escape closes, and closed arrows return to grid navigation.
- Exact typed match attaches existing alias; novel text creates on Enter/blur. First assignment and
  single-use rename are seamless. Shared edits/removals show the exact keyboard-accessible choices,
  default first option, focus trap/restoration and cancellation semantics.
- Imported originals appear in a tooltip only when alias and raw description differ; manual
  transactions store no raw text.

### P11C — Integrated behavior checkpoint

- Management create/rename/delete and every import/manual/single/shared/remove/change-all path stay
  consistent after refresh, undo/redo, duplicate tabs and concurrent edits.
- Virtualized rendering reuses lookup structures and does not mount a combobox for every row.
- The whole epic is not complete until P11A–C independently pass; only then may HS-004 be checked.

## Automated tests

- Unit/property: legal states, exact normalization/matching, backlink/reference conservation,
  no-chain transformations, deleted/missing resolution, concurrent plans and one-hop lookup.
- Integration: atomic mutation/undo grouping, transaction deletion, import/manual provenance,
  migration/convergence and large alias maps.
- E2E: management CRUD and all pointer/keyboard cell cases, exact/new alias, single/shared modal,
  change/remove one/all, tooltip, manual raw-data absence, refresh/undo/concurrent tab. Repeat
  without retries and avoid arbitrary waits.

## Exhaustive manual Playwright CLI charter

- Seed imported descriptions with exact, partial and duplicate cases plus manual transactions and
  aliases referenced by one/many transactions and symlinks.
- With pointer and keyboard only, test caret placement, no-default selection, arrows/Enter/Escape,
  click options, blur creation, exact attachment, every modal choice/cancel/focus path, tooltip and
  management CRUD. Verify grid arrows resume after dropdown close.
- Test desktop/mobile, dark/reduced motion, virtual scrolling/large data, refresh, duplicate tabs,
  offline/reconnect and undo/redo. Inspect console and network after each destructive/shared action;
  confirm no raw manual description is persisted or transmitted. Clean the session.

## UX, style, and E2E review

Audit `.claude` component, CRDT, sync, TypeScript and E2E rules. Reviewer must reject a two-click
editor, default-selected suggestion, focus loss, ambiguous shared-change copy, modal keyboard trap,
row jank, non-atomic undo or missing E2E journeys even when CRUD tests pass.

## Risks and questions

- Risks: reference loss, chain creation, concurrent change-all conflicts, accidental imported-text
  mutation, undo fragmentation, virtual-row focus/portal bugs. Return normalization/case and
  destructive-concurrency Q proposals for root; choose only a reversible evidence-backed default.
