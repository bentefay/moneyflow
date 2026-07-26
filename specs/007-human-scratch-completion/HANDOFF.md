# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implement dispatch

- **Package / revision:** P17A / 01 (HS-007 automation redesign — the MODEL + DETERMINISTIC ENGINE
  slice) — **IMPLEMENT**
- **Role:** human_scratch_implementer, fresh instance `p17a-implementer-01`. You write only
  authorized product/test code and your evidence file; you never commit the evidence, never edit any
  ledger/SCOPE/QUESTIONS/RISKS/HANDOFF/scratch/canonical source, and never dispatch anyone.
- **Scope ID:** HS-007 (the P17A slice only). Full frozen text: `specs/human-scratch.md:248-295`,
  reproduced verbatim in `SCOPE.json#HS-007` — READ IT before acting. Task detail:
  `tasks/HS-007-automation-redesign.md` (your slice is the **P17A** section).
- **BASE:** `a09c4b4e2002542b742690e5be0b30bc541dd108`. Branch from and commit on top of this.
  Report your literal final HEAD.
- **Your evidence file (write, do NOT commit):** `evidence/P17A/implementation-01.md`. Root persists
  it after review.

## What P17A must deliver (engine only — NO UI)

P17A is the foundation the later slices build on. UI is explicitly OUT of scope (P17B shared editor,
P17C inline alias UX, P17D tag/allocation parity own all UI). Deliver:

1. **Typed field-specific rule model.** Replace/extend the current generic `contains`/`regex` rule
   shape with typed, field-specific EXACT-description rule keys and uniqueness: an exact immutable
   raw description string plus OPTIONAL account id and/or exact amount. Model illegal states
   unrepresentable (discriminated unions, branded ids — no raw strings for domain ids, no
   `as`/`any`/ `!`). There can be at most ONE rule per exact description text with no account/amount
   constraint; more specific rules (amount, then account, then account+amount) supersede it.
2. **Deterministic precedence engine.** For any transaction compute the single highest-precedence
   matching rule with the frozen natural precedence: unscoped < amount-scoped < account-scoped <
   account+amount-scoped. Exact raw-text match only (no fuzzy/contains). Pure, total, and
   order-independent — same inputs always yield the same winner.
3. **Date/import boundary semantics.** Define "new / newer" (greater date than the current
   transaction) with NO locale/timezone ambiguity. Use the established date library, not custom date
   math.
4. **Safe migration** of any existing generic rules into the new model without data loss; existing
   vaults hydrate correctly. Rules live in the encrypted vault/CRDT — migration is IN-CODE CRDT/loro
   schema versioning, NOT a SQL migration. `supabase/migrations/**` is expected to stay EMPTY; if
   you believe a server migration is genuinely required, STOP and return a Q-proposal instead of
   writing one (the server must never see rule plaintext).
5. **Per-user-per-vault preferences.** Remember the user's last mode/constraint choices in a new
   user preferences area of the vault. This is per-user preference state, not shared financial
   state.
6. **Application at import + explicit bulk ops.** Apply the highest matching rule deterministically
   when transactions are imported and on explicit bulk apply-all / apply-new operations. Description
   rules DO NOT apply to manually created transactions (they have no raw description text); tag
   add/set and whole-person-allocation rules DO include manual rows. Batch processing must be
   bounded, idempotent and convergent; group each logical mutation for undo (P09).
7. **Allocation rules go through P16C only.** Allocation rule values are COMPLETE EXPLICIT
   allocation sets — never effective allocations, owner-remainder, or clamped/normalized values. You
   MUST write allocations exclusively through P16C's passed validated atomic complete-set
   replacement API: validate every entry first, reject the whole invalid set with NO mutation,
   remove keys absent from a valid replacement, and never clamp/normalize or bypass validation via
   import, apply-all/new, undo/restoration or migration. Do NOT duplicate settlement/remainder logic
   — that lives in FS-001 surfaces.

## Allowed write paths (anything else → raise a Q-proposal, do not silently write)

