# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implement dispatch

- **Package / revision:** P16E / 02 (FS-001 final package) — **IMPLEMENT (remediation)**
- **Role:** human_scratch_implementer, fresh instance `p16e-implementer-02`. You are NOT the
  reviewer and NOT `p16e-implementer-01`; you remediate revision 01's single blocking finding,
  commit, and hand back `ready_for_review`. You never edit any
  ledger/scratch/SCOPE/task/review/`.claude`/`.codex`.
- **Scope IDs:** FS-001 (the P16E slice). P16A–P16D are already `passed`; do not touch them.
- **Original BASE:** `191d0707f5e6dbfa5871dbddaa7318b9a14885dd` (unchanged from rev-01).
- **Pre-implementation HEAD:** `839665d8bfb124da633a7d62dd711b569c4b3af4`. The commits between the
  rev-01 product HEAD `be82ad0` and this HEAD are root ledger-only (the rev-01 CHANGES_REQUESTED
  integration); product/test state at this HEAD equals `be82ad0`. Root will review
  `191d070..<your HEAD>`.
- **Your evidence (uncommitted until root integrates):** `evidence/P16E/implementation-02.md`.
- **Prior immutable artifacts (read, do NOT edit):** `reviews/P16E-review-01.md` (the FAIL) and
  `evidence/P16E/implementation-01.md` (rev-01 evidence).

## What failed (fix EXACTLY this, nothing more)

**F-1 — a deep-linked transaction row cannot be deselected and is destroyed by a later bulk
delete.** In `src/app/(app)/transactions/page.tsx`, `selectedTransactionIds` (currently lines
239-245) unconditionally re-adds `requestedTransactionId` (the `?transaction=` deep-link param) into
the derived selection on EVERY render while the param is in the URL. The param is never cleared and
the set is not backed by real `selectedIds`, so the user's deselection has nowhere to land, and this
same set is what every bulk handler iterates (`handleBulkDelete` ~431-447, bulk
tag/status/account/notes/amount ~449-548, row-delete ~748). Reproduced: deep-link a row → its
checkbox deselect silently fails → select a second row → the bar reads "2 selected" → confirm bulk
delete → BOTH rows deleted (user data loss). With no param present, check-then-uncheck works
normally — so this is P16E-introduced, not pre-existing.

## Required behaviour for rev-02

Treat the `?transaction=` deep link as a **one-shot navigation intent**, not a permanent selection
force:

1. On arrival with `?transaction=<stableId>`, still **reveal/scroll-to/focus** that row and start it
   **selected** (the canonical §13 "View transaction" landing behaviour and the rev-01
   initial-selected state must be preserved) — but seed the row into the REAL `selectedIds` state
   ONCE, then clear the param (`router.replace` to the paramless URL) so subsequent renders derive
   selection ONLY from real `selectedIds`.
2. After that, deselecting the deep-linked row must actually deselect it (`aria-selected` flips to
   `false`), and every bulk handler must operate on the user's real current selection only.
3. Do not regress the passing rev-01 behaviour: the row must still be revealed/highlighted on
   arrival, stable-ID (not index) source navigation from the People page must still work, and no
   double-reveal or selection flicker. Guard the one-shot seed so it fires once per navigation (not
   every render, not on unrelated `selectedIds` changes).

Also fix the **non-blocking** inaccuracy at `src/components/features/people/README.md:56`: it claims
filters are cleared when the source transaction is filtered out; no such code exists — reachability
comes from filters being component state that resets on route change. Correct the sentence to
describe the actual mechanism. Behaviour is already correct; this is a doc-only wording fix.

## Hard boundaries (any violation is a review failure)

- **Only these paths may change:** `src/app/(app)/transactions/page.tsx`,
  `src/components/features/people/README.md`, and files under `tests/**`. NOTHING else.
- **EMPTY diff required** over: the settlement engine `src/lib/domain/settlement.ts` and all of
  `src/lib/**`; `src/components/features/people/settlement-view.ts` / `settlement-allocations.ts` /
  `BalanceSummary.tsx`; the entire P16D grid dir `src/components/features/transactions/`
  (byte-identical); `supabase/migrations/**`; `src/server/routers/realtime.ts`;
  `src/lib/supabase/realtime.ts`; `src/server/schemas/realtime.ts`; and any `vault_ops` path. No new
  migration. No settlement cache/persistence.
- Single-engine invariant stays intact: `calculateSettlementBalances` defined only in
  `settlement.ts`, re-exported once in `domain/index.ts`, consumed only by `BalanceSummary.tsx`.

## Required regression coverage (add to `tests/**`)

- **Deselection:** deep-link a row, then click its checkbox — assert `aria-selected` goes
  `true -> false` and the bulk bar count drops to 0.
- **Post-deselection bulk action (the data-loss path):** deep-link row t1, deselect it, select a
  different row t2, run bulk delete + confirm — assert t2 is deleted and **t1 is preserved**.
- Keep an assertion that arrival still starts the deep-linked row selected AND revealed/highlighted,
  so the one-shot seed cannot silently regress the landing behaviour.
- Re-run the full P16E E2E with retries disabled and repeated; no flakes, no P16D
  grid/keyboard/selection regression.

## Gates before handback

Run and pass `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`. The
pre-existing `specs/**` `format:check` failure on untouched files is not yours; all changed paths
must be format-clean. NEVER use `--headed/--ui/--debug/show`. No `as`/`any`/`!`. Money stays integer
minor units.

## Handback

Commit only the allowed paths, write `evidence/P16E/implementation-02.md` (uncommitted), and message
root `ready_for_review` with your final HEAD and the range `191d070..<HEAD>`. Record any genuine
ambiguity as a Q-PROPOSAL in your evidence and continue on the safest reversible choice; do not ask
the human.
