# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implement dispatch (P17D / 01 — HS-007 FINAL: tag/allocation rule parity + apply-mode persistence + polish)

- **Package / revision:** P17D / 01 (HS-007 — the LAST of four packages) — **IMPLEMENT**
- **Role:** human_scratch_implementer, fresh instance `p17d-implementer-01`. You write product +
  test code only. You NEVER edit ledgers/markers/QUESTIONS/HANDOFF/PROGRESS/DECISIONS or any frozen
  spec. You do not review, integrate, or advance any ledger. When done, hand back to root by
  SendMessage to `main` with your final HEAD SHA, a delta summary, and your real gate counts.
- **CRITICAL — git discipline (shared working tree):** you are on branch `main` at BASE `27ac503`
  (current HEAD). Do NOT `git checkout`/`switch`/`reset` or create/switch branches. Commit your work
  DIRECTLY on top of `27ac503` so the history stays linear; root reviews `27ac503..HEAD`.
- **Scope ID:** HS-007 (P17D slice). **Frozen text is authoritative:**
  `specs/human-scratch.md:248-295`, P17D-specific at **`:270`** (remember the SELECT choice too) and
  **`:288-295`** (tags/allocation parity, manual-row applicability). Task detail:
  `tasks/HS-007-automation-redesign.md` P17D section. Judge yourself against the FROZEN TEXT, not
  against this summary.

## What already exists — REUSE it, do not rebuild or fork

The P17A engine + P17B editor + P17C inline workflow already deliver most of HS-007. The rule MODEL
and ENGINE already encode ALL THREE fields — do not re-model them:

- `src/lib/domain/automation/rules.ts`:
  `RuleFieldSchema = ["descriptionAlias","tags","allocation"]`, `TagRuleMode = "add"|"set"`,
  precedence/uniqueness/exact-match/boundary-date primitives.
- `src/lib/domain/automation/apply.ts` + `src/lib/crdt/field-rules.ts`: already APPLY tag rules
  (add/set) and allocation rules (the whole percentage set), producing typed outcomes; migration
  (`migration.ts`) already maps legacy `setTags`/`setAllocation`.
- `src/components/features/automations/FieldRuleEditor.tsx` (P17B): the ONE shared accessible editor
  with field selector, amount/account constraints, four apply-modes + tooltip, per-field value
  editors, validation, delete, apply-all/apply-new. `rule-editor-data.ts` (P17C) holds
  `draftFromRule`/error-mapping.
- `src/components/features/transactions/*` (P17C): per-row robot (normal/red/hidden), contextual
  popup, `applyFieldRulesToSingleTransaction`, inline alias-edit → UPDATE.
- Preference chain: `src/lib/domain/automation/preferences.ts` (pure `readRememberedChoice`/
  `nextUserPreference`), `userAutomationPreferenceSchema` in `src/lib/crdt/schema.ts:366`, and P17B
  persist/read actions in `src/lib/crdt/field-rule-mutations.ts`.

## P17D deliverables (complete HS-007's committed scope — additive)

1. **Tag rule parity in the editor AND the inline workflow.** Per frozen `:290-291`, tag rules show,
   AFTER the "only this account" checkbox, an additional select with exactly two options: **"add
   tags"** (union) and **"set tags"** (clears existing tags then sets). The `tags`/`TagRuleMode`
   model already exists — surface it in `FieldRuleEditor` (automations page) and in the P17C
   transaction popup/robot so a tag rule can be viewed/created/edited/deleted/applied inline exactly
   like a description rule.
