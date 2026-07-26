# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implement dispatch (P17A / 01 — CONTINUATION)

- **Package / revision:** P17A / 01 (HS-007 automation redesign — MODEL + ENGINE) — **IMPLEMENT
  (continuation of rev 01)**
- **Role:** human_scratch_implementer, fresh instance `p17a-implementer-01b`. You continue and
  COMPLETE rev-01. You write only authorized product/test code and your evidence file; you never
  commit the evidence, never edit any ledger/SCOPE/QUESTIONS/RISKS/HANDOFF/scratch/canonical source,
  and never dispatch anyone.
- **CRITICAL — git discipline:** The working tree is already checked out at the integrated product
  HEAD on branch `main`. **Do NOT `git checkout`, `git switch`, `git reset`, or create a branch from
  any other sha.** Commit your changes directly on top of the CURRENT `HEAD` on the current branch.
  (The prior rev-01 attempt broke itself by checking out an old BASE — do not repeat that.)
- **Scope ID:** HS-007 (P17A slice). Full frozen text: `specs/human-scratch.md:248-295` =
  `SCOPE.json#HS-007`. Task detail: `tasks/HS-007-automation-redesign.md` (**P17A** section).
- **Review-range BASE (for reference only — do NOT check it out):**
  `a09c4b4e2002542b742690e5be0b30bc541dd108`. Report your literal final HEAD when done.
- **Your evidence file (write, do NOT commit):** UPDATE `evidence/P17A/implementation-01.md` so it
  describes the COMPLETE rev-01 deliverable (rev-01 core + this continuation).

## What rev-01 already delivered (present in the tree — build ON it, do not redo)

A tested pure core: `src/lib/domain/automation/{rules,migration,apply,preferences}.ts`, wire schemas
`fieldRuleSchema` + `userAutomationPreferenceSchema` in `src/lib/crdt/schema.ts`, and 51 tests. The
precedence engine, exact matcher, date-boundary semantics, per-user preference model, legacy
migration, and allocation-application-via-P16C are DONE and green. Do not rewrite them; wire them
in.

## What this continuation MUST complete (the four deferred seams — root ruled all IN scope)

1. **Vault root wiring (Q-034).** Register the field-rule and per-user-preference collections as
   `vaultSchema` root keys in `src/lib/crdt/schema.ts` (replace the deferral NOTE at ~lines 416-421)
   and seed the matching empty defaults in `src/lib/crdt/defaults.ts` (`getDefaultVaultState` /
   `initializeVaultDefaults`). Existing vaults must hydrate without loss.
2. **Migration at hydration (Q-035).** Invoke `migration.ts` at the vault hydration/initialization
   path so existing generic rules migrate exactly once, safely, idempotently. Migration is IN-CODE
   CRDT versioning — `supabase/migrations/**` MUST stay byte-empty (the server never sees rule
   plaintext); if you think a SQL migration is needed, STOP and raise a Q instead.
3. **Application at import + explicit bulk ops (Q-035).** Invoke `apply.ts` at the import-commit
   seam (`src/hooks/use-import-state.ts` and the vault import-commit path) and on explicit bulk
   apply-all / apply-new. Description rules skip manual rows; tag add/set and whole-allocation rules
   include them. Application must be bounded, idempotent and convergent; group each logical mutation
   for undo (P09). Allocations go ONLY through P16C `replaceTransactionAllocations` — never write
   allocation keys directly, never clamp/normalize, never bypass validation.
4. **Description-alias rule write via P11 (Q-036).** When a description-alias rule matches at
   import, set the alias by reusing the EXISTING P11 write path in
   `src/lib/crdt/description-aliases.ts` additively (P17A owns the rule-driven trigger; P11 owns the
   mechanics). Preserve all existing P11 behavior — any behavior change to P11 code is a finding:
   raise a Q instead.

## Allowed write paths (anything else → raise a Q-proposal; do NOT silently write)

