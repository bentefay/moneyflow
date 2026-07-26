# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implement dispatch (P17B / 01 — shared rule editor + automations-page UX)

- **Package / revision:** P17B / 01 (HS-007 — shared management editor) — **IMPLEMENT**
- **Role:** human_scratch_implementer, fresh instance `p17b-implementer-01`. You write only
  authorized product/test code and your evidence file; you never commit the evidence, never edit any
  ledger/SCOPE/QUESTIONS/RISKS/HANDOFF/scratch/canonical source, and never dispatch anyone.
- **CRITICAL — git discipline:** the working tree is already at the integrated HEAD on branch
  `main`. Do NOT `git checkout`, `git switch`, `git reset`, or create/switch branches. Commit
  directly on top of the CURRENT `HEAD`. BASE `5e2ddd0` is the review-range start — reference only,
  never check it out.
- **Scope ID:** HS-007 (P17B slice). Frozen text: `specs/human-scratch.md:248-295` (read the whole
  block — it defines exact-description rules, the four modes, optional amount/account constraints,
  apply-for-all vs apply-for-new, precedence, and the manual-vs-imported distinction). Task detail:
  `tasks/HS-007-automation-redesign.md` **P17B — Shared management editor** section.
- **Your evidence file (write, do NOT commit):** `evidence/P17B/implementation-01.md`.

## What P17B must deliver

1. **One shared, accessible rule editor** that is genuinely reused (a single component, not two
   copies) — it powers the Automations page NOW and is structured so P17C can mount the SAME editor
   in a contextual popup later. It must cover: the field selector, optional amount and/or account
   constraints, the four modes, the value(s), inline validation, delete, apply-all and apply-new
   actions. Explain precedence and impact clearly (which rule wins, and what apply-all vs apply-new
   will change). Preserve the established page's responsive layout, focus management and
   accessibility.
2. **Rework the existing pre-redesign automations UI onto the P17A field-rule model.** The current
   `src/components/features/automations/{ActionEditor,ConditionEditor,AutomationRow,AutomationsTable}.tsx`
   and `src/app/(app)/automations/page.tsx` are the OLD generic-rule UI — rework/replace them so the
   Automations page manages FIELD RULES (from `readActiveFieldRules`), using the P17A types.
3. **Add the thin field-rule CRUD + remembered-preference persistence the editor needs** — P17A
   deliberately shipped none. Add, ADDITIVELY, vault write actions to create / update / delete a
   field rule and to persist a user's remembered choice, in NEW files under `src/lib/crdt/**` (e.g.
   `field-rule-mutations.ts`) plus their `context.tsx` hooks and `index.ts` re-exports. REUSE P17A's
   `fieldRuleSchema` + validation and `nextUserPreference`
   (`src/lib/domain/automation/preferences.ts`) — do not re-implement precedence, matching, apply,
   or migration. Enforce key uniqueness on create/ update exactly as the model requires. Do NOT
   modify `field-rules.ts`, `import-commit.ts`, the automation domain apply/migration code, or P16C
   — call them, don't change them. Put new mutations in a NEW file so `src/lib/crdt/mutations.ts`
   (which holds P16C `replaceTransactionAllocations`) stays byte-identical.
4. **Apply-all / apply-new actions** from the editor call the EXISTING P17A engine
   (`applyFieldRulesToAllTransactions` / `applyFieldRulesToNewerTransactions`) — never a bespoke
   re-application, never a direct allocation-map write. Any allocation write remains P16C-only.

## Allowed write paths (anything else → raise a Q-proposal; do NOT silently write)

- `src/components/features/automations/**` (the shared editor + reworked page components)
- `src/app/(app)/automations/page.tsx`
- `src/components/ui/**` ONLY if you must add a shadcn primitive the editor needs — prefer reusing
  existing primitives; if you add one, note it in evidence.
