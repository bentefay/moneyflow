# P11B Implementation Evidence — Revision 01

## Immutable dispatch boundary

- Package/scope/revision: `P11B` / `HS-004` interaction checkpoint / `01`.
- Literal BASE and clean pre-implementation HEAD: `959833af4fe01c1e13ab2b4ca6adfe2f76fcfc1f`.
- Sole writable evidence artifact:
  `specs/007-human-scratch-completion/evidence/P11B/implementation-01.md`, created before product or
  test edits and intentionally left uncommitted.
- Initial index and untracked set were empty. Git-visible dirt was exactly root-owned unstaged
  `HANDOFF.md` and `PROGRESS.md`.
- P11A was initially frozen; root later recorded the narrow manual-atomicity refinement documented
  below before either added P11A path was edited. P11C scope, prior artifacts/reviews, global
  ledgers, frozen sources, SCOPE and agent configuration remained immutable.

## Implementation plan

1. Inspect the existing transaction cell, row/table focus protocol, modal and P11A named action
   boundaries before selecting the narrow authorized change set.
2. Implement the always-visible one-click caret and lazy no-default autocomplete state machine with
   explicit closed-grid navigation transitions.
3. Implement seamless exact/new/first/single paths and shared change/remove modal focus, cancel and
   blur-race behavior entirely through named atomic actions.
4. Expose immutable imported provenance only through the accessible repository tooltip while manual
   transactions retain alias-only storage.
5. Add focused component/integration/E2E coverage and complete the automated/manual/boundary
   charter.

## Status

Implementation is complete and ready for independent review. This artifact makes no PASS claim.

## Immutable implementation range

- BASE: `959833af4fe01c1e13ab2b4ca6adfe2f76fcfc1f`.
- HEAD: `e35109dfe7b02bdb4058445f44d03a6dd678457b`.
- Commit: `e35109dfe7b02bdb4058445f44d03a6dd678457b` —
  `feat: complete description alias interactions`.
- The commit contains exactly these 11 paths:
    - `src/app/(app)/transactions/page.tsx`
    - `src/components/features/description-aliases/DescriptionAliasChangeModal.tsx`
    - `src/components/features/description-aliases/descriptionAliasInteraction.ts`
    - `src/components/features/transactions/TransactionRow.tsx`
    - `src/components/features/transactions/TransactionTable.tsx`
    - `src/components/features/transactions/cells/InlineEditableDescriptionAlias.tsx`
    - `src/lib/crdt/context.tsx`
    - `src/lib/crdt/description-aliases.ts`
    - `tests/e2e/description-aliases.spec.ts`
    - `tests/integration/description-alias-actions.test.ts`
    - `tests/unit/components/description-alias-interactions.test.tsx`
- Commit summary: 11 files changed, 1,243 insertions, 301 deletions; the planner and focused
  component test are new files.
- Immediately after commit the index was empty. Git-visible dirt was only root-owned unstaged
  `HANDOFF.md`/`PROGRESS.md` plus this untracked evidence directory.

## Implemented interaction state machine

### Cell and autocomplete

- The description is always a native text input, so one pointer click places the caret at the actual
  click position. Focus does not switch the cell into a second edit mode.
- Focus alone mounts no autocomplete. A user text edit lazily mounts one portal listbox only when
  aliases match the typed substring.
- Initial option state is deliberately null: every option has `aria-selected=false`. Arrow Down
  starts at the first option, Arrow Up starts at the last, subsequent arrows wrap, and Enter accepts
  only an explicitly active option.
- Escape closes an open listbox without committing. Once closed, Arrow Up/Down bubbles to the
  transaction-grid navigation. Closed focus without an edit also leaves grid arrows untouched.
- Enter, blur and pointer selection share a submission guard. Option pointer-down prevents the
  intermediate blur, so pointer selection cannot issue a second commit.
- The input retains native textbox semantics plus `aria-autocomplete`, `aria-haspopup`, expanded,
  controls and active-descendant state. Visible focus styling remains present.

### Commit planner

`planDescriptionAliasCommit` normalizes once and emits one explicit intent:

| Current state                               | Submitted value         | Intent/action     |
| ------------------------------------------- | ----------------------- | ----------------- |
| No alias                                    | blank                   | no write          |
| No alias                                    | normalized exact match  | assign existing   |
| No alias                                    | novel nonblank          | create and assign |
| One complete real-alias reference           | same normalized name    | no write          |
| One complete real-alias reference           | novel nonblank          | rename one        |
| One complete real-alias reference           | exact other alias       | change one        |
| One complete real-alias reference           | blank                   | remove one        |
| More than one complete real-alias reference | nonblank exact or novel | confirm change    |
| More than one complete real-alias reference | blank                   | confirm remove    |

