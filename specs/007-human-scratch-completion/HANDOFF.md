# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Review dispatch (P17B / 01 — shared rule editor + automations-page UX)

- **Package / revision:** P17B / 01 (HS-007 — shared management editor) — **REVIEW**
- **Role:** human_scratch_reviewer, fresh instance `p17b-reviewer-01`. You are DISTINCT from the
  implementer — you did not write this code. You are read-only on product code: you MUST NOT edit
  any product/test/spec/ledger file. You re-run gates, judge against frozen text, and return a
  verdict by SendMessage to `main`. You never commit, never integrate, never advance any ledger.
- **CRITICAL — git discipline:** the working tree is at the integrated HEAD on branch `main`. Do NOT
  `git checkout`, `git switch`, `git reset`, or create/switch branches. Read the diff with
  `git diff 5e2ddd0..f0d3a37` and `git show`; run gates in place.
- **Review range (product):** `5e2ddd0..f0d3a37`. Ignore the two docs-only commits (`6683061`
  dispatch, and any control commit) — judge only product/test changes. Final product HEAD `f0d3a37`.
- **Scope ID:** HS-007 (P17B slice). Frozen text: `specs/human-scratch.md:248-295` (the whole block
  — exact-description rules, the four modes, optional amount/account constraints, apply-for-all vs
  apply-for-new, precedence, manual-vs-imported distinction). Task detail:
  `tasks/HS-007-automation-redesign.md` **P17B — Shared management editor** section.
- **Implementer evidence (read, do not trust blindly):** `evidence/P17B/implementation-01.md`. Judge
  against the FROZEN TEXT and the actual diff, not against the evidence's self-description.

## What P17B committed to deliver — verify each against the diff + frozen text

1. **ONE shared, accessible rule editor** that is genuinely reused (a single component, not two
   copies) — `src/components/features/automations/FieldRuleEditor.tsx`. Confirm it covers: field
   selector, optional amount and/or account constraints, the four modes, the value(s), inline
   validation, delete, apply-all and apply-new, and clearly explains precedence and impact. Confirm
   it is structured (surface-agnostic seams) so P17C can mount the SAME component in a popup — but
   P17C's popup/robot-drift and P17D's tag/allocation-parity work are NOT in this package; their
   absence is correct, not a gap.
2. **Automations page reworked onto the P17A field-rule model** — `FieldRulesManager.tsx` mounted
   from `src/app/(app)/automations/page.tsx`, reading active field rules and driving CRUD + apply.
   Confirm the page now manages FIELD RULES, preserves responsive layout, focus management, and
   accessibility.
3. **Additive field-rule CRUD + remembered-preference persistence** in a NEW file
   `src/lib/crdt/field-rule-mutations.ts` plus additive `context.tsx` hooks + `index.ts` re-exports.
   Confirm it REUSES P17A's `fieldRuleSchema`/validation and `nextUserPreference` (does NOT
   re-implement precedence/matching/apply/migration), and enforces rule-key uniqueness on create AND
   update.
4. **Apply-all / apply-new route ONLY through the P17A engine** (`applyFieldRulesToAllTransactions`
   / `applyFieldRulesToNewerTransactions`, via the `useApplyFieldRules` hook). Confirm NO bespoke
   re-application and NO direct transaction/allocation/alias write anywhere in the new code — every
   allocation write must remain P16C-only.

## Hard boundaries — these files MUST be byte-EMPTY in the diff (a breach is a BLOCKING finding)

`src/lib/domain/settlement.ts`; `src/lib/crdt/mutations.ts` (P16C `replaceTransactionAllocations`);
`src/lib/crdt/field-rules.ts`, `src/lib/crdt/import-commit.ts`,
`src/lib/domain/automation/{rules,apply,migration}.ts` (P17A engine); `src/lib/crdt/defaults.ts` and
`schema.ts`; `specs/008-.../spec.md`; `specs/human-scratch.md`; realtime files;
`supabase/migrations/**`; every ledger/control file. Root's pre-review checks (re-verify them
independently): settlement blob `010f3c93582a2ce311594d4dde8464760ca49c43`, P16C `mutations.ts` blob
`118e994af45b4b531bebd4bf1ed0a4a861a6b6f0` — both byte-identical to BASE.

## Type-safety / convention checks (any violation in P17B-AUTHORED code is BLOCKING)

- **No `as` / `any` / non-null `!`** in product code authored by P17B. NOTE two PRE-EXISTING casts
  are out of scope and correctly untouched — do NOT flag them: `context.tsx:818`
  (`duplicate as unknown as Transaction`, from `865a787`) and the two `as unknown as` in
  `AutomationRow.tsx` (legacy). Root already bounced and fixed the one new breach
  (`FieldRuleEditor.tsx:135` now uses an `isRuleField` type guard). Verify no other new assertion
  slipped in.
- ts-pattern is NOT a repo dependency — exhaustiveness via `switch` + `assertNever`. Money is
  integer minor units. Pure functions + immutable data; loro-mirror draft-style mutations mutate in
  place.

## Re-run EVERY gate yourself (do not trust reported counts)

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`. Report the REAL
numbers you observe. Local Supabase container is required for integration/E2E; if genuinely
unobtainable, say so precisely rather than passing unverified. Never run Playwright
`--headed/--ui/--debug/show`. Pre-existing `specs/**` `format:check` failures and pre-existing
`tests/unit/crdt/transaction-*` lint warnings on untouched files are NOT P17B's fault.

## Tests — judge honesty and coverage

Confirm the new tests genuinely exercise P17B's slice and were not weakened: field-rule CRUD
(create/update/delete) with key-uniqueness enforcement and atomic undo; remembered-preference
persistence; the editor's validation states; apply-all and apply-new invoking the P17A engine
(proving no path bypasses P16C and invalid complete-sets are rejected with zero mutation); and E2E
journeys for the Automations page (create/update/delete, apply-all, apply-new, precedence/impact
explanation, responsive + keyboard/focus + accessible). A test that asserts nothing meaningful, or
was loosened to pass, is a finding.

## Secret-safety (blocking)

Scan the diff: no vault master key, invite-fragment bearer secret, `crypto_box` secret, seed phrase,
recovery material, `SUPABASE_JWT_SECRET`, or vault plaintext in any
code/test/fixture/log/URL/evidence. Synthetic/public vectors only. Any real-material leak is a
BLOCKING finding — report to root immediately.

## Q-proposals to adjudicate as a reviewer (do not treat as blocking unless frozen text is violated)

- **Q-P17B-01:** page-level apply-new reference date = today. Confirm it routes through
  `applyNewerThan` and does not disturb import-time auto-application.
- **Q-P17B-02:** the four-mode apply-select is not persisted because the frozen P17A preference
  schema has no field for it. Confirm this is a faithful reading of the frozen schema (i.e.
  persisting it would require a schema change P17B correctly avoided), not a silently dropped
  requirement.

## Return

SendMessage to `main` with a single explicit **VERDICT: PASS** or **VERDICT: FAIL**, your real gate
counts, and — if FAIL — each blocking finding as `file:line` + why it violates frozen text or a hard
rule, ranked. If PASS, state that boundaries are byte-empty, frozen blobs intact, apply routes
through the P17A engine, allocations P16C-only, no new `as`/`any`/`!`, no secrets, and tests are
honest. Verify-not-trust cuts both ways: root will re-check your verdict against git before
integrating.
