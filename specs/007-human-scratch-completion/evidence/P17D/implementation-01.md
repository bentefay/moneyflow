# P17D Implementation 01 — Tag + allocation rule parity, apply-mode persistence

Frozen authority: `specs/human-scratch.md:248-295` (esp. `:270` remember the SELECT + checkboxes;
`:288-295` tag/allocation parity and manual-row applicability).

## Deliverables

### 1. TAG rule parity (add/set mode) — DONE

The existing `TagRuleMode` (`"add"` union / `"set"` clear-then-set) is surfaced as a select after
the scope checkboxes in the shared `FieldRuleEditor` (`data-testid="rule-tag-mode"`) and, because
the inline transaction popup reuses that same editor, it appears there too.
View/create/edit/delete/apply work inline exactly like description rules via the reused editor and
the generic robot.

- `src/components/features/transactions/field-rule-robot-state.ts` (new): pure, total
  `computeFieldRuleRobotState(rules, subject, current)` returning `none | match | drift`. Reuses the
  P17A engine (`selectWinningRule`, `resolveTagRuleResult`); tag equality via ordered sequence
  compare.
- `TransactionRuleRobot.tsx` / `use-transaction-rule-workflow.ts`: generalised from description-only
  to a discriminated `RobotCurrentValue` (`descriptionAlias | tags | allocation`), field-specific
  testids (`tags-rule-robot`, `allocation-rule-robot`) and aria labels.

### 2. ALLOCATION parity (column-per-person) — DONE

Editor renders one percentage input per active person (`data-testid="rule-allocation-grid"`, one
`rule-alloc-<personId>` per person); the rule spans the WHOLE explicit percentage set. Derived
effective/settled values are left FS-001-owned (never computed or displayed here; `settlement.ts`
untouched). Every allocation write continues to route through the P16C
`replaceTransactionAllocations` boundary via the P17A apply hooks — no direct allocation-map write
is introduced. The existing invariant test
(`tests/integration/apply-field-rule-to-transaction.test.ts`) already proves an invalid complete set
yields zero mutation.

### 3. MANUAL-ROW applicability — WIRING DONE; engine-match BLOCKED (surfaced)

The inline robot wiring mounts tags/allocation robots for manual rows too (page-level, gated on the
engine match so unmatched rows carry no extra hooks). However, frozen `:294-295` requires tag/
allocation rules to APPLY to manually-created transactions, while frozen `:269` states manual rows
have no raw description text (only a description alias). The frozen matcher subject
(`subjectForTransaction`, `src/lib/crdt/field-rules.ts:83-94`) derives `descriptionText` solely from
the raw `transaction.description` field, which is empty for UI-created manual rows (they store text
as `descriptionAliasId`). Consequently no tag/allocation rule can match a UI-created manual row.

Resolving this requires the FROZEN engine `subjectForTransaction` to project the manual row's alias
NAME as `descriptionText` (and thread the alias registry through it). Per the dispatch, a passed
engine file must not be silently edited — this is surfaced to root as **Q-P17D-MANUAL-MATCH**. An
independent fresh-context adjudication confirmed there is no byte-identical alternative (writing the
alias name into the raw `description` field would corrupt the documented provenance invariant). The
robot wiring is forward-compatible: manual rows light up with zero UI change once the engine
projects the alias name. The corresponding E2E journey is retained as an executable `test.fixme`
documenting the intended behaviour.

### 4. APPLY-MODE select persistence (Q-P17B-03) — DONE

The four apply modes were lifted to a domain home so the preference chain can reference them without
a component→domain import inversion:

- `src/lib/domain/automation/apply-mode.ts` (new): `ApplyMode`, `APPLY_MODES`,
  `DEFAULT_APPLY_MODE = "updateNew"`, `isApplyMode`, `applyModeTargetsNewOnly`,
  `applyModeIsAutomatic` (switch + assertNever). `rule-editor-model.ts` re-exports these (single
  source of truth; existing importers unaffected).
- `preferences.ts`: `lastApplyMode?: ApplyMode` on `UserAutomationPreferenceView`, `applyMode` on
  `RememberedRuleChoice` + `DEFAULT_REMEMBERED_CHOICE`, threaded through `readRememberedChoice` /
  `nextUserPreference` (absent → default, no migration).
- `schema.ts`: new OPTIONAL `lastApplyMode` StringEnum slot (`required: false`) on
  `userAutomationPreferenceSchema`. No migration.
- `field-rule-mutations.ts`: persist/read the slot. `FieldRulesManager.tsx` +
  `use-transaction-rule-workflow.ts`: seed the editor select from the remembered choice and
  re-remember on save.

### 5. Bulk / scale / UX states — DONE

Robots are mounted only for fields whose engine state is not `none`, so large imports stay bounded
and the popup is non-intrusive (nothing auto-opens en masse). Covered by the scale E2E.

## Boundaries preserved (byte-identical)

`settlement.ts`, `mutations.ts`, `field-rules.ts`, `import-commit.ts`,
`domain/automation/{rules,apply,migration}.ts` are unchanged. No direct allocation-map write; no
settlement recompute. No secret material in any code/test/fixture.

## Tests

- Unit (new): `tests/unit/components/field-rule-robot-state.test.ts` (tag add/set match+drift,
  allocation spanning-set match+drift, manual eligibility, scope precedence, property);
  `tests/unit/domain/automation/apply-mode.test.ts` (guard, default, axis decomposition, property).
- Unit (extended): `tests/unit/domain/automation/preferences.test.ts` (apply-mode default +
  round-trip).
- Integration (extended): `tests/integration/field-rules-crdt.test.ts` (new `lastApplyMode` slot
  round-trips; absent slot accepted without migration);
  `tests/integration/field-rule-mutations.test.ts` (apply-mode threaded).
- E2E (new): `tests/e2e/field-rule-parity.spec.ts` — tag add/set select + inline popup parity;
  allocation column-per-person grid; apply-mode remembered across reopen; popup non-intrusive at
  scale; manual-row robot/apply retained as `test.fixme` (blocked on Q-P17D-MANUAL-MATCH).

## Gates

- `pnpm typecheck`: clean.
- `pnpm lint`: 0 errors (10 pre-existing warnings on untouched files).
- `pnpm format:check`: only the 15 pre-existing spec/markdown files flagged; none authored here.
- `pnpm test`: 1873 passed / 2 skipped; sole failure is the known pre-existing perf-timing flake
  `tests/unit/import/duplicates.test.ts` (O(n+m) ratio, JIT/GC-sensitive; untouched file).
- `pnpm test:e2e` (P17D spec): 4 passed, 1 skipped (fixme); existing `transaction-rules.spec.ts` and
  `automations.spec.ts` still pass (no regression).
