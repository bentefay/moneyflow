# P17C / 01 — Independent Review

**Reviewer:** `p17c-reviewer-01` (fresh, independent of the P17C implementer; read-only on product
code). **Package:** P17C (HS-007 — inline description-rule robot + contextual popup, robot
normal/red-drift/hidden state per row, inline alias-edit → UPDATE rule, apply-this/all/new scoped to
the row date). **Review range:** `0d3de91..ce82cb5` (single feat commit `ce82cb5`; working tree at
integrated HEAD `afbbe67`, no checkout/reset performed). **Frozen text:**
`specs/human-scratch.md:248-295` (P17C behavior ~`:279-295`). **Verdict:** **PASS** (0 blocking
findings). Persisted by root from the reviewer's verify-not-trust SendMessage verdict; root
re-verified every hard fact against git before integrating.

## Range / git discipline

- Product/test delta reviewed = `0d3de91..ce82cb5`, single feat commit `ce82cb5` (inline
  description-rule robot + contextual popup). Docs-only control commit `6667159` ignored. Read-only
  git only; no checkout/reset/branch.

## Gate results (re-run by the reviewer — real counts)

| Gate         | Result                                                                                                                                                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| typecheck    | PASS — 0 errors                                                                                                                                                                                                                  |
| lint         | exit 0 — 0 errors, 10 warnings ALL pre-existing (`TransactionTable.tsx:360` useVirtualizer; `queries.ts` + test-file unused-vars). NO new warning; the formerly-stray `locationOf` is now used by a real apply-new-scoping test. |
| format:check | fails only on 15 pre-existing `specs/**` markdown files (DECISIONS/PROGRESS/QUESTIONS/RISKS/evidence/reviews/human-scratch). Zero P17C source/test files flagged.                                                                |
| test         | PASS — 95 files, 1856 passed, 2 skipped, 0 failed (incl. `import/duplicates.test.ts` — flake did not reproduce, not a P17C regression)                                                                                           |
| test:e2e     | new `transaction-rules.spec.ts` 2/2 at `--retries=0`; full suite 146 passed + 1 unrelated `passkey.spec.ts:387` full-suite timing flake (NOT in the P17C diff; passes 12/12 in isolation)                                        |

## Hard rules confirmed against the diff + frozen text

- **Boundaries byte-EMPTY / frozen blobs byte-identical BASE↔HEAD** at the exact pinned SHAs:
  settlement `010f3c93582a2ce311594d4dde8464760ca49c43`; P16C `mutations.ts`
  `118e994af45b4b531bebd4bf1ed0a4a861a6b6f0`; P17A `field-rules.ts`
  `4656c3c55515267d9050b718d0556a0fbfee7ed2`; P17B `field-rule-mutations.ts`
  `1b63b3c996bb1b894eccde7a8858c198faf1785c`; `schema.ts`
  `cab73f73f4010d15392ae3ff18e4331b795a7c6d`. Other boundaries SAME BASE↔HEAD: `defaults.ts`,
  `import-commit.ts`, `automation/{rules,apply,migration}.ts`, `FieldRuleEditor.tsx`. The feat
  commit touches NO spec/realtime/supabase-migration/ledger/control file.
- **`FieldRuleEditor` reused unchanged** (byte-empty). The refactor only extracted `draftFromRule` +
  `mutationErrorToFieldErrors` into `rule-editor-data.ts`; behavior is preserved and strengthened to
  `switch`+`assertNever` over the typed `FieldRuleMutationError`. No fork, no P17B weakening.
- **Robot state** computed by REUSED P17A `selectWinningRule` (→
  `ruleMatchesSubject`/`ruleScopeRank`/ recency): NORMAL only when the current alias == the winning
  rule's implied alias, RED on drift, HIDDEN while editing (`isEditing`) or when none match. The
  page's `RuleMatchSubject` projection is byte-faithful to the engine's own `subjectForTransaction`
  (`rawDescription`/`accountId`/`amount`/ `isManual = importId == null`). No reimplemented
  precedence.
- **Popup non-intrusive:** portaled Radix Popover with `onOpenAutoFocus` prevented (no focus steal),
  fixed `w-96`/`max-w-[90vw]` overlay (no table resize/occlusion). Mounts the shared editor with
  `descriptionEditable=false`, `mode="edit"`; supports view/edit/delete/apply-this/all/new.
- **Inline alias-edit → UPDATE:** `workflow.save` calls `update({id,...})`; the popup has no create
  path (create-vs-update structurally guaranteed).
- **Apply routing:** apply-all/apply-new via `useApplyFieldRules`; apply-new scoped to THAT row's
  date (strictly-newer, integration-tested); apply-to-this via new
  `applyFieldRulesToSingleTransaction` which delegates WHOLESALE to P17A
  `applyFieldRulesToTransaction` — no direct allocation/transaction/alias write. Allocations remain
  P16C-only; invalid complete-set → zero mutation (integration-tested).
- **Type-safety:** no new `as`/`any`/non-null `!` in authored code (all scan hits are comments or
  logical-NOT). Pre-existing `context.tsx:818` / `AutomationRow.tsx` casts untouched, correctly not
  flagged.
- **Secrets:** none in the diff. Synthetic/public CSV vectors only.
- **Tests honest:** robot normal/red/hidden over overlapping scopes + drift (unit + property-based);
  single-tx apply through P17A+P16C only with invalid-set→zero-mutation and not-found; apply-new
  scoped to row date; `draftFromRule` + error mapping; E2E open-from-normal + open-from-drift, view,
  apply-this clears drift, hidden-while-editing, reused editor with locked description. Meaningful
  assertions, not loosened.

## Q-proposals adjudicated (non-blocking)

- **Q-P17C-01..05** (popup placement/anchoring; robot glyph; drift copy; apply-this single button;
  "actively edited" = description-input focus): all faithful to frozen text and non-blocking —
  presentational/copy/interpretation defaults, each the safest reversible choice, none touching
  schema or engine semantics.
- **Q-P17C-06** (apply-mode SELECT default): correctly DEFERS apply-mode persistence to P17D
  (`schema.ts` `applyMode` slot; tracked as Q-P17B-03). Already-persisted field-mode/scope
  checkboxes ARE honoured via `draftFromRule`. Not a P17C gap.

## Minor non-blocking observations (do not change the verdict)

1. E2E does not separately drive popup edit-save/delete/apply-all/apply-new UI or
   remembered-checkbox honoring, but those paths are structurally sound and covered by
   unit/integration tests.
2. Evidence Q-P17C-01 says width `w-72` while code uses `w-96` — stale evidence prose, not a code
   issue.

**Verdict stands: PASS.** All hard gates green; boundaries byte-empty; frozen blobs intact; apply
routes through P17A + P16C-only; robot/drift faithful to the reused matchers; popup non-intrusive;
create-vs-update correct; no new casts / lint-warnings; no secrets; tests honest. Root re-verified
HEAD product is `ce82cb5` (parent `6667159`, linear) before integrating.
