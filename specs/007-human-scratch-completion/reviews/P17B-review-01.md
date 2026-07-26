# P17B / 01 — Independent Review

**Reviewer:** `p17b-reviewer-01` (fresh, independent of the P17B implementer). **Package:** P17B
(HS-007 automation redesign — shared management editor + reworked Automations page). **Review
range:** `5e2ddd0..f0d3a37`. **Frozen text:** `specs/human-scratch.md:248-295`. **Verdict:**
**PASS** (0 blocking findings). Persisted by root from the reviewer's verify-not-trust SendMessage
verdict.

## Range / git discipline

- Product/test delta reviewed = `5e2ddd0..f0d3a37`: `2577c15` (shared field-rule editor + reworked
  automations page) and `f0d3a37` (in-place fix: narrow the field select with an `isRuleField` type
  guard instead of `as`). Docs-only control commits (`6683061` dispatch, `082fdc8` review dispatch)
  ignored. Read-only git only; no checkout/reset/branch.

## Gate results (re-run by the reviewer — real counts)

| Gate         | Result                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| typecheck    | PASS — `tsc --noEmit` clean                                                                             |
| lint         | exit 0 — 0 errors, 11 warnings (10 pre-existing on untouched files; 1 NEW, tolerated — see findings)    |
| format:check | exit 1 — all 15 failures pre-existing `specs/**` + control docs; NO P17B `.ts`/`.tsx` among them        |
| test         | PASS — 1836 passed, 2 skipped, 0 failed (92 files); incl. new unit + integration coverage               |
| test:e2e     | PASS — 145 passed, 0 failed (18 specs); changed `automations.spec.ts` run 12× at `--retries=0`, 0 flaky |

## Hard rules confirmed against the diff + frozen text

- **Boundaries byte-EMPTY:** none of `settlement.ts`, P16C `mutations.ts`, `field-rules.ts`,
  `import-commit.ts`, `domain/automation/{rules,apply,migration}.ts`, `defaults.ts`, `schema.ts`,
  both frozen specs, realtime, `supabase/migrations/**`, or any ledger/control file appears in the
  product diff. Diff = new/additive files + `page.tsx` swap + additive `context.tsx`/`index.ts`
  re-exports + tests.
- **Frozen blobs byte-identical BASE↔HEAD:** `settlement.ts`
  `010f3c93582a2ce311594d4dde8464760ca49c43`; P16C `mutations.ts`
  `118e994af45b4b531bebd4bf1ed0a4a861a6b6f0`.
- **Apply engine-routed only:** `useApplyFieldRules` → `applyFieldRulesToAllTransactions` /
  `applyFieldRulesToNewerTransactions`. `FieldRulesManager` calls only these hooks; new
  `field-rule-mutations.ts` writes ONLY `state.fieldRules` + `state.userAutomationPreferences`
  (grep-confirmed: no transaction/allocation/alias write, no
  `insertTransaction`/`replaceTransaction`). Allocations stay P16C-only (decode validates the
  explicit set via `validateAllocationSet`; application is engine → P16C).
- **Genuine reuse:** ONE presentational `FieldRuleEditor` with surface-agnostic seams
  (`descriptionEditable`, `onApply*` callbacks, `idPrefix`) — field selector, amount+account
  constraints, four modes with explanatory tooltip, mode-specific value editors, inline validation,
  delete, apply-all/apply-new, precedence note. Reused by `FieldRulesManager`; structured for the
  P17C popup. CRUD reuses `decode/encodeFieldRule` + `ruleUniquenessKey`; preferences reuse
  `nextUserPreference`/`readRememberedChoice`. Uniqueness enforced on BOTH create AND update.
- **Type-safety:** no new `as`/`any`/non-null `!`. `FieldRuleEditor.tsx:80-82` `isRuleField` guard
  present (earlier `:135` breach fixed at `f0d3a37`). Pre-existing `context.tsx:818` and
  `AutomationRow.tsx` casts untouched, correctly not flagged.
- **Secrets:** none. Diff-scan hits were only review-instruction prose in HANDOFF/PROGRESS docs; no
  real key/seed/token/plaintext in any product/test/fixture.
- **Tests honest:** CRUD create/update/delete with uniqueness (create + update collision), delete
  frees slot, not-found, invalid-allocations & invalid-alias rejected with zero-mutation asserted;
  preference persist/read + defaults; apply-all routes through engine (applies tag; respects
  account-scope negative case). Model unit tests cover all four modes, validation states,
  amount→minor-units, alias, allocation parsing. E2E asserts accessible form role/name,
  `role=alert` + `aria-invalid` on errors, `role=status` summary, `role=group` tags, explain-modes
  button, keyboard focus. Meaningful assertions, not loosened.

## Q-proposals adjudicated (non-blocking)

- **Q-P17B-01** (apply-new reference date = today): FAITHFUL. `handleApplyNew` →
  `applyNewerThan(Temporal.Now.plainDateISO())` → `applyFieldRulesToNewerTransactions` (engine).
  `import-commit.ts` byte-empty, so import-time auto-application undisturbed.
- **Q-P17B-02** (four-mode apply select not persisted): FAITHFUL reading — the frozen P17A
  `userAutomationPreferences` schema (in `schema.ts`, a hard boundary P17B must not touch) has no
  `applyMode` slot, so persisting it would require a boundary schema change P17B correctly avoided;
  it is documented, not silently dropped. NON-BLOCKING for P17B. **Honest caveat for root:** frozen
  text `human-scratch.md:270` ("remember the user's last choices for the select and check boxes") is
  thus only PARTIALLY delivered — checkboxes + field/tagMode are remembered, the apply-mode select
  is not, anywhere yet. This remaining frozen requirement MUST be satisfied (P17A schema revision or
  a later P17 package) before HS-007 can be checked. (Root tracks this as **Q-P17B-03**, default
  owner P17D.)

## Minor non-blocking findings (do not change the verdict)

1. NEW lint warning `tests/integration/field-rule-mutations.test.ts:24` — unused `locationOf` helper
   (with its `date` param) is dead code; gate exits 0 but CLAUDE.md asks all lint issues be fixed.
   Looks like a leftover from an intended apply-new date-boundary integration test. (Root carries
   this to P17C, whose implementer is CLAUDE.md-bound to clear the tree's lint warnings.)
2. Coverage nuance: integration suite exercises apply-ALL through the engine but not apply-NEW's
   newer-than date boundary at the integration level (only E2E clicks apply-new + checks the
   summary). Date-boundary semantics live in already-passed P17A
   (`applyFieldRulesToNewerTransactions`); P17B's wrapper is thin, so acceptable — but the dead
   `locationOf` suggests that integration test was intended and dropped.

**Verdict stands: PASS.** All hard gates green; boundaries byte-empty; frozen blobs intact; apply
engine-routed; allocations P16C-only; no new casts; no secrets; tests honest. Root re-verified HEAD
is `f0d3a37` before integrating.
