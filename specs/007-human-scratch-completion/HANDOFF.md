# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Review dispatch

- **Package / revision:** P16E / 01 (FS-001 final package) — **REVIEW**
- **Role:** human_scratch_reviewer. You are DISTINCT from `p16e-implementer-01`; you reproduce and
  verify, you never accept the implementer's claims on trust, and you never commit product/test
  code.
- **Scope IDs:** FS-001 (the P16E slice). P16A–P16D are already `passed`; do not re-review them
  except to confirm P16E did not regress or duplicate them.
- **Review range:**
  `191d0707f5e6dbfa5871dbddaa7318b9a14885dd..be82ad0622086759365d38a74982f492d1d9fc59`. The range
  contains root's docs-only dispatch commit `1712d29` (ledger; ignore it) plus the single product
  commit `be82ad0`. Run `git diff --stat 191d070..be82ad0` yourself; the product diff is 12 files
  (People/settlement UI + the flagged `transactions/page.tsx` glue + tests + docs).
- **Evidence to review (frozen, do NOT edit):** `evidence/P16E/implementation-01.md`.
- **Your immutable verdict artifact:** `reviews/P16E-review-01.md` (create it; do NOT commit — root
  persists it on integration). Start with a single line `VERDICT: PASS` or
  `VERDICT: CHANGES_REQUESTED`.

## Binding sources (read fully before judging)

- The ENTIRE canonical source `specs/008-transaction-percentage-allocations-settlement/spec.md` (715
  lines, SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`). P16E sections:
  §7 Examples A–H (274-376), §12 result model (518-545), §13 People page (545-575), §14 performance
  (575-588), §15.3 E2E (635-670), §17 DoD (688-715). The canonical source wins over the task, older
  specs, existing behavior and old tests.
- `tasks/FS-001-transaction-percentage-allocations-settlement.md` — P16E section (162-191),
  acceptance (177-191), evidence ownership (224-227), FS-001 DoD (238-246).
- The implementer's dispatch HANDOFF intent (prior revision of this file) is preserved in the
  `1712d29` commit if you need the original acceptance framing.

## Reproduce and verify (do not trust — establish each yourself)

1. **Range non-empty:** `git diff --exit-code 191d070 be82ad0` fails (expected); confirm product
   paths are exactly the 12 files, all within `src/components/features/people/**`, the flagged
   `src/app/(app)/transactions/page.tsx` glue, `README.md`, and `tests/**`. Any other product path
   is a finding.
2. **Boundaries EMPTY:**
   `git diff 191d070..be82ad0 -- 'supabase/migrations/**' src/server/routers/realtime.ts src/lib/supabase/realtime.ts src/server/schemas/realtime.ts`
   and `-- src/components/features/transactions/` must both be empty (no migration, no
   realtime/`vault_ops` change, P16D grid byte-identical). Confirm yourself.
3. **Single-engine invariant:** the sole production settlement engine is
   `src/lib/domain/settlement.ts`; `calculateSettlementBalances` is consumed only by
   `BalanceSummary.tsx` (plus the `domain/index.ts` re-export). No second/duplicate settlement
   implementation; NO settlement cache/persistence (grep for cache/persist/localStorage/idb settle
   patterns). `balance.ts` must contain no settlement logic.
4. **Acceptance — People page (§13):** obligations rendered in SEPARATE per-currency sections with
   NO field or path capable of producing a combined cross-currency total (verify at the
   type/view-model level, not just visually); debtor/creditor names correct; positive amounts;
   linked-Person highlight. Expand shows contributing transactions (date, resolved alias, account,
   signed contribution, explicit AND effective allocations). "View transaction" targets the STABLE
   transaction ID (survives filter/paginate/reorder), not an index.
5. **Distinct states:** everyone-settled ONLY with zero obligations AND zero issues; neutral
   no-qualifying-paid; prominent "Settlement incomplete" with affected count + reasons whenever
   typed issues exist (invalid data must NEVER read as settled); multi-currency; deleted/unknown
   stable labels. Prove settled and neutral are genuinely distinct code paths.
6. **Examples A–H (§7):** confirm a NAMED, individually-present E2E expectation for EACH of A, B, C,
   D, E, F, G, H against the production settlement path — all eight, no substitute, no combined case
   standing in for any one. Confirm the 12-step journey (§15.3) and the additional matrices exist
   and assert what they claim (esp. negative reversal direction, `-101`/`101` rejected with the
   original PRESERVED not clamped, and stable-ID-addressed source navigation).
7. **Gates — re-run independently, do not take reported counts on trust:**
   `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`. Run the P16E
   E2E with retries DISABLED and repeated (`--repeat-each`); confirm no flakes and no
   P16D-grid/keyboard/ selection regression. The pre-existing `specs/**` `format:check` failure is
   not attributable. NEVER use `--headed/--ui/--debug/show`. A local Supabase container is required;
   if genuinely unobtainable, say so precisely rather than passing on unverified evidence.
8. **Secret-safety:** confirm no key/seed/recovery/JWT-secret/`crypto_box`/plaintext material in any
   P16E file, fixture, URL or the evidence. The source deep link must carry only an opaque ID.

## Two implementer-flagged calls you MUST adjudicate

- **A. Benchmark shortfall (Q-PROPOSAL-P16E-01-001).** Measured ~0.8s (not ~200ms) for the 100k
  production benchmark; reported as measured evidence with follow-up, explicitly NOT claimed as
  passing the target. Rule on the MERITS from the frozen text: §14 / the P16B benchmark clause
  permit a "measured evidence + documented optimization follow-up without claiming the target
  passed" branch. If the shortfall genuinely falls within that canonical branch (residual cost is
  P16B's already-reviewed defensive materialization boundary, near-linear scaling holds, honest
  reporting), that is acceptable — say so on grounds independent of convenience. **If instead you
  judge accepting ~0.8s to be a genuine REDUCTION of committed scope or a supersession of the ~200ms
  target, do NOT self-resolve it: flag it to root, who routes scope reductions to an INDEPENDENT
  scope adjudicator.**
- **B. E2E console allowlist.** The spec allowlists local `sync.pushOps` / `Failed to fetch`
  transport noise. Verify this does NOT mask any real P16E-originated console error and that the
  console assertion remains meaningful; if it hides real errors, that is a finding.
- Also verify the RED→GREEN "engine-right/fixture-wrong" corrections (evidence §9) changed ONLY
  tests/fixtures, never the engine or UI to make a wrong result look right.

## Verdict

- Write `reviews/P16E-review-01.md` starting `VERDICT: PASS` or `VERDICT: CHANGES_REQUESTED`, with
  reproduction notes, per-acceptance-item findings, the two adjudications (A/B), and any Q proposals
  transcribed for root. On any material acceptance gap, misleading total, validation bypass,
  traceability gap, competing engine, cache, boundary breach or secret leak: `CHANGES_REQUESTED`
  with specific blockers. Do NOT commit. Do NOT edit any ledger, scratch, SCOPE, task, the canonical
  source, or the implementer's evidence. Message root with the verdict and the range you reviewed.
