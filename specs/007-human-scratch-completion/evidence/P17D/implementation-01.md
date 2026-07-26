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

### 3. MANUAL-ROW applicability — DONE (rev-01, Q-P17D-01 authorised)

Frozen `:294-295` requires tag/allocation rules to APPLY to manually-created transactions, while
frozen `:269` states manual rows have no raw description text — only a description alias. Root
authorised reopening the P17A engine seam for THIS projection only (**Q-P17D-01**, RESOLVED). The
change is surgical and confined to `src/lib/crdt/field-rules.ts`:

- New pure helper `descriptionTextForMatching(transaction, aliases)`: imported rows
  (`importId != null`) keep the exact raw imported text (empty → `null`); a MANUAL row
  (`importId == null`) with a `descriptionAliasId` projects the alias's resolved (symlink-followed)
  NAME via the existing pure `resolveAlias` from `@/lib/domain/description-aliases`; a manual row
  with no alias projects `null`.
- `subjectForTransaction` / `targetForTransaction` now take the alias collection and delegate to
  that helper; `applyFieldRulesToTransaction` threads `state.descriptionAliases` in. All bulk
  appliers, the import applier and the P17C single-row path route through
  `applyFieldRulesToTransaction`, so no public signature changed and every call site is covered.
- `isManual` is UNCHANGED (`transaction.importId == null`), so description-alias rules stay excluded
  from manual rows via the `rules.ts` `fieldAppliesToManual` gate — that gate was not weakened.
- Provenance invariant preserved: the raw `transaction.description` is never rewritten; matching
  reads the alias name instead. No direct allocation/alias/transaction write is added in the engine;
  allocation writes still go exclusively through P16C `replaceTransactionAllocations`.

The page projection (`transactions/page.tsx` `robotContextById`) mirrors the same rule so the inline
robots agree with what applying would do. Result: tag and whole-allocation rules light up on manual
rows keyed on the alias name; description-alias rules never surface there.

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

The five hard boundaries are byte-identical BASE→HEAD:
`domain/automation/{rules,apply,migration}.ts` and `crdt/import-commit.ts` are absent from the diff;
`domain/settlement.ts` blob `010f3c93582a2ce311594d4dde8464760ca49c43` and P16C `crdt/mutations.ts`
blob `118e994af45b4b531bebd4bf1ed0a4a861a6b6f0` are unchanged. `field-rules.ts` is the ONLY engine
file touched, additively, under the Q-P17D-01 authorisation. No direct allocation-map write;
allocation writes stay on the P16C boundary; no settlement recompute. No secret material in any
code/test/fixture.

## Tests

- Unit (new): `tests/unit/components/field-rule-robot-state.test.ts` (tag add/set match+drift,
  allocation spanning-set match+drift, manual eligibility, scope precedence, property);
  `tests/unit/domain/automation/apply-mode.test.ts` (guard, default, axis decomposition, property).
- Unit (extended): `tests/unit/domain/automation/preferences.test.ts` (apply-mode default +
  round-trip).
- Integration (extended): `tests/integration/field-rules-crdt.test.ts` (new `lastApplyMode` slot
  round-trips; absent slot accepted without migration; the manual-row exclusion test now models the
  manual row as an aliased row per frozen `:269` and proves the tag rule applies via the alias name
  while the description-alias rule does not — same intent, corrected setup for Q-P17D-01);
  `tests/integration/field-rule-mutations.test.ts` (apply-mode threaded; new "manual-row matching
  keys on the resolved description-alias name" block: tag rule applies, allocation rule applies via
  the P16C complete-set, description-alias rule never applies, and a differently-named alias matches
  nothing).
- E2E: `tests/e2e/field-rule-parity.spec.ts` — tag add/set select + inline popup parity; allocation
  column-per-person grid; apply-mode remembered across reopen; popup non-intrusive at scale. The
  manual-row journey is now a real (un-fixme'd) test: a manual aliased row surfaces drifting tag +
  allocation robots (never a description robot), apply-to-this reconciles both, and a manual row
  whose alias matches no rule carries no robot.

## Gates

- `pnpm typecheck`: clean.
- `pnpm lint`: 0 errors (10 pre-existing warnings on untouched `tests/unit/crdt/*` files).
- `pnpm format:check`: fails only on 15 pre-existing markdown/spec files (evidence for other
  packages plus the FROZEN `specs/human-scratch.md`); none are authored or authored-touched here and
  the frozen file must not be reformatted. All six changed source files pass `oxfmt --check`.
- `pnpm test`: 1878 passed / 2 skipped (97 files); no failures.
- `pnpm test:e2e`: 153 passed (full suite), including the 6 `field-rule-parity.spec.ts` journeys.
