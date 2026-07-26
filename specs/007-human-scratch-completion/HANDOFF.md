# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P16E / 01
- **Scope IDs:** FS-001 (the P16E slice ONLY). P16A–P16D are already `passed`; do NOT redo or
  refactor their delivered work. Deliver P16E's People-page settlement experience, traceability,
  named example coverage and integrated hardening.
- **State:** implementing.
- **Binding task:** `tasks/FS-001-transaction-percentage-allocations-settlement.md` — the **P16E**
  section (lines 162-191), its acceptance block, and the **evidence ownership** bullet for P16E
  (lines 224-227). The ENTIRE canonical source
  `specs/008-transaction-percentage-allocations-settlement/spec.md` (715 lines, SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`) is binding — read it fully
  before coding. P16E-critical sections: **§7 Examples A–H** (lines 274-376), **§12 Settlement
  result model** (518-545), **§13 People-page settlement experience** (545-575), **§14 Performance**
  (575-588), **§15.3 E2E journeys** (635-670), **§17 Definition of done** (688-715). The canonical
  source wins over this task, older specs, existing behavior or old tests; a deviation is a Q
  proposal, never a silent change.
- **Build BASE:** `191d0707f5e6dbfa5871dbddaa7318b9a14885dd` (current HEAD — all P16A–D allocation
  work, P08 people/member work and P11C alias flows are IN this tree). Root will review
  `191d070..HEAD`.
- **Sole implementer artifact:** `evidence/P16E/implementation-01.md` (create it; leave it
  UNCOMMITTED — root persists it on integration).
- **Future immutable review artifact:** `reviews/P16E-review-01.md` (root/reviewer only; do not
  create it).

## Build ON these already-PASSED contracts (consume; do NOT duplicate or re-implement)

- **P16B canonical engine — the ONLY settlement engine.** `src/lib/domain/settlement.ts` is the sole
  production settlement engine and returns the structured result (obligations by currency,
  per-person net positions by currency, source-transaction contributions, typed calculation issues).
  P16E MUST consume this structured result. Do NOT add, fork, clone or shadow a second settlement
  engine and do NOT persist a settlement cache — Loro history is the allocation version record.
- **P16A primitives.** Allocation/ownership schemas, owner remainder and exact signed-minor-unit
  apportionment. Do not recompute shares with binary floating point.
- **P16C mutation APIs.** All allocation writes go through the central validated set/remove/
  complete-set APIs. P16E is read/display-centric for settlement; if it triggers any allocation
  write it must route through these APIs — never cast or write around validation.
- **P16D real grid.** `src/components/features/transactions/allocation-columns.ts`,
  `cells/PersonAllocationCell.tsx`, `TransactionTable.tsx`/`TransactionRow.tsx`,
  `transactions/page.tsx`. The virtualized per-Person allocation grid, add-row allocations and
  historical/missing-Person columns already exist and are `passed`. "View transaction" navigation
  (below) targets this grid; do NOT regress its virtualization, focus, presence or alignment.

## What P16E MUST deliver (acceptance)

1. **People-page obligations by currency.** Replace the People summary
   (`src/components/features/people/BalanceSummary.tsx`, mounted from
   `src/app/(app)/people/page.tsx`) with the canonical obligations rendered in SEPARATE per-currency
   sections. Show debtor/creditor names, correctly formatted POSITIVE amounts, and highlight the
   current linked Person. NEVER produce or display a combined cross-currency total.
2. **Expand to contributing transactions + source navigation.** Each obligation expands to its
   contributing transactions: date, resolved description/alias, account, signed contribution and the
   relevant explicit/effective allocations. A "View transaction" affordance opens Transactions and
   focuses/filters the stable source transaction ID (route through the existing grid; use the stable
   ID, not an index).
3. **Distinct settlement states.** "Everyone settled" ONLY when there are no obligations AND no
   issues; a neutral no-qualifying-paid state; a prominent "Settlement incomplete" state with
   affected count and reasons whenever typed issues exist; multiple-currency layout; and
   deleted/unknown People shown by stable label. Never falsely say everyone is settled when data is
   invalid or incomplete.
4. **Integrated hardening.** Memoize derived columns/lookups/results; settlement is never persisted
   as a cache. Update affected repository documentation (`.claude/` docs and any People/settlement
   READMEs touched).

## Mandatory test coverage (acceptance — no substitutes)

- **Named E2E for EACH canonical example A–H** (§7, lines 274-376) against the PRODUCTION settlement
  path. All eight are individually mandatory in E2E; no general journey, combined example or manual
  observation substitutes for any one. (P16B already owns the unit/property expectation per example;
  P16E owns the E2E expectation per example.)
- **The mandatory 12-step end-to-end journey** (task lines 182-184 / §15.3): create/unlock, add Bob,
  default Me ownership, paid -$100, real-grid 50/50, assert Bob owes Me $50, expand source, navigate
  back, reload, non-paid removal, restore, negative reversal, and invalid/paste/decimal/edit
  semantics.
- **Additional E2E/manual matrices:** add row, imported edit, joint ownership, multiple currency,
  historical Person, invalid warnings, collaboration sync, keyboard, responsive/horizontal scroll,
  dark/reduced-motion, deterministic accessibility (role/name/state), console/network clean, and
  repeated retries-disabled runs.
- **Production benchmark evidence** for the feature performance target is linked (near-linear
  engine; <100ms allocation interaction; preserved virtualization; 100k benchmark per §14). If the
  100k benchmark cannot hit target in a production build, report measured numbers and a documented
  follow-up — never claim the target passed.

## Allowed changes

- `src/components/features/people/**` (obligations UI, states, expand/navigation), the People route
  `src/app/(app)/people/page.tsx`, and the minimal glue needed to open+focus a source transaction in
  the existing Transactions grid.
- Read-only CONSUMPTION of `src/lib/domain/settlement.ts` and P16A/P16C APIs. Touch `settlement.ts`
  ONLY for a genuine bug in the canonical result surface that P16E needs, and justify it explicitly
  in evidence for reviewer scrutiny — do not add features or a second code path.
- `tests/unit/**`, `tests/integration/**`, `tests/e2e/**` for the coverage above.
- Repository documentation directly affected by the People/settlement experience.
- TRACE every route yourself and justify each touched path in evidence. Any path outside the
  People/settlement-display domain must be called out explicitly for reviewer scrutiny, not silently
  included.

## Preserve unchanged (do NOT touch) — HARD boundary

- The P16B settlement engine SEMANTICS and the single-engine invariant. No competing/duplicate
  settlement implementation; no settlement cache/persistence; no plaintext/server audit storage.
- P16A apportionment, P16C mutation/validation APIs, and the P16D grid's virtualization/focus/
  presence/alignment — consume them, do not rewrite them.
- The P04 database/RLS boundary and P05 realtime pubkey-hash authorization boundary
  (`src/server/routers/realtime.ts`, `src/lib/supabase/realtime.ts`, `vault_ops` scoping). **No
  `vault_ops` schema change and no new migration** — verify your diff over `supabase/migrations/**`
  and those files is EMPTY unless a canonical clause forces a migration, in which case STOP and file
  a Q proposal first.
- All unrelated feature surfaces (invite/member UX, aliases, undo, GC, import, passkeys, marketing).
  No scope widening beyond the P16E slice of FS-001. Never silently normalize, clamp, delete or
  rewrite explicit allocations or invalid data — surface typed issues.

## Forbidden writes

- Ledgers (`PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, `HANDOFF.md`, `DECISIONS.md`), scratch
  `specs/human-scratch.md`, `SCOPE.json`, the canonical FS-001 source `specs/008-.../spec.md`,
  `tasks/**`, any `reviews/**` file, `.codex/**`. Root alone writes those. Never `git add .` /
  `git add -A`; stage only exact authorized `src/`/`tests/`/doc paths and your own evidence is left
  UNCOMMITTED.

## Secret-safety (blocking)

- No vault master key, invite-fragment bearer secret, `crypto_box` secret material, seed phrase,
  recovery material, `SUPABASE_JWT_SECRET` or vault plaintext in logs, URLs, query strings,
  analytics, fixtures, evidence or review. Tests use public vectors / synthetic material only. Any
  real-material leak is a blocking finding reported to root immediately.

## Formatting hazard (Q-024)

- Do NOT run bare `pnpm format` from the repo root — it rewrites frozen `specs/human-scratch.md` and
  root ledgers. Format only your exact changed `src/`/`tests/` paths (e.g.
  `pnpm exec oxfmt src/... tests/...`), run `git status` before every commit, and `git checkout` any
  `specs/**` change you did not intend. `pnpm format:check` failing on `specs/**` is pre-existing
  and not attributable to you.

## Method & gates

- Notes first in `evidence/P16E/implementation-01.md` (uncommitted). Practice test-first: add the
  example-A–H E2E expectations and the 12-step journey RED, then implement the obligations UI to
  make them GREEN. Run the full gate
  `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e` (the pre-existing
  `specs/**` format failure is not attributable). Run E2E with retries DISABLED and repeated. Never
  use `--headed/--ui/--debug/show`. A local Supabase container is required for the integration/E2E
  tests; if it is genuinely unobtainable, record a `blocked_external` proposal naming the exact
  missing capability rather than faking evidence.

## Q-proposals

- Place any `Q-*` proposal in `evidence/P16E/implementation-01.md` and continue with the safest
  reversible, data-preserving choice. Root alone transcribes `QUESTIONS.md`. Never weaken an
  explicit canonical clause through a default.

## Hand back

- When GREEN with all gates passing, message root `ready_for_review` with: final HEAD, exact changed
  paths (each justified; any out-of-domain path flagged), full test counts, and specifically: how
  the People page renders canonical obligations in per-currency sections with NO cross-currency
  total; how each obligation expands to source-transaction contributions and how "View transaction"
  focuses the stable source ID in the grid; the exact distinct-state behavior (settled vs neutral vs
  Settlement-incomplete-with-count vs multi-currency vs deleted/unknown labels); the named E2E for
  EACH example A–H and the 12-step journey (with the assertions that make each RED→GREEN); the
  additional matrices; the memoization/no-cache posture; and the linked production benchmark
  numbers. Confirm the single-engine invariant holds (no second settlement engine, no cache), an
  EMPTY diff over the `vault_ops`/migration/P04/P05 boundary, and no secret/fragment leak. Do not
  edit any ledger or mark the requirement.