- `src/lib/crdt/**` — ADDITIVE only: a NEW file for field-rule CRUD + preference-persist mutations,
  plus additive `context.tsx` hooks and `index.ts` re-exports. You MUST NOT modify `field-rules.ts`,
  `import-commit.ts`, `mutations.ts`, `defaults.ts`/`schema.ts` beyond what genuinely requires
  additive change (if a schema/default change seems needed, prefer none and raise a Q).
- `src/hooks/**` (UI state only, if needed)
- `tests/unit/**`, `tests/integration/**`, `tests/e2e/**`
- `evidence/P17B/implementation-01.md` (write, never commit)

## Hard boundaries — MUST be byte-EMPTY in your diff (a breach is a self-finding to report)

- `src/lib/domain/settlement.ts` and all settlement/remainder logic; `src/lib/crdt/mutations.ts`
  P16C `replaceTransactionAllocations`; `src/lib/crdt/field-rules.ts`,
  `src/lib/crdt/import-commit.ts`, and `src/lib/domain/automation/{rules,migration,apply}.ts` (P17A
  engine — call, don't edit).
- `specs/008-.../spec.md` and `specs/human-scratch.md` (never edit).
- The P17C inline/popup workflow and P17D tag/allocation-parity work are NOT this package. You build
  the editor so it CAN be reused in a popup, but you do not build the popup, the robot drift state,
  or the tag/allocation-parity surfaces here.
- The three realtime files, `supabase/migrations/**`, any `vault_ops`. Every ledger/control file.

## Rules / questions

- **Do NOT invent final wording or architecture.** Where the frozen text leaves labels, copy, or a
  design choice open (duplicate-rule naming, destructive-bulk confirmation copy,
  precedence-explainer wording, etc.), pick the SAFEST REVERSIBLE default, implement it, and record
  a complete Q-proposal (evidence + the default you chose) in your evidence file — do not pause.
- No `as`/`any`/`!`; ts-pattern is NOT a repo dependency — use `switch` + `assertNever`. Money is
  integer minor units. Match the conventions of the files you rework. Favour pure functions +
  immutable data; loro-mirror draft-style mutations mutate in place.

## Tests (TDD — RED honestly, GREEN in product only)

Cover P17B's slice: field-rule CRUD (create/update/delete) with key-uniqueness enforcement and
atomic undo; remembered-preference persistence; the editor's validation states; apply-all and
apply-new invoking the P17A engine (proving no path bypasses P16C and invalid complete-sets are
rejected with zero mutation); and E2E journeys for the Automations page — create/update/delete a
rule, apply-all, apply-new, the precedence/impact explanation, responsive + keyboard/focus +
accessible. Establish RED first; never weaken a test. Use established libraries. No-retry, no
flakiness.

## Gates (run ALL, report REAL counts)

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`. Local Supabase
container required for integration/E2E; if genuinely unobtainable, say so precisely rather than
reporting unverified passes. Never use Playwright `--headed/--ui/--debug/show`. Pre-existing
`specs/**` `format:check` failures on untouched docs are not yours.

## Secret-safety (blocking)

No vault master key, invite-fragment bearer secret, `crypto_box` secret, seed phrase, recovery
material, `SUPABASE_JWT_SECRET`, or vault plaintext in any code/test/fixture/log/URL/evidence.
Synthetic/public vectors only. Any real-material leak: stop and report it.

## When done

Commit only authorized product/test changes on top of the CURRENT HEAD (no branch/checkout games).
Write `evidence/P17B/implementation-01.md` (do NOT commit) covering: the shared-editor design and
how it stays reusable for P17C, the reworked page, the additive CRUD/preference mutations (which new
files, reusing which P17A APIs), the RED→GREEN story, every gate's real result, exact paths touched,
confirmation the hard boundaries are byte-empty, proof apply-all/apply-new route through the P17A
engine and allocations stay P16C-only, and any Q-proposals. Then SendMessage to `main` with your
literal final HEAD, the paths you changed, and your gate results.