- Symlink inputs resolve to their final active real alias before counting the complete reference
  group; the planner therefore cannot accidentally treat one symlink reference as a single-use
  alias.
- Page handlers route every intent through the named P11A actions. There is no direct component
  mutation, silent whole-group rename, or remove-by-empty fallback.

### Shared modal and focus lifecycle

- Change choices are exactly `Change just this one`, `Change all`, `Cancel`; remove choices are
  exactly `Remove from just this one`, `Remove from all`, `Cancel`.
- Radix traps focus and the first destructive-scope choice receives explicit initial focus. Escape,
  outside dismissal and Cancel perform no write.
- A run-once guard prevents repeated button/keyboard activation. The originating input and exact
  selection range are captured before the modal opens and restored after every exit transition.
- Restoration follows the replacement input inside the stable cell container if a successful action
  changes whether provenance wraps the input, covering the disconnected-origin counterfactual.

### Provenance and atomic manual creation

- Imported raw text appears only in the repository tooltip and only when a transaction has an alias,
  the imported raw value is nonblank, and it differs from the displayed alias. The controlled
  tooltip closes on blur/pointer-leave and remains keyboard/hover accessible.
- Manual transactions use alias-only display/storage and do not create a raw-provenance tooltip.
- A preliminary full-suite run demonstrated that the old page-level manual flow produced two Mirror
  commits (insert, then assign) and therefore two undo/server operations. Root recorded the narrow
  authority refinement in `HANDOFF.md` at `2026-07-20T21:20:37+10` before the refinement edit.
- The new named internal `insertManualDescriptionAliasedTransaction` action validates normalized
  nonblank name, target/new-alias identity and transaction location before any write, then inserts
  the transaction with raw `description: ""`, no `importId`, and attaches an exact existing or new
  alias in the same Mirror state change. Failure is typed and write-free. Success is one local CRDT
  update, one encrypted server operation, and one complete undo/redo unit.
- Only `src/lib/crdt/description-aliases.ts` and `src/lib/crdt/context.tsx` were added to the frozen
  P11A surface under that recorded refinement. The public `ApplicationVaultState` raw boundary,
  schema, migration and sync protocol were unchanged.

## Automated evidence

| Command/check                                                                                                          | Result                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`                                                                                                            | PASS: 56 files, 1,226 tests                                                                                                                                                                                                              |
| `pnpm lint`                                                                                                            | PASS: 0 errors; 10 inherited warnings (TanStack compiler warning plus existing unused types/imports)                                                                                                                                     |
| `pnpm typecheck`                                                                                                       | PASS                                                                                                                                                                                                                                     |
| `pnpm build`                                                                                                           | PASS: production build and 17 routes                                                                                                                                                                                                     |
| `CI=1 pnpm exec playwright test tests/e2e/description-aliases.spec.ts --workers=1 --retries=0 --repeat-each=3`         | PASS: 12/12 in 1.0m                                                                                                                                                                                                                      |
| `CI=1 pnpm exec playwright test tests/e2e/transactions.spec.ts --grep 'T021c' --workers=1 --retries=0 --repeat-each=3` | PASS: isolated pre-existing shift-click test 3/3                                                                                                                                                                                         |
| `git diff --check` and staged `git diff --cached --check`                                                              | PASS                                                                                                                                                                                                                                     |
| `pnpm format:check`                                                                                                    | Expected repository failure only on 7 inherited/root-owned paths: `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, `specs/human-scratch.md`; all package paths and this evidence format clean |

Focused tests cover planner exact/new/single/shared/remove/symlink branches; native caret and lazy
listbox semantics; no default option; autocomplete/grid arrows and Escape; pointer/keyboard/blur
single submission; tooltip conditions; exact modal copy, initial focus, trap, double-activation
guard, cancel and restoration; actual Mirror/hook atomic insert, update count, backlinks, raw
absence, typed write-free failure, exact reuse, and one-step undo/redo.

Two final full Playwright runs, both with retries disabled, completed 85/86:

- four workers: 85 passed in 1.6m;
- one worker: 85 passed in 5.0m.

Every P11B journey passed in both. The sole failure in each was the unchanged, out-of-scope
`transactions.spec.ts` T021c shift-click range-selection assertion waiting for `3 selected`. Its
exact test then passed 3/3 isolated with one worker and no retries. This is recorded as a
pre-existing suite-order/global-state dependency, not hidden or treated as a P11B PASS. Earlier
implementation iterations also exposed and corrected three causal P11B issues: the two-operation
manual insert, explicit combobox semantics conflicting with the native-textbox contract, and
focus-only autocomplete intercepting grid arrows.

## Sanitized manual browser evidence

