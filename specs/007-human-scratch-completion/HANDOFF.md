# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implement dispatch (P17A / 01 — CONTINUATION 2: wire application at the PRODUCTION import commit)

- **Package / revision:** P17A / 01 (HS-007 automation redesign — MODEL + ENGINE) — **IMPLEMENT
  (second continuation of rev 01)**
- **Role:** human_scratch_implementer, fresh instance `p17a-implementer-01c`. You write only
  authorized product/test code and your evidence file; you never commit the evidence, never edit any
  ledger/SCOPE/QUESTIONS/RISKS/HANDOFF/scratch/canonical source, and never dispatch anyone.
- **CRITICAL — git discipline:** The working tree is already at the integrated product HEAD on
  branch `main`. **Do NOT `git checkout`, `git switch`, `git reset`, or create/switch branches.**
  Commit directly on top of the CURRENT `HEAD`. (A prior attempt broke itself by checking out an old
  BASE — do not repeat that.)
- **Scope ID:** HS-007 (P17A slice). Frozen text: `specs/human-scratch.md:248-295` (esp. lines ~272
  and ~287: a created rule "will run for newly imported transactions" / rules "apply to new
  imports"). Task detail: `tasks/HS-007-automation-redesign.md` (**P17A** section: "Apply the
  highest rule deterministically **at import** and explicit bulk operations"; test list requires
  "Integration for import application").
- **Review-range BASE (reference only — do NOT check it out):** `a09c4b4`. Report your literal final
  HEAD when done.
- **Your evidence file (write, do NOT commit):** UPDATE `evidence/P17A/implementation-01.md` so it
  covers the COMPLETE rev-01 deliverable including this production-import wiring.

## Why this continuation exists (an independent adjudicator ruling — not optional)

The prior continuation delivered the field-rule model, exact matcher, precedence, per-user
preferences, hydration-time migration, and a working application library
(`src/lib/crdt/field-rules.ts` — `applyFieldRulesToImport` + bulk apply-all/apply-newer), all tested
and green. BUT `applyFieldRulesToImport` is invoked NOWHERE: the production import commit
`createImportBatch` in `src/app/(app)/imports/new/page.tsx` inserts transactions without applying
any rule. A distinct opus-tier scope adjudicator ruled (Q-038, high confidence) that applying rules
at the real import event is P17A's COMMITTED scope — so it must be wired before P17A can pass.

## What this continuation MUST complete

1. **Invoke rule application at the production import commit.** Wire `applyFieldRulesToImport` (and
   the migration-verified engine) into `createImportBatch` (`src/app/(app)/imports/new/page.tsx`) so
   that when a user commits an import, the highest-precedence field rule is applied
   deterministically to each imported transaction. Preserve ALL existing P14 import behavior;
   application is additive and must be bounded, idempotent, and convergent; group the mutation for
   undo (P09).
2. **Resolve the description-alias write barrier additively.**
   `ApplicationVaultState = Omit<VaultState,"descriptionAliases">` (`src/lib/crdt/context.tsx:182`)
   means the import-commit mutate updater cannot write `descriptionAliases` directly. Do NOT hack
   around it by casting. Reuse the EXISTING P11 alias-write path the app already uses for
   description aliases (find how aliases are assigned today — `src/lib/crdt/description-aliases.ts`
   `assignDescriptionAlias` and its real call-site/vault-action) and route description-rule
   application through that same path. If — and only if — no existing path can set an alias from the
   import seam, make a MINIMAL, ADDITIVE adjustment to the vault-action/context boundary (e.g.
   expose a full-`VaultState` action for this write) WITHOUT weakening the existing
   `ApplicationVaultState` projection for other callers, and record a Q-proposal explaining exactly
   what you changed and why. Never change P11's alias semantics; any behavior change to P11 code is
   a finding — raise a Q instead.
3. **Keep allocations on P16C.** Any allocation-setting rule applied at import writes ONLY through
   P16C `replaceTransactionAllocations` (complete explicit set, validated). Never write allocation
   keys directly, never clamp/normalize/bypass, never modify that API.

## Allowed write paths (anything else → raise a Q-proposal; do NOT silently write)

