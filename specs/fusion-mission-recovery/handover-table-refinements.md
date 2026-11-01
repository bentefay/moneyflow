# Handover: transaction table interaction refinements

For an agent working on a separate branch from `main`. This document lives on the branch
`feat/transaction-editing-and-automation-rules`; read any file it cites with
`git show feat/transaction-editing-and-automation-rules:<path>` or by checking that branch out
read-only. Do not branch from it; it carries unfinished automation work.

## What you are building

The third milestone of the recovered Fusion mission "Refine transaction editing and simplify
automation rules". The automation half (grouped rules, shared editor, inspector integration) is
being implemented on the branch above and is not your concern. Your scope is the table itself:

1. **Preserve blank and explicit zero.** Allocation and amount values may be blank. Clearing either
   persists as blank and survives reload. Blank allocation renders as a dash and contributes 0% to
   calculations; an explicit 0 renders as 0%. Downstream amount handling must be audited for null
   safety.
2. **Normalise numeric text on blur.** Free typing in numeric cells; deterministic, tested parsing
   on leaving the input. "a.1" becomes 0.1; wholly non-numeric text becomes blank; negative and
   above-100 allocations stay valid; amounts keep valid negatives, use currency precision and store
   integer minor units via `toMinorUnitsForCurrency()`. Malformed signs and decimal separators need
   documented test cases.
3. **Match description-cell navigation for numeric cells.** Reuse the description cell's three-mode
   interaction contract (navigating, quick edit, full edit). Arrow and Alt+Arrow behaviour match the
   reference cell. Invalid or incomplete text never blocks movement; normalisation happens on exit.
4. **Action-cell focus navigation.** Entering edit on the actions cell focuses the first button.
   Left/Right move between buttons without wrapping; Enter/Space activate once; Escape returns to
   cell navigation; Alt+Arrow moves through the grid. Focus is always visibly identifiable.
5. **Prevent native text selection outside editing.** Click then Shift-click selects a cell range
   with no browser text highlighting. Inside an editor, cursor placement, text dragging and copying
   still work.
6. **Rectangular drag selection.** Dragging across non-edit cells selects a rectangle; Shift-click
   extends from the anchor. Selection stays correct across virtualised rows and when dragging to the
   edge scrolls the table. Input editing and action-button clicks remain usable. Use the existing
   table-selection architecture; do not assume TanStack provides the interaction.
7. **Keyboard control of the date input.** Requested by the user on 2026-10-13 and absent from the
   Fusion spec. There is no written requirement yet: write one into the behaviour spec (section 7)
   before implementing, covering at least typing a date, arrow adjustment, opening and closing the
   calendar from the keyboard, and Escape ordering with the grid's own Escape.

Deliberately **not** yours: "Contain inspector scrolling within the viewer". The inspector layout is
being rewritten on the automation branch; that item is done there after the merge.

## What to read first, in order

| File on the automation branch                                              | Why                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `specs/fusion-mission-recovery/specification.md` lines 214–330             | The saved milestone 3 feature descriptions and acceptance criteria. Agent-paraphrased from the interview; the acceptance criteria are the contract.                                                                     |
| `specs/fusion-mission-recovery/behaviour.md` section 7                     | The same requirements in product terms, with provenance marks.                                                                                                                                                          |
| `specs/fusion-mission-recovery/README.md`                                  | How the recovery relates to PR #63's grid, and the E2E port convention.                                                                                                                                                 |
| `specs/016-transaction-grid-interaction-inspector/interaction-contract.md` | **The authoritative grid contract from PR #63**: the three interaction modes, the command table (TGI-CMD-*), action cells, Escape ordering, calendar handling. Your changes must stay inside it or amend it explicitly. |
| `specs/012-transaction-selection/spec.md`                                  | The existing selection model that drag and Shift-click must extend.                                                                                                                                                     |
| `specs/human-scratch.md`                                                   | The user's own earlier requirements. Lines 247–295 are automation; search it for selection and allocation wording before writing new copy.                                                                              |

Code to study on `main` (it is identical on the automation branch for these files at the time of
writing):

- `src/components/features/transactions/hooks/useTransactionGridController.ts` — the controller that
  owns modes, selection, focus and inspector registration. Large; read the command handling and
  selection sections, not all of it.
- `src/components/features/transactions/table-selection.ts`, `table-model/` — selection and
  interaction state types.
- `src/components/features/transactions/cells/` — `PersonAllocationCell.tsx`, the amount cell, the
  description cell (the reference for modes), the actions cell, the date cell.
- `tests/e2e/transactions.spec.ts`, `transaction-grid-structure.spec.ts` and
  `tests/unit/transactions/transaction-grid-cell.test.tsx`,
  `transaction-grid-inspector-controller.test.ts` — the behaviour already pinned.

## Boundaries with the automation branch

Both branches touch the transaction grid. To keep the merge tractable:

- **You own** the cells, selection, numeric parsing, action-cell and date-cell keyboard handling,
  and the command-table parts of the controller.
- **The automation branch owns** the inspector (`TransactionInspector*.tsx`), the inspector binding
  union and registration in the controller, the toolbar's automation props, the automation proposal
  state, and everything under `src/lib/domain/automation/` and `src/lib/crdt/field-rule*`.
- **Allocation semantics are shared.** Rules carry a whole validated allocation set
  (`validateAllocationSet`, `ValidatedAllocationSet`). If nullable allocations change what a valid
  set is, keep the rule-side meaning "blank counts as 0%" and record the decision in `behaviour.md`
  section 7 so the automation branch can follow.
- **Do not reinstate per-cell rule indicators.** PR #63 removed them on purpose; the automation
  branch shows rule state in the inspector and on the inspector toggle only.
- Expect conflicts in `useTransactionGridController.ts` and `src/app/(app)/transactions/page.tsx` at
  merge time. Keep your edits to those files in cohesive blocks.

## Project rules that bit us, so you do not rediscover them

- All checks before any commit:
  `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`. Tests are not
  optional: unit for pure parsing, E2E for every interaction above.
- Run inside the flake shell if `pnpm` is not on your path: `nix develop --command sh -c '<cmd>'`.
- E2E on a private port so other checkouts are untouched:
  `MONEYFLOW_E2E_PORT=<port> pnpm test:e2e --workers=4 --retries=0`. Never `--headed`, `--ui`,
  `--debug`.
- `next dev` rewrites `AGENTS.md` and `next-env.d.ts` during E2E. Run `pnpm format` and
  `git checkout AGENTS.md next-env.d.ts` before committing.
- Other checkouts on the machine share the Supabase stack and the CPU. Timing-only unit failures at
  load average above about 8 are contention; rerun when quiet instead of raising timeouts. Never
  stop the Supabase stack.
- No `as`, `any` or `!`; branded types; `assertNever` for exhaustiveness; Result types for expected
  failures. See `.claude/rules/*.md`.
- Use a library for parsing where one fits; custom numeric parsing is where bugs live, so keep it
  small, pure, table-tested and property-tested with fast-check.
- No parentheses in commit messages.

## Suggested order

1. Nullable values and blur normalisation (items 1 and 2): domain and cell level, pure functions
   first, then the cells, then E2E.
2. Numeric-cell modes (item 3), since it depends on 1 and 2 being stable.
3. Selection (items 5 and 6) as one unit against the selection spec.
4. Action-cell and date-cell keyboard (items 4 and 7), with the written date requirement first.

Each step should land as its own green commit.
