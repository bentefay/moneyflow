# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Review dispatch

- **Package / revision:** P16E / 02 (FS-001 final package) — **REVIEW**
- **Role:** human_scratch_reviewer, fresh instance `p16e-reviewer-02`. You are DISTINCT from
  `p16e-implementer-02` (the rev-02 implementer) AND from `p16e-reviewer-01` (the rev-01 reviewer).
  You reproduce and verify; you never accept the implementer's claims on trust; you never commit
  product/test code or edit any ledger.
- **Scope IDs:** FS-001 (the P16E slice). P16A–P16D are already `passed`; confirm only that P16E did
  not regress or duplicate them.
- **Review range:**
  `191d0707f5e6dbfa5871dbddaa7318b9a14885dd..bb12e0c86e0a42ec682ab7a67df5b1a355084559`. This is the
  FULL cumulative P16E work (rev-01 product `be82ad0` + the rev-02 fix `bb12e0c`), with root ledger
  commits interleaved (`1712d29`, `d5733e1`, `839665d`, `d79a630` — ignore them). The rev-02 delta
  is exactly one product commit `bb12e0c` "fix(P16E): make the View transaction deep link a one-shot
  navigation intent". Run `git diff --stat 191d070..bb12e0c` and
  `git diff --name-status d79a630..bb12e0c` yourself.
- **Evidence to review (frozen, do NOT edit):** `evidence/P16E/implementation-02.md` (rev-02) and,
  for context, `evidence/P16E/implementation-01.md` (rev-01) + the immutable rev-01 FAIL
  `reviews/P16E-review-01.md`.
- **Your immutable verdict artifact:** `reviews/P16E-review-02.md` (create it; do NOT commit — root
  persists it). Start with a single line `VERDICT: PASS` or `VERDICT: CHANGES_REQUESTED`.

## What rev-02 had to fix (the ONLY thing that changed)

Rev-01 passed everything EXCEPT one blocking finding, **F-1**: in
`src/app/(app)/transactions/page.tsx`, `selectedTransactionIds` force-added the `?transaction=`
deep-link id on every render, so a deep-linked row could not be deselected and was destroyed by a
later bulk delete (real user-data loss). The two rev-01 adjudications are SETTLED and must NOT be
re-litigated: (A) the 100k/200ms benchmark shortfall is §14's measured-evidence-with-follow-up
branch (Q-033, R-020 open) — rev-02 changed no engine code, so this disposition is unchanged; (B)
the E2E console allowlist masks no real error. Only re-open A or B if rev-02 somehow touched the
engine or the console assertion (it must not have).

## Reproduce and verify (establish each yourself — do not trust)

1. **Delta scope:** `git diff --name-status d79a630..bb12e0c` is EXACTLY three paths —
   `src/app/(app)/transactions/page.tsx`, `src/components/features/people/README.md`,
   `tests/e2e/people-settlement.spec.ts`. Any other path in the rev-02 delta is a finding.
2. **Boundaries EMPTY over the whole range** `191d070..bb12e0c`: `src/lib/**` (incl. the settlement
   engine), the P16D grid dir `src/components/features/transactions/` (byte-identical),
   `supabase/migrations/**`, the three realtime paths (`src/server/routers/realtime.ts`,
   `src/lib/supabase/realtime.ts`, `src/server/schemas/realtime.ts`), and any `vault_ops`. Confirm
   each yourself.
3. **F-1 is genuinely fixed — reproduce in the real app, do not just read the tests.** Deep-link a
   transaction (`/transactions?transaction=<stableId>`): the row must land selected AND
   revealed/highlighted (canonical §13 landing, spec 545-575), the URL param must then be cleared
   (one-shot), the row must be deselectable (`aria-selected` → `false`, bulk bar count → 0), and —
   the data-loss path — after deselecting it, selecting a DIFFERENT row and running bulk delete +
   confirm must delete only that other row and PRESERVE the originally deep-linked one. Confirm both
   the deselection and the preserve-on-bulk- delete behaviours.
4. **The one-shot mechanism is sound.** The fix consumes the param via a render-phase guard
   `landedSourceId` (seeding real `selectedIds` once + reveal) then
   `router.replace("/transactions")` in an effect. Verify: no infinite render/replace loop,
   idempotent across re-renders and vault async load, no first-paint selection flicker, and that
   `selectedTransactionIds` reverted to the param-free BASE form
   (`selectedIds ∩ displayedTransactionIds`). Confirm rev-01's `focusedSourceIndex`/`revealedIdRef`/
   `effectiveDisplayCount` were removed and `displayedTransactions`/`hasMore`/the reveal effect are
   BASE-form.
5. **No regression of rev-01's passing acceptance.** The §13 obligations/states, §7 Examples A–H
   named E2E (all eight), the 12-step journey, distinct settled/neutral/incomplete states,
   per-currency sections with no cross-currency-total path, expand contributions (explicit +
   effective), and stable-ID (not index) source navigation must all still hold. Single-engine
   invariant intact; no settlement cache/persistence.
6. **Gates — re-run independently, do not take counts on trust:**
   `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`. Run the P16E
   E2E with retries DISABLED and repeated (`--repeat-each`); confirm no flakes and no P16D
   grid/keyboard/selection regression. The implementer reports full E2E 142/142 (the two new F-1
   tests) and unit 1735 passed / 2 skipped — verify. The pre-existing `specs/**` `format:check`
   failure on untouched files is not attributable. NEVER use `--headed/--ui/--debug/show`. A local
   Supabase container is required; if genuinely unobtainable, say so precisely rather than passing
   on unverified evidence.
7. **RED→GREEN honesty:** confirm the rev-02 RED was established by reverting only the product file
   while keeping the new tests (so they fail on the real defect), and the GREEN corrections live
   only in `tests/**` — the engine/UI were not altered to fake a pass.
8. **Secret-safety:** no key/seed/recovery/JWT-secret/`crypto_box`/plaintext in any changed file,
   fixture, URL or the evidence; the deep link carries only an opaque stable ID.

## Verdict

Write `reviews/P16E-review-02.md` starting `VERDICT: PASS` or `VERDICT: CHANGES_REQUESTED`, with
reproduction notes, per-item findings, and any Q proposals transcribed for root. `CHANGES_REQUESTED`
on any material regression, an incompletely-fixed F-1, a new selection/navigation defect, a boundary
breach, competing engine, cache, or secret leak — with specific reproducible blockers. Do NOT
commit. Do NOT edit any ledger, scratch, SCOPE, task, the canonical source, or the implementer's
evidence. When done, SendMessage to `main` with your VERDICT, the range you reviewed, and the
blocking-finding count.