- `src/lib/domain/automation/**` (extend rev-01 core as needed)
- `src/lib/crdt/**` — ADDITIVE wiring only: `schema.ts` (root keys), `defaults.ts` (seed),
  `index.ts` (exports), migration/hydration path, and `description-aliases.ts` (additive alias-rule
  invocation only). You may CALL P16C `replaceTransactionAllocations` but MUST NOT modify it, the
  allocation/complete-set validation, or any settlement code. Preserve every other package's
  existing vault behavior byte-for-byte.
- `src/hooks/use-import-state.ts` — minimal call-site to apply rules at import; preserve all
  existing P14 import behavior.
- `tests/unit/**`, `tests/integration/**`, `tests/e2e/**`
- `evidence/P17A/implementation-01.md` (write, never commit)

## Hard boundaries — MUST be byte-EMPTY in your diff (a breach is a self-finding to report)

- `src/lib/domain/settlement.ts` and all settlement/remainder logic (FS-001 frozen —
  `calculateSettlementBalances` stays the sole engine; no competing engine, no cache). P16C's
  allocation complete-set API stays byte-identical.
- `specs/008-transaction-percentage-allocations-settlement/spec.md` and `specs/human-scratch.md`
  (never edit)
- ALL P17B/C/D UI: `src/components/features/automations/**`,
  `src/components/features/transactions/AutomationDropdown.tsx`, the automations page UI, and any
  transactions/people UI. This continuation adds NO UI.
- The P16D grid `src/components/features/transactions/`, the three realtime paths
  (`src/server/routers/realtime.ts`, `src/lib/supabase/realtime.ts`,
  `src/server/schemas/realtime.ts`), `supabase/migrations/**`, any `vault_ops`
- Every ledger/control file (PROGRESS, SCOPE.json, QUESTIONS, RISKS, HANDOFF, tasks, FINAL-AUDIT) —
  root-only

## Tests (TDD — RED honestly, GREEN in product only)

Extend the rev-01 suites. Add integration coverage that PROVES the wiring: an imported transaction
gets the highest-precedence rule applied; an existing vault migrates once and idempotently on
re-hydration; preferences persist per user; bulk apply-all/apply-new works; description rules skip
manual rows while tag/allocation rules include them; invalid complete-set is rejected with no
mutation and absent keys removed; and NO automation/import/undo path bypasses the P16C API.
Establish RED against the real gap first; never weaken a test to fake a pass. Use established
libraries.

## Gates (run ALL, report REAL counts)

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`. Local Supabase
container required for integration/E2E; if genuinely unobtainable, say so precisely rather than
reporting unverified passes. Never use Playwright `--headed/--ui/--debug/show`. The pre-existing
`specs/**` `format:check` failure on untouched files is not yours.

## Secret-safety (blocking)

No vault master key, invite-fragment bearer secret, `crypto_box` secret, seed phrase, recovery
material, `SUPABASE_JWT_SECRET`, or vault plaintext in any code/test/fixture/log/URL/evidence. Rules
and preferences are encrypted vault data — the server never sees rule plaintext. Synthetic/public
vectors only. Any real-material leak: stop and report it.

## Questions / risks

Do NOT invent final architecture or user-facing wording. Where the frozen text is ambiguous, pick
the SAFEST REVERSIBLE default, implement it, record a complete Q-proposal (evidence + the default
you chose) in your evidence file, and keep going — do not pause. Q-034..Q-037 are already ruled (see
QUESTIONS.md); honor those rulings.

## When done

Commit only authorized product/test changes on top of the CURRENT HEAD (no branch/checkout games).
Update `evidence/P17A/implementation-01.md` (do NOT commit it) to cover the full rev-01 deliverable:
what you wired, the RED→GREEN story, every gate's real result, the exact paths you touched,
confirmation the hard boundaries are byte-empty, proof allocations route only through P16C and P11
alias behavior is preserved, and any Q-proposals/risks. Then SendMessage to `main` with your literal
final HEAD, the paths you changed, and your gate results.