- `src/lib/domain/automation.ts` (and a new `src/lib/domain/automation/**` if you split it)
- `src/lib/crdt/schema.ts`, `src/lib/crdt/rich-schema.ts`, `src/lib/crdt/index.ts` (rule model,
  preferences area, migration/hydration only)
- `src/hooks/use-import-state.ts` — ONLY the minimal call-site needed to apply rules at import;
  preserve all existing P14 import behavior
- `tests/unit/**`, `tests/integration/**`, `tests/e2e/**` (automation-related; extend the existing
  `tests/unit/domain/automation.test.ts`, `tests/integration/automation.test.ts`,
  `tests/integration/automation-perf.test.ts`)
- `evidence/P17A/implementation-01.md` (your evidence — write, never commit)

## Hard boundaries — these MUST be byte-EMPTY in your diff (a breach is a self-finding to report)

- `src/lib/domain/settlement.ts` and the whole settlement engine (FS-001 frozen —
  `calculateSettlementBalances` stays the sole engine; do not add a competing one or a cache)
- `specs/008-transaction-percentage-allocations-settlement/spec.md` (immutable canonical source —
  never edit)
- `specs/human-scratch.md` (scratch — never edit; markers are root-only)
- ALL P17B/C/D UI: `src/components/features/automations/**`,
  `src/components/features/transactions/AutomationDropdown.tsx`, the automations page UI, and any
  transactions/people UI
- `src/components/features/transactions/` P16D grid, the three realtime paths
  (`src/server/routers/realtime.ts`, `src/lib/supabase/realtime.ts`,
  `src/server/schemas/realtime.ts`), `supabase/migrations/**`, any `vault_ops`
- Every ledger/control file (PROGRESS, SCOPE.json, QUESTIONS, RISKS, HANDOFF, tasks, FINAL-AUDIT) —
  root-only

## Tests (TDD — establish RED honestly, then GREEN in product code)

- Property/table tests: key uniqueness, precedence winner, exact matching, boundary dates, tag
  set/add, allocation complete-sets, manual-vs-imported eligibility, idempotence, migration.
- Integration: import application, per-user preferences, atomic undo, delete/update, bulk/new,
  invalid complete-set REJECTION (no mutation), removal of absent keys, and PROOF that no
  automation/import/undo path bypasses the P16C API.
- Establish RED by writing the failing test against the real defect first; make GREEN corrections in
  product code only — never weaken a test to fake a pass. Use established libraries (dates, parsing)
  — custom algorithm implementations are bugs.

## Gates (run ALL, report real counts — do not estimate)

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`. A local Supabase
container is required for integration/E2E; if genuinely unobtainable, say so precisely rather than
reporting unverified passes. Never use Playwright `--headed/--ui/--debug/show`. The pre-existing
`specs/**` `format:check` failure on untouched files is not attributable to you.

## Secret-safety (blocking)

No vault master key, invite-fragment bearer secret, `crypto_box` secret material, seed phrase,
recovery material, `SUPABASE_JWT_SECRET`, or vault plaintext in any code, test, fixture, log, URL or
your evidence. Rules and preferences are vault data — keep them encrypted; the server never sees
rule plaintext. Tests use synthetic/public vectors only. Any real-material leak is a blocking
finding — stop and report it.

## Questions / risks

Do NOT invent final architecture or user-facing wording. The frozen text has known ambiguities
(duplicate numbered select copy "1. updating all 2. updating new 3. update all 4. update new",
date-boundary/timezone, migration strategy, undo batch size, performance). Where the frozen text is
ambiguous, pick the SAFEST REVERSIBLE default, implement it, and return a complete Q-proposal (with
evidence and the reversible default you chose) in your evidence file for root to transcribe — then
keep going. Do not pause.

## When done

Commit only authorized product/test changes on top of BASE `a09c4b4`. Write
`evidence/P17A/implementation-01.md` (do NOT commit it) covering: what you built, the RED→GREEN
story, every gate's real result, the exact allowed paths you touched, confirmation the hard
boundaries are byte-empty, proof allocations only ever route through the P16C API, and any
Q-proposals/risks. Then SendMessage to `main` with your literal final HEAD, the paths you changed,
and your gate results.