Used only the repository-installed `pnpm browser` CLI with disposable session `p11b-r01` and real UI
flows. The generated recovery phrase remained concealed and was never revealed, copied, extracted or
printed.

- Created two aliases through Tx Descriptions and imported five in-memory CSV rows through the real
  import wizard: partial raw text, exact raw text, a one-use novel value, and two identical shared
  raw values. Later manual rows and a `Change all` merge supplied manual and real symlink states.
- Pointer click at the first input pixel focused in one click with `selectionStart=0`.
- Typing `C` produced two options with selections `[false,false]`; Arrow Down selected the first,
  Escape unmounted the listbox, and closed Arrow Down moved focus to the next grid row.
- Keyboard selection produced `Coffee Shop`; a trailing-space exact submission normalized to the
  same alias; novel blur produced `Fresh novel`; a subsequent single-use Enter renamed it to
  `Fresh renamed`; none opened a modal.
- Hover/focus provenance showed imported `Cafe partial` after its alias changed, showed no tooltip
  for the matching `Coffee Shop` row, and showed no tooltip for either manual alias.
- Two shared rows produced exactly one dialog. Change buttons were exact and the first was focused;
  Shift+Tab moved to Cancel and Tab returned to the first choice. Change-one changed only the
  origin; one Undo restored both. Change-all changed both; one Undo restored both.
- Remove Cancel eventually restored the exact input/caret after the exit transition and wrote
  nothing. Remove-one restored only the original raw value for the origin; Remove-all restored both
  original raw values; one Undo completely reversed each operation.
- Changing the shared group to an existing alias created the intended symlink. A subsequent edit
  still recognized the complete final-real group, opened one shared modal, and changed only one when
  instructed; one Undo restored both displayed final-real values.
- Manual add, Undo and Redo behaved as one visible step. A separately observed manual add emitted
  one `sync.pushOps` request with a 1,077-byte body; both the alias plaintext and raw manual
  description were absent from that body.
- At 390x844, main content, grid and Add Transaction remained available. Reduced-motion media was
  active. At simulated 200% zoom, the modal stayed within a 1280x900 viewport and retained default
  focus. Forced repository dark class produced a dark dialog surface with light text. The final CLI
  console query reported zero errors.
- The first disposable onboarding attempt reached a harness-only
  `Realtime authorization is unavailable` error because the dev process lacked
  `SUPABASE_JWT_SECRET`. The server was stopped and restarted with the already-running local
  Supabase realtime container's secret without printing it; authorization then returned 200 and all
  observations above used that corrected harness.

## Counterfactuals and deferrals

- Without `hasEdited`, focusing an exact current alias mounts autocomplete and steals grid arrows;
  covered by the closed-arrow checks.
- Without pointer-down blur prevention plus the shared submission guard, option click can commit
  both selection and stale typed text; covered by component single-call tests and the pointer modal
  journey.
- Counting only a transaction's direct alias ID misclassifies symlink-backed groups; covered in pure
  planner tests and the manual symlink group.
- Renaming the source for novel `Change all` would not preserve the requested target semantics;
  routing through the P11A change-all action creates/merges the target and preserves symlink
  history.
- The P11C virtualized-scale/import-refresh/duplicate-tab/concurrent-performance charter is
  explicitly deferred. No P11C claim is made from the small P11B journey or from unrelated existing
  large-list tests.

## Cleanup and frozen boundaries

- Deleted all seven disposable manual/imported transactions through their visible two-click delete
  controls. No active aliases remained in Tx Descriptions.
- Closed the CLI browser, ran its data cleanup, and verified `pnpm browser list` reported no
  browsers.
- Trashed task-created `.playwright-cli`, `test-results` and `playwright-report` directories.
  Stopped the task-owned dev server. No task-owned dev/Playwright test process remained; the
  unrelated pre-existing `playwright-mcp` process was preserved.
- Restored generated `next-env.d.ts` with `apply_patch` after both manual and automated dev servers.
- Frozen boundary checks after all execution:
    - `specs/human-scratch.md` SHA-256
      `c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`, 350 lines / 24,245 bytes;
      authorized checked set remains HS-002/HS-006/HS-010/HS-014/HS-017/HS-018 and all 21 normalized
      blocks remain in scope.
    - immutable FS-001 source SHA-256
      `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
    - `SCOPE.json` SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450
      lines / 27,382 bytes.
- No requirement source, SCOPE entry, root ledger, prior artifact/review, marker or agent
  configuration was staged or committed by this worker.

## Questions and risks

- No `Q-*` proposal was required. The only authority question was resolved prospectively by root's
  recorded narrow P11A refinement before either authorized model/context file was edited.
- Review should preserve the honest full-suite note: P11B-specific coverage is repeat-green, while
  the unchanged T021c suite-order dependency prevents a clean 86/86 aggregate claim.