- `src/app/(app)/imports/new/page.tsx` — **ONLY** the minimal call-site that invokes rule
  application at import commit. Add NO automation UI here (no rule editor, dropdown, inline
  proposal, robot state — those are P17B/C/D).
- `src/lib/crdt/**` — additive engine/wiring only: `field-rules.ts`, `index.ts`,
  `description-aliases.ts` (additive alias-rule invocation only), and — only if unavoidable per item
  2 — a minimal additive vault-action/context seam in `context.tsx`. You may CALL P16C
  `replaceTransactionAllocations` and P11 `assignDescriptionAlias` but MUST NOT modify them.
- `src/lib/domain/automation/**` (extend the engine if genuinely needed)
- `src/hooks/**` (only if the import commit routes through a hook you must extend additively)
- `tests/unit/**`, `tests/integration/**`, `tests/e2e/**`
- `evidence/P17A/implementation-01.md` (write, never commit)

## Hard boundaries — MUST be byte-EMPTY in your diff (a breach is a self-finding to report)

- `src/lib/domain/settlement.ts` and all settlement/remainder logic (FS-001 frozen). P16C's
  allocation complete-set API (`src/lib/crdt/mutations.ts` `replaceTransactionAllocations`) stays
  byte-identical.
- `specs/008-.../spec.md` and `specs/human-scratch.md` (never edit).
- ALL automation UI: `src/components/features/automations/**`, `AutomationDropdown.tsx`, the
  automations page, and any transactions/people UI beyond the single import-commit call-site above.
- The three realtime paths, `supabase/migrations/**` (MUST stay byte-empty — rules live in the
  encrypted vault; if you think SQL is needed, STOP and raise a Q), any `vault_ops`.
- Every ledger/control file (PROGRESS, SCOPE.json, QUESTIONS, RISKS, HANDOFF, tasks, FINAL-AUDIT).

## Tests (TDD — RED honestly, GREEN in product only)

Add an E2E and/or integration test that PROVES a real import applies rules end-to-end: import a
batch containing a transaction whose exact description matches a field rule → after commit the
transaction has the rule's field set (description alias set via the P11 back-map, tag added, or
allocations replaced via P16C — as applicable); a manual row is skipped for description rules but
included for tag/allocation rules; an invalid allocation complete-set is rejected with zero
mutation; no import/undo path bypasses P16C. Establish RED against the current gap (import applies
nothing) first; GREEN only by wiring product. Never weaken a test. Use established libraries.

## Gates (run ALL, report REAL counts)

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`. Local Supabase
container required for integration/E2E; if genuinely unobtainable, say so precisely rather than
reporting unverified passes. Never use Playwright `--headed/--ui/--debug/show`. The pre-existing
`specs/**` `format:check` failures on untouched files are not yours.

## Secret-safety (blocking)

No vault master key, invite-fragment bearer secret, `crypto_box` secret, seed phrase, recovery
material, `SUPABASE_JWT_SECRET`, or vault plaintext in any code/test/fixture/log/URL/evidence. Rules
and preferences are encrypted vault data — the server never sees rule plaintext. Synthetic/public
vectors only. Any real-material leak: stop and report it.

## Questions / risks

Where frozen text is ambiguous, pick the SAFEST REVERSIBLE default, implement it, record a complete
Q-proposal in your evidence file, and keep going — do not pause. Q-034..Q-039 are already ruled/
recorded; honor them (esp. Q-038 IN_P17A, Q-039 manual-row = `importId == null`).

## When done

Commit only authorized product/test changes on top of the CURRENT HEAD (no branch/checkout games).
Update `evidence/P17A/implementation-01.md` (do NOT commit) to cover the full rev-01 deliverable:
the import-commit wiring, how you resolved the alias-write barrier (which existing path you reused,
or the minimal additive seam + its Q), the RED→GREEN story, every gate's real result, exact paths
touched, confirmation the hard boundaries are byte-empty, and proof allocations route only through
P16C and P11 alias behavior is preserved. Then SendMessage to `main` with your literal final HEAD,
the paths you changed, and your gate results.
