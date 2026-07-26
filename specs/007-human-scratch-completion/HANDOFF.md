# HANDOFF — P17D REVIEW dispatch (revision 01)

**To:** `p17d-reviewer-01` (fresh, independent — you did NOT implement P17D; you are NOT
`aa2a0d86…`). Read-only on product code; you may run all gates. **From:** root coordinator.

**Package:** P17D (HS-007 — tag/allocation rule parity with the description rule, four-mode apply
SELECT with remembered choice, manual-row applicability, bulk/perf polish). **This is the FINAL
HS-007 package** — on your PASS, root performs the NON-markerless integration that checks the HS-007
scratch block and flips the HS-007 requirement to passed. Review accordingly: this is the last gate
before HS-007 is declared complete.

**Review range:** `27ac503..aad518e` (product delta in `57487ee` + `aad518e`; root docs in
`efc7f37`/`8d3e5e0`). Work read-only against git; **do NOT checkout/reset/branch/switch** — the
working tree stays at the integrated HEAD.

**Frozen text:** `specs/human-scratch.md:248-295` (HS-007). Key lines you MUST hold the code to:

- `:255-256` — the apply control is a SELECT with exactly four options: "updating all / updating new
  / update all / update new".
- `:270` — "We remember the user's last choices for the select and check boxes in a new user
  preferences part of the vault." (The SELECT persistence is the P17D-new piece — Q-P17B-03.)
- `:268-269` — description-alias rules do NOT apply to manually created transactions (they have no
  description text, only a description alias).
- `:290-291` — tags have an extra SELECT ("add tags" / "set tags") after the account scope.
- `:292-293` — person-percentage attribution has a column per person; the rule spans ALL the
  percentage columns as one set.
- `:294-295` — UNLIKE description-alias rules, tag and person-percentage rules DO apply to manually
  created transactions.

## What root already verified (verify-not-trust — re-derive, do not take on faith)

Root confirmed against git before dispatching; independently re-confirm every hard fact:

- Linear chain `27ac503->efc7f37->57487ee->8d3e5e0->aad518e`, all single-parent.
- **Five HARD boundaries byte-identical BASE(`27ac503`)->HEAD(`aad518e`)** — these must NOT change:
    - `src/lib/domain/settlement.ts` blob `010f3c93582a2ce311594d4dde8464760ca49c43`
    - P16C `src/lib/crdt/mutations.ts` blob `118e994af45b4b531bebd4bf1ed0a4a861a6b6f0`
    - `src/lib/domain/automation/rules.ts`, `apply.ts`, `migration.ts`, and
      `src/lib/crdt/import-commit.ts` (blobs equal BASE; absent from the diff).
- Allocations remain P16C-only (all allocation writes route through
  `replaceTransactionAllocations`); NO direct allocation/alias/transaction write added in the
  engine.

## Additive-allowed this package (scrutinise, don't reject on sight)

- **`src/lib/crdt/field-rules.ts`** (Q-P17D-01): root AUTHORIZED a surgical additive change to
  satisfy frozen `:294-295`. A new pure `descriptionTextForMatching(transaction, aliases)` projects
  a MANUAL row's resolved description-alias NAME (via the pre-existing `resolveAlias`) as the match
  text; imported rows keep raw text; manual-without-alias -> `null`. **Confirm:** (a) `isManual`
  stays `transaction.importId == null` so description-alias rules remain excluded from manual rows
  via the untouched `rules.ts` `fieldAppliesToManual` gate; (b) provenance preserved — raw
  `description` is never rewritten; (c) the change is confined to `field-rules.ts` among engine
  files; (d) all passed P17A/P17B/P17C tests still pass.
- **`src/lib/crdt/schema.ts`** — additive optional `lastApplyMode` StringEnum with the four frozen
  modes, `required:false`, no migration. Confirm it is ONLY that.
- New/modified UI + preference files: `transactions/page.tsx` (per-field robot mounting mirroring
  the engine projection), `FieldRulesManager.tsx`, `rule-editor-model.ts`,
  `TransactionRuleRobot.tsx`, `field-rule-robot-state.ts`, `use-transaction-rule-workflow.ts`,
  `field-rule-mutations.ts`, `domain/automation/apply-mode.ts`, `domain/automation/preferences.ts`
  (threads `lastApplyMode`).

## Gates — re-run and report REAL counts

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`. Root spot-checked:
typecheck clean; format:check fails ONLY on pre-existing non-P17D markdown (incl. the frozen
`human-scratch.md` — not reformattable). Implementer-reported lint 0 errors / 10 pre-existing
warnings, test 1878 passed / 2 skipped, e2e 153 passed — re-run and confirm. A `format:check`
failure confined to pre-existing spec/other-package markdown is NON-blocking; a P17D `.ts`/`.tsx`
file failing oxfmt IS blocking.

## Behaviour you must confirm against frozen text

1. **Manual-row applicability (`:294-295` + `:268-269`)** — tag AND person-percentage rules APPLY to
   a manual row via its resolved alias name; a description-alias rule does NOT. Check the new
   `field-rule-mutations.test.ts` block + the corrected `field-rules-crdt.test.ts` setup are honest
   (the correction models a valid aliased manual row — root judged it a correction, not a loosening;
   independently confirm).
2. **Four-mode SELECT + remembered choice (`:255-256`, `:270`)** — the SELECT offers exactly the
   four modes; the last choice persists via `lastApplyMode` and is re-read on next open;
   checkboxes + field/tagMode remembering (from P17B) still work. This closes Q-P17B-03 — confirm it
   is genuinely closed, not deferred again.
3. **Tag add/set SELECT (`:290-291`)** and **allocation column-per-person spanning the whole set
   (`:292-293`)** — present in the shared editor + inline surface; allocation writes go through P16C
   as a complete set (invalid set -> zero mutation).
4. **Robot parity** — the inline robots' normal/red-drift/hidden state for manual rows agrees with
   what applying the rule would actually do (page projection mirrors the engine's
   `descriptionTextForMatching`).

## Hard rules (blocking if violated)

- No new `as` / `any` / non-null `!` in authored code (comments / `!=` / logical-NOT are fine).
- Money as integer minor units; pure/immutable where the file already is.
- **Secret-safety (BLOCKING):** no seed phrase, recovery material, vault master key, invite-fragment
  bearer secret, `crypto_box` secret material, `SUPABASE_JWT_SECRET`, or vault plaintext anywhere in
  code/tests/fixtures/evidence. Synthetic/public vectors only. Any real-material leak is a blocking
  finding reported to root IMMEDIATELY.

## Handback

SendMessage to `main` with: **VERDICT: PASS** or **VERDICT: FAIL** (0 blocking findings = PASS), the
five real gate counts, an explicit statement that the five hard boundaries are byte-identical and
that `field-rules.ts` is a surgical additive projection preserving the manual-row description-alias
exclusion, and any Q-proposals or non-blocking observations. If you find a blocking issue, describe
it precisely (file:line, frozen line violated, failing scenario) so root can bounce a fix. Do not
edit product code; do not checkout/reset.
