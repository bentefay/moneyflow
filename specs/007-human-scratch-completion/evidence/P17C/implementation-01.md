# P17C revision 01 — Description inline workflow (implementation-01)

## Scope delivered

Implemented the HS-007 "Description inline workflow": a per-row contextual popup on the transactions
table, driven by a robot icon that is NORMAL when a transaction's current description alias matches
its highest-precedence matching rule, RED (drift) when the matching rule implies a different alias,
and HIDDEN while the description cell is actively edited. The popup REUSES the P17B shared
`FieldRuleEditor` (no fork) and honours the persisted field-mode/checkbox choices via the rule
baseline. Supports view / edit (update, never create) / delete / apply-all / apply-new (scoped to
that transaction's date) / apply-this.

The robot/drift state is computed by REUSING P17A matcher primitives via the pure
`computeDescriptionRobotState` (which calls `selectWinningRule` / `ruleMatchesSubject` on the
faithfully re-projected `RuleMatchSubject`). No hard-boundary file was edited.

## Files

### New product

- `src/lib/crdt/apply-field-rule-to-transaction.ts` — the single additive vault action
  `applyFieldRulesToSingleTransaction`; reuses `findTransactionById` + `readActiveFieldRules` + P17A
  `applyFieldRulesToTransaction` (so alias writes stay on the P11 boundary and allocation writes
  stay P16C-only, inherited from the engine).
- `src/components/features/automations/rule-editor-data.ts` — shared pure helpers `draftFromRule`
  and `mutationErrorToFieldErrors` (switch + `assertNever`), extracted from `FieldRulesManager` so
  the transaction popup reuses identical draft/error mapping.
- `src/components/features/transactions/description-rule-state.ts` — pure
  `computeDescriptionRobotState` (P17A reuse) returning a `DescriptionRobotState` discriminated
  union (`none` | `match` | `drift`).
- `src/components/features/transactions/use-transaction-rule-workflow.ts` — encapsulates every CRDT
  seam for one transaction; routes updates through P17B `useFieldRuleActions().update/remove`,
  apply-all/new through P17B `useApplyFieldRules`, and apply-this through the new hook. Draft is
  DERIVED from the winning rule (no seeding effect).
- `src/components/features/transactions/TransactionRulePopup.tsx` — presentational; mounts
  `FieldRuleEditor` with `descriptionEditable={false}` `mode="edit"`, plus a drift banner and the
  drift-only "apply to this transaction" button.
- `src/components/features/transactions/TransactionRuleRobot.tsx` — owns the Radix Popover +
  workflow; `Bot` glyph, `text-destructive` on drift; returns null while editing or when no rule
  matches.

### New tests

- `tests/unit/components/description-rule-state.test.ts` — robot-state matcher unit tests.
- `tests/unit/components/rule-editor-data.test.ts` — draft/error-mapping unit tests.
- `tests/integration/apply-field-rule-to-transaction.test.ts` — the apply-this vault action (alias
  via P11, allocation via P16C, does-not-touch-others, invalid-set zero-mutation,
  transaction-not-found).
- `tests/e2e/transaction-rules.spec.ts` — 2 journeys: (1) imported match shows a normal robot, hides
  while editing, opens the reused editor with a locked description; (2) repointing the alias drives
  drift + auto-open, and apply-this re-applies the rule to only that transaction.

### Modified product

- `src/lib/crdt/context.tsx` — added `useApplyFieldRulesToTransaction()` hook.
- `src/lib/crdt/index.ts` — re-exported the hook + `applyFieldRulesToSingleTransaction` /
  `ApplyFieldRulesToTransactionResult`.
- `src/components/features/automations/FieldRulesManager.tsx` — now imports the extracted
  `draftFromRule` / `mutationErrorToFieldErrors` (removed the inline duplicates).
- `src/components/features/transactions/cells/InlineEditableDescriptionAlias.tsx` — added optional
  `onEditingChange` (fired on focus/blur) so the robot can hide during active editing.
- `src/components/features/transactions/TransactionRow.tsx` — added a `renderDescriptionRobot`
  render-prop slot beside the description cell + local `isEditingDescription` state.
- `src/components/features/transactions/TransactionTable.tsx` — threads `renderDescriptionRobot` per
  row.
- `src/app/(app)/transactions/page.tsx` — builds the faithful per-row `RuleMatchSubject`
  re-projection, renders `TransactionRuleRobot`, and flags auto-open after an alias assign/change.

### Modified tests

- `tests/integration/field-rule-mutations.test.ts` — completed the intended apply-new date-boundary
  integration test (this consumes the previously-stray `locationOf` helper, clearing the required
  lint cleanup).

### Deliberately NOT committed

- `next-env.d.ts` — auto-generated Next.js noise (routes path moved under `.next/dev/`), unrelated
  to this package; left unstaged.
- This evidence file — per dispatch, not committed.

## Gate results (real)

Run on the final change set:

- `pnpm typecheck` — PASS (tsc --noEmit, no errors).
- `pnpm lint` — PASS, 0 errors, 10 warnings. ALL 10 are pre-existing and in files this package did
  not author: `TransactionTable.tsx:360` (informational TanStack `useVirtualizer` compilation-skip,
  unchanged line), `src/lib/crdt/queries.ts` (x2), `tests/unit/crdt/hierarchical-schema.test.ts`
  (x1), `tests/unit/crdt/transaction-mutations.test.ts` (x4),
  `tests/unit/crdt/transaction-ordering.test.ts` (x1), `tests/unit/crdt/transaction-queries.test.ts`
  (x1). NO new warning introduced; the package's 6 new source files + 4 new test files are
  warning-clean.
- `pnpm format:check` — no code-file (`.ts`/`.tsx`) issues. The 15 remaining failures are
  pre-existing tracked spec/ledger markdown files (DECISIONS/PROGRESS/QUESTIONS/RISKS/DEPENDENCIES,
  human-scratch.md, unrelated evidence files) that are hard boundaries and were not touched.
- `pnpm test` — PASS, 95 files, 1856 passed, 2 skipped. (An unrelated timing-sensitive perf test in
  `tests/unit/import/duplicates.test.ts` flaked once under full-suite load — asserts an O(n) ratio <
  4, saw 4.19 — and passes deterministically in isolation and on the clean full re-run.)
- `pnpm test:e2e` — PASS, 147 passed (includes the 2 new `transaction-rules.spec.ts` journeys). The
  tRPC "Request authentication failed" / "Failed to fetch" console lines are pre-existing
  local-stack noise (the local Supabase auth service is intentionally disabled in this project's
  config); no test asserts on them and none fail.

## Q-proposals (open frozen-text decisions — safest reversible defaults)

These are UI/wording choices the frozen spec leaves open. Each was implemented as the safest
reversible default and is recorded here for adjudication; none touch schema or engine semantics.

- **Q-P17C-01 — Popup placement/anchoring.** Radix `Popover` portalled from the robot trigger, with
  `onOpenAutoFocus` prevented so the table neither resizes, scrolls, nor steals editing focus.
  Default content width `w-72`. Reversible (presentational only).
- **Q-P17C-02 — Robot glyph.** lucide `Bot` icon, `text-muted-foreground` normal /
  `text-destructive` on drift, exposing `data-drift` + an `aria-label` describing match vs.
  divergence. Reversible.
- **Q-P17C-03 — Drift-explainer copy.** Popup drift banner reads that the transaction's current
  description differs from its automation rule and can be reconciled; robot aria-label mirrors it.
  Copy only, reversible.
- **Q-P17C-04 — Apply-this confirmation.** A single "apply to this transaction" button with no extra
  confirm dialog (the action is additive and re-runnable, and drift visibly clears on success).
  Reversible (a confirm step could be layered later).
- **Q-P17C-05 — "Actively being edited" interpretation.** Defined as the description cell's input
  holding focus (`onEditingChange` on focus/blur). The robot is hidden for that row while focused
  and reappears on commit/blur. Reversible.
- **Q-P17C-06 — Apply-mode select default (relates to Q-P17B-03, owned by P17D).** The apply-mode
  select choice is NOT persisted (no `applyMode` schema slot exists yet); it defaults per session
  from the rule baseline. Already-persisted field-mode/scope checkboxes ARE honoured via
  `draftFromRule`. No schema change made.

## Secret-safety attestation

No vault master key, invite-fragment bearer secret, crypto_box secret, seed phrase, recovery
material, `SUPABASE_JWT_SECRET`, or vault plaintext appears in any code, test, fixture, log, URL, or
this evidence. E2E fixtures are synthetic public CSV vectors ("COFFEE SHOP 123", amounts). No real
material was encountered or leaked.

## Git discipline

Working tree stayed on `main`; no `checkout` / `switch` / `reset` / branch creation. Product + test
changes committed directly on top of the dispatch HEAD `6667159`.