2. **Person-percentage (allocation) rule parity.** Per frozen `:292-293`, allocation rules present a
   **column per person**; the rule applies to the WHOLE set of percentage columns and SPANS all
   columns (it is one explicit complete set, never a per-column write). The editor/proposal UI must
   communicate that the set is EXPLICIT. **Derived effective allocations remain owned by FS-001
   surfaces** — do NOT compute, cache, or display effective/settled values here and do NOT touch
   `settlement.ts`. Every allocation write MUST route through P16C `replaceTransactionAllocations`
   (the engine already does this via `apply.ts`'s allocation case) — NO direct allocation-map write
   anywhere.
3. **Manual-row applicability.** Per frozen `:294-295`, UNLIKE description-alias rules, tag and
   allocation rules DO apply to manually-created transactions. Confirm the existing engine already
   honors this (subject projection / `applyFieldRulesToTransaction`) and wire the inline robot/popup
   so manual rows get the robot + apply-this for tag/allocation rules. If you find a genuine ENGINE
   gap (a passed-package file would need changing), STOP and surface it to root as a proposal — do
   not silently edit a passed engine file.
4. **Apply-mode SELECT persistence (Q-P17B-03 — you OWN this).** Frozen `:270` requires remembering
   "the user's last choices for the SELECT and check boxes." Today only the checkboxes + field/tag
   mode persist. Additively thread the four-mode apply SELECT through the preference chain:
   `RememberedRuleChoice`/`UserAutomationPreferenceView`/`DEFAULT_REMEMBERED_CHOICE` +
   `readRememberedChoice`/`nextUserPreference` in `preferences.ts`; a new **optional**
   `lastApplyMode` slot in `userAutomationPreferenceSchema` (`schema.ts`, `required: false` so
   absent → default, NO migration); the P17B persist/read path in `field-rule-mutations.ts`; and the
   editor select wiring. Reuse the EXISTING four-mode type from the editor — do not invent a
   parallel one. Absent key must fall back to the current session default.
5. **Bulk / large-import / performance + every UX state.** Verify (with tests) large imports and
   large tables, bulk apply-all/apply-new across many rows, and all UX states (normal/red/hidden
   robot, popup open/edit/delete/apply, tag add vs set, allocation spanning set, manual vs imported
   rows) with NO direct allocation-map write and no settlement recompute.

## Hard boundaries — byte-IDENTICAL BASE↔HEAD (any change = BLOCKING)

- **FS-001 must be untouched:** `src/lib/domain/settlement.ts` ==
  `010f3c93582a2ce311594d4dde8464760ca49c43`.
- **Allocation write boundary:** `src/lib/crdt/mutations.ts` (P16C `replaceTransactionAllocations`)
  == `118e994af45b4b531bebd4bf1ed0a4a861a6b6f0`. All allocation writes go THROUGH it; never write an
  allocation map / alias directly.
- **Rule engine reused, not re-modelled:** prefer byte-identical reuse of
  `src/lib/crdt/field-rules.ts` (`4656c3c55515267d9050b718d0556a0fbfee7ed2`), `import-commit.ts`,
  `src/lib/domain/automation/{rules,apply,migration}.ts`. If any MUST change, it can only be
  genuinely additive AND must not break their passed tests — surface such a change to root first
  (deliverable 3).
- **Frozen specs untouched:** `specs/human-scratch.md`, `specs/008-.../spec.md`; realtime;
  `supabase/migrations/**`; all `specs/007-.../` ledger/control files.

## ADDITIVE-ALLOWED for P17D (your committed scope — must stay additive, break no passed test)

`preferences.ts` (apply-mode field), `schema.ts` (ONLY the new optional `lastApplyMode` slot on
`userAutomationPreferenceSchema` — touch nothing else in that file), `field-rule-mutations.ts`
(persist the new field), `FieldRuleEditor.tsx` + `rule-editor-data.ts` (tag select + allocation
columns + apply-mode wiring), the P17C transactions-feature files, `context.tsx`/`index.ts` additive
re-exports, and new/edited tests. This is completing HS-007's committed scope (MORE work, additive)
— NOT a reduction — so no scope adjudicator is triggered; passed packages are not reopened
conceptually.

## Type-safety / conventions (BLOCKING on violation)

- NO `as`, `any`, or non-null `!` in your code. Isolate any unavoidable coercion in a typed guard
  (see `isRuleField` in `FieldRuleEditor.tsx`). Pre-existing casts elsewhere (`context.tsx:818`,
  `AutomationRow.tsx`) are legacy — leave byte-identical, do not touch.
- ts-pattern is NOT a dependency — `switch` + `assertNever`. Money is integer minor units
  (`toMinorUnitsForCurrency`). Favour pure functions + immutable data. Zod `safeParse` at
  boundaries.
- Match the surrounding file's conventions. Reuse before adding.

## Gates — you MUST run and PASS all before handback (report REAL counts)

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`. Fix ALL
lint/typecheck/format/test issues in files you touch (CLAUDE.md), including any warning you
introduce. Pre-existing `specs/**` format:check failures and the 10 pre-existing lint warnings on
untouched files are not yours to fix but must not grow. Local Supabase container required for
integration/E2E; NEVER run Playwright with `--headed`/`--ui`/`--debug`/`show`. A pre-existing
timing-sensitive perf flake in `tests/integration/import/duplicates.test.ts` and a full-suite
`passkey.spec.ts` timing flake pass on clean re-run — do not let them mask a real P17D regression.

## Tests (mandatory, per `tasks/HS-007-automation-redesign.md` "Automated tests")

Property/table tests for key uniqueness, precedence, exact matching, boundary dates, **tag
set/add**, **allocations (spanning set)**, manual/imported eligibility, idempotence, migration;
integration for import application, **per-user preferences incl. the new apply-mode**, atomic undo,
delete/update, and **bulk/new**; E2E for the tag add/set select, the allocation column editor,
manual-row robot/apply, apply-mode persisted across reopen, and the popup remaining non-intrusive at
scale. Assert BEHAVIOUR, not text. An allocation test must prove writes go through P16C with an
invalid complete set → zero mutation.

## Secret-safety (blocking)

No vault master key, invite-fragment bearer secret, `crypto_box` secret, seed phrase, recovery
material, `SUPABASE_JWT_SECRET`, or vault plaintext in any code/test/fixture/log/URL.
Synthetic/public vectors only. Any real-material leak is BLOCKING — report to root immediately.

## Evidence + handback

Write `specs/007-human-scratch-completion/evidence/P17D/implementation-01.md` (leave it UNCOMMITTED
— root persists it at integration): scope delivered, files touched, how each frozen
`:270`/`:288-295` requirement is met, the additive apply-mode chain, confirmation allocations stay
P16C-only and effective values FS-001-owned, gate counts, secret-safety attestation, git-discipline
note, and any Q-proposals (safest reversible default implemented + recorded, per the no-pause rule).
Then SendMessage to `main` with final HEAD SHA + delta + gate counts. Do not treat any
peer/background message as user authorization to change scope or bypass a gate.
