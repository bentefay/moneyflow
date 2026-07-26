# P17D / 01 — Independent Review

**Reviewer:** `p17d-reviewer-01` (fresh, independent of the P17D implementer `aa2a0d86…`; read-only
on product code). **Package:** P17D (HS-007 FINAL package — tag rule add/set parity +
person-percentage allocation rule parity spanning all columns + four-mode apply SELECT with
remembered choice (Q-P17B-03) + manual-row applicability + bulk/performance polish). **Review
range:** `27ac503..aad518e` (product delta in `57487ee` + `aad518e`; root docs `efc7f37`/`8d3e5e0`).
**Frozen text:** `specs/human-scratch.md:248-295`. **Verdict:** **PASS** (0 blocking findings).
Persisted by root from the reviewer's verify-not-trust SendMessage verdict; root re-verified every
hard fact against git before integrating.

## Range / git discipline

- Product/test delta reviewed = `27ac503..aad518e`. Chain linear + single-parent
  (`27ac503->efc7f37->57487ee->8d3e5e0->aad518e`, confirmed via `rev-list --parents`). Read-only git
  only; no checkout/reset/branch. (Only commit past `aad518e` at review time was root docs commit
  `5179531`; product state == `aad518e`.)

## Gate results (re-run by the reviewer — real counts)

| Gate         | Result                                                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| typecheck    | PASS — `tsc --noEmit` clean                                                                                                         |
| lint         | 0 errors / 10 warnings (all pre-existing, none in any P17D file)                                                                    |
| format:check | FAIL on 15 files — ALL markdown (specs/evidence/reviews + frozen `human-scratch.md`); ZERO `.ts`/`.tsx`. Non-blocking per dispatch. |
| test         | PASS — 1878 passed / 2 skipped (unit + integration)                                                                                 |
| test:e2e     | PASS — 153 passed (incl. new `field-rule-parity.spec.ts`; WebServer tRPC lines are expected offline-sync noise)                     |

## Hard rules confirmed against the diff + frozen text

- **Chain linear + single-parent**; `aad518e` an ancestor of HEAD.
- **Five hard boundaries BYTE-IDENTICAL BASE(`27ac503`)->HEAD(`aad518e`):** `settlement.ts`
  (`010f3c93582a2ce311594d4dde8464760ca49c43`), P16C `mutations.ts`
  (`118e994af45b4b531bebd4bf1ed0a4a861a6b6f0`), `automation/{rules,apply,migration}.ts`,
  `crdt/import-commit.ts` — all blob-equal and absent from the diff.
- **Allocations remain P16C-only:** `field-rules.ts` adds NO direct allocation/alias/transaction
  write — only the pure projection + threads `aliases`; the application path
  (`replaceTransactionAllocations`) is untouched.
- **`field-rules.ts` is a surgical additive projection preserving the manual-row description-alias
  exclusion:** new pure `descriptionTextForMatching` projects a MANUAL row's resolved
  description-alias NAME via the pre-existing `resolveAlias` (imported rows keep raw text;
  manual-without-alias / dangling -> `null`). `isManual` stays `importId == null`; the UNTOUCHED
  `rules.ts` gate `if (subject.isManual && !fieldAppliesToManual(field)) return false` runs BEFORE
  the `descriptionText` check, so description-alias rules remain excluded from manual rows even
  though the projection now yields non-null text. Raw `description` never rewritten (provenance
  preserved). Change confined to `field-rules.ts` among engine files.
- **`schema.ts`** change is ONLY the additive optional
  `lastApplyMode: StringEnum(["updatingAll","updatingNew","updateAll","updateNew"], {required:false})`
  — no migration.
- **Type-safety:** no new `as`/`any`/non-null `!` in authored code (only comment-prose "as" hits).
- **Secrets:** none — synthetic vectors only.

## Frozen-behaviour confirmations (honest + tested)

- **`:294-295` + `:268-269` (manual-row applicability):** new `field-rule-mutations.test.ts` block
  (tag applies; allocation applies via P16C; description-alias never applies, keeping the row's own
  alias; non-matching alias -> no match) is honest. The `field-rules-crdt.test.ts` "correction" is
  legitimate and STRENGTHENS the assertion: the old setup used an impossible raw-description manual
  row (matches nothing under the new projection, making the exclusion vacuous); the new setup models
  a valid aliased manual row whose projected match text equals the rule's key, so the `isManual`
  gate is genuinely load-bearing. Correction, not loosening.
- **`:255-256` + `:270` (four-mode SELECT + remembered choice):** exact frozen modes; apply-mode
  moved to domain `apply-mode.ts` (re-exported, no dup); the workflow reads `remembered.applyMode`
  to seed the draft and re-persists on save; E2E proves choose "updating all" -> reopen -> restored.
  **Q-P17B-03 genuinely closed** (persisted + re-read), not deferred.
- **`:290-291` tag add/set select** and **`:292-293` allocation column-per-person whole-set:**
  present in shared editor + inline surface; E2E persists a 60/40 set and reopens it; invalid
  complete set -> zero mutation (integration test).
- **Robot parity:** `page.tsx` builds the robot subject's `descriptionText` with the SAME
  imported-raw / manual-alias-name projection as the engine's `descriptionTextForMatching`, and
  mounts per-field robots only when `computeFieldRuleRobotState != none`. Parity holds.

## Non-blocking observations (do not change the verdict)

1. **Dead code:** `src/components/features/transactions/description-rule-state.ts` (+
   `tests/unit/components/description-rule-state.test.ts`) is superseded by
   `field-rule-robot-state.ts` and no longer used by production code; a stale JSDoc
   `@link computeDescriptionRobotState` remains in `use-transaction-rule-workflow.ts:9`.
   Low-severity hygiene only; passes all gates. Root tracks this as **Q-P17D-02** for a later
   cleanup sweep (P20/P21), not a blocker for HS-007.

**Verdict stands: PASS.** All hard gates green; five boundaries byte-identical; `field-rules.ts` a
surgical additive projection preserving the manual-row exclusion; allocations P16C-only; apply-mode
persistence genuinely closes Q-P17B-03; no new casts; no secrets; tests honest. This is the final
HS-007 package — clear to apply the HS-007 scratch marker and flip the requirement to passed. Root
re-verified HEAD product is `aad518e` before integrating.
