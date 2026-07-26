# P16E / revision 01 — implementation evidence

- **Package / revision:** P16E / 01
- **Role:** human_scratch_implementer
- **BASE (review base):** `191d0707f5e6dbfa5871dbddaa7318b9a14885dd`
- **Build tree HEAD at start:** `1712d29e950c0e323bdb1191423439c217a17bd1` (docs-only ledger commit
  on top of BASE; not touched)
- **HEAD after implementation:** `be82ad0622086759365d38a74982f492d1d9fc59`
- **Range empty?** No.

## 1. Sources read in full before coding

- `specs/007-human-scratch-completion/HANDOFF.md` (P16E / 01 dispatch)
- `specs/007-human-scratch-completion/PROCESS.md`
- `specs/007-human-scratch-completion/tasks/FS-001-transaction-percentage-allocations-settlement.md`
  (P16E section lines 162-191, acceptance 177-191, evidence ownership 224-227)
- `specs/008-transaction-percentage-allocations-settlement/spec.md` — entire 715 lines. Verified
  identity before coding (see §8).
- `.claude/CLAUDE.md`, `.claude/rules/coding-style.md`, `.claude/rules/typescript-style.md`,
  `.claude/skills/e2e/SKILL.md`, `.claude/skills/components/SKILL.md`

## 2. Existing behavior surveyed (consume, do not redo)

| Contract                                                  | Where                                                                   | P16E use                            |
| --------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------- |
| P16B sole settlement engine                               | `src/lib/domain/settlement.ts` `calculateSettlementBalances`            | read-only consumer                  |
| P16A derivation for per-source explicit/effective display | `src/lib/domain/allocation.ts` `deriveEffectiveAllocations`             | read-only consumer (display only)   |
| P16D real grid                                            | `src/components/features/transactions/*`, `(app)/transactions/page.tsx` | navigation target only              |
| P08 people/member linkage                                 | `src/lib/crdt/person.ts` `resolvePersonDisplayName`                     | name resolution                     |
| P11C alias flows                                          | `useDescriptionAliasLookup` / `createDescriptionAliasLookup`            | resolved description on source rows |

Pre-existing People settlement surface being replaced: `BalanceSummary.tsx` (212 lines). It already
groups by currency and shows a `Settlement incomplete` card, but it has **no** source-transaction
expansion, **no** "View transaction" navigation, **no** neutral no-qualifying-paid state (it renders
"Everyone is settled up" whenever `obligations.length === 0`, including when there is simply nothing
paid yet), and no deleted/unknown labelling distinct from active People.

Gap confirmed in the transactions route: `src/app/(app)/transactions/page.tsx` has **no** search
param handling at all (no `useSearchParams`). It does have the exact reveal machinery P16E needs —
`transactionIdToReveal` state + effect (lines 216-234) and the `displayCount` raise used by
`handleAddTransaction` (lines 366-379). P16E reuses that mechanism rather than adding a second one.

## 3. Plan (test-first)

### RED first

1. `tests/e2e/people-settlement.spec.ts` — eight named tests `canonical example A` …
   `canonical example H`, each driving the real UI (accounts/ownership/grid/status) and asserting
   the People page obligation rendered by the production settlement path; plus the mandatory 12-step
   journey and the additional matrices.
2. `tests/unit/components/balance-summary.test.tsx` — extend for the distinct states, per-currency
   sections, expansion, deleted/unknown labels and the no-cross-currency-total invariant.

### GREEN

3. New `src/components/features/people/settlement-view.ts` — a **pure** presentation module that
   maps the canonical `SettlementResult` + vault lookups into an immutable view model (per-currency
   sections, obligations, expanded source rows). No settlement math is re-implemented; the engine's
   `obligations`/`sourceContributions`/`issues` are consumed verbatim. Explicit/effective allocation
   text on a source row comes from P16A `deriveEffectiveAllocations`, not a new derivation.
4. Rewrite `src/components/features/people/BalanceSummary.tsx` to render that view model with the
   five distinct states and expandable source rows.
5. `src/app/(app)/transactions/page.tsx` — read a `?transaction=<stableId>` search param and route
   it through the **existing** `transactionIdToReveal` + `displayCount` + `setSelectedIds`
   mechanism. Stable ID only, never an index.

### Q-proposals

Recorded in §7 as they arise.

## 4. Hard boundaries honoured

- No second settlement engine; no settlement cache/persistence. `BalanceSummary` computes via
  `useMemo` per render input identity only.
- No `supabase/migrations/**` change, no `vault_ops` schema change, no P04/P05 file touched.
- No allocation normalization/clamping; the People page is read-only with respect to allocations.
- No ledger, scratch, SCOPE, canonical spec, task or review file written.
- Evidence file left UNCOMMITTED.

## 5. Acceptance mapping

| HANDOFF acceptance                                         | Where delivered                                                                                    | Evidence                                                                                        |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1. Obligations in separate currency sections               | `settlement-view.ts` `buildSettlementView`; `BalanceSummary.tsx` `CurrencySection`                 | unit "separate currency sections"; E2E "multiple currencies"                                    |
| 1. No combined cross-currency total                        | `SettlementView` has no total-bearing field; per-section formatter                                 | unit asserts no `total` key and no `12.00`; E2E asserts no `70.00`                              |
| 1. Debtor/creditor names, positive amounts                 | `resolvePersonLabel`; `formatAmount(asMinorUnits(...))`                                            | all eight example E2Es assert `$NN.NN`                                                          |
| 1. Linked-Person highlighting                              | `involvesLinkedPerson`                                                                             | unit "highlights the linked Person's obligations only"                                          |
| 2. Expand to contributing transactions                     | `SettlementObligationView.sources`; `SourceRow`                                                    | unit "expands an obligation"; E2E journey step 7                                                |
| 2. Date/description/account/contribution/alloc             | `buildSourceRow` + `buildAllocationEntries`                                                        | E2E step 7 asserts date, description, account, amount, `explicit 50%`, `effective 50%`          |
| 2. "View transaction" focuses stable source ID             | `/transactions?transaction=<id>`; `SOURCE_TRANSACTION_PARAM` + `focusedSourceIndex`                | E2E step 8 and the keyboard matrix assert `aria-selected="true"` on the ID-addressed row        |
| 3. Everyone settled only with no obligations AND no issues | `buildSettlementView` orders `incomplete` first                                                    | unit "keeps Settlement incomplete even when obligations were also produced"                     |
| 3. Neutral no-qualifying-paid state                        | `qualifyingTransactionCount === 0` branch                                                          | unit "distinguishes the neutral..."; E2E example H                                              |
| 3. Prominent incomplete + count + reasons                  | `summarizeIssues`; incomplete card                                                                 | unit "affected count and reasons"; E2E "invalid ownership surfaces Settlement incomplete"       |
| 3. Deleted/unknown stable labels                           | `resolvePersonLabel`                                                                               | unit "labels deleted and unknown People"; E2E "a deleted Person keeps their historical balance" |
| 4. Memoization, no settlement cache                        | five `useMemo`/`useCallback` in `BalanceSummary`, per-section formatter memo; nothing written back | §7 single-engine/no-cache greps                                                                 |
| 4. Documentation updated                                   | `src/components/features/people/README.md` (new), `README.md` feature bullet                       | committed                                                                                       |

## 6. Commands and results

- `pnpm typecheck` — clean.
- `pnpm lint` — 0 errors (10 pre-existing unused-import warnings in untouched `tests/unit/crdt/*`).
- `pnpm exec oxfmt --check <exact changed paths>` — "All matched files use the correct format." Bare
  `pnpm format` was never run (Q-024 hazard).
- `pnpm test` — **84 files, 1735 passed, 2 skipped**.
- `pnpm exec playwright test people-settlement --retries=0 --workers=3` — see §11 for the full run
  log, including the two intermediate red runs and what each defect was.
- Benchmark:
  `P16B_BENCHMARK=1 pnpm exec vitest run tests/unit/domain/settlement.test.ts -t "benchmarks 100,000" --reporter=verbose`:
  `node=v22.21.1 scale10kMs=78.87 scale50kMs=385.15 elapsed100kMs=811.38,786.52,862.40,764.68,763.69 obligations=2 contributions=75000 issues=0 conservation=true`.

### Benchmark disposition (honest, not a pass claim)

Near-linearity holds: 10k→100k is 10.1x wall time for 10x input, and 50k is 385ms (4.9x of 10k). The
strict ~200ms target in §14 is **NOT met**; measured 100k is ~0.76-0.86s. This is reported as
measured numbers plus a documented follow-up, exactly as §14 and the task permit — it is not claimed
as passing. See `Q-PROPOSAL-P16E-01-001`.

## 7. Invariant verification

- **Single engine.** `grep -rn "calculateSettlementBalances" src/` returns only
  `src/lib/domain/settlement.ts` (definition), `src/lib/domain/index.ts` (re-export) and
  `BalanceSummary.tsx` (sole consumer). No second or forked engine was added.
- **No settlement cache.**
  `grep -rniE "settlementCache|persistSettlement|saveSettlement| localStorage.*settle|idb.*settle" src/ tests/`
  returns nothing. All memoization is React-render scoped; nothing derived is written back to the
  vault.
- **Boundary diff EMPTY.**
  `git diff --stat BASE -- supabase/migrations src/server/routers/realtime.ts src/lib/supabase/realtime.ts`
  is empty. No migration, no `vault_ops` change, no P04/P05 edit.
- **Secret-safety.** A
  `seed phrase|recovery phrase|masterKey|JWT_SECRET|SERVICE_ROLE|crypto_box| secretKey|privateKey`
  scan across every P16E-authored file returns nothing. The only repo hits are in the untouched
  `InviteLinkGenerator.tsx` (empty diff vs BASE). Tests use synthetic names only.
- **No normalization.** The People page performs no allocation write. `buildAllocationEntries`
  returns an empty list for data the P16A primitive rejects rather than substituting a plausible
  value; E2E asserts `-101` and `101` are refused without clamping and the prior value is preserved.
- `next-env.d.ts` was regenerated by the dev server (a Next build artifact) and reverted with
  `git checkout`; it is not part of the commit.

## 8. Changed paths (each justified)

All within the People/settlement-display domain granted by HANDOFF "Allowed changes". No
out-of-domain path.

| Path                                                           | Why                                                                                                                    |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `src/components/features/people/BalanceSummary.tsx` (M)        | The People summary replaced by canonical obligations, states, expansion and navigation. Explicitly named in HANDOFF.   |
| `src/components/features/people/settlement-view.ts` (A)        | Pure view model for sections/states/sources. No settlement math.                                                       |
| `src/components/features/people/settlement-allocations.ts` (A) | Explicit/effective context via the P16A primitive, for the expanded source rows.                                       |
| `src/components/features/people/PeopleTable.tsx` (M)           | Passes P11C alias resolution into the summary so source rows show the resolved description.                            |
| `src/components/features/people/index.ts` (M)                  | Barrel exports for the two new modules.                                                                                |
| `src/components/features/people/README.md` (A)                 | Required documentation update for the People/settlement surface.                                                       |
| `src/app/(app)/transactions/page.tsx` (M)                      | The "minimal glue needed to open+focus a source transaction in the existing grid" that HANDOFF allows. See note below. |
| `README.md` (M)                                                | One feature bullet linking the new settlement doc.                                                                     |
| `tests/e2e/people-settlement.spec.ts` (A)                      | Examples A-H, the 12-step journey, the matrices.                                                                       |
| `tests/e2e/helpers/settlement.ts` (A)                          | Reusable vault-shaping/assertion helpers for the above.                                                                |
| `tests/unit/components/settlement-view.test.ts` (A)            | The pure view model and allocation context.                                                                            |
| `tests/unit/components/balance-summary.test.tsx` (M)           | Extended to the five states, sections, expansion and labels.                                                           |

### Note for reviewer scrutiny: `transactions/page.tsx`

This is the one file outside `features/people/**`. HANDOFF explicitly allows "the minimal glue
needed to open+focus a source transaction in the existing Transactions grid". The change is:

1. `SOURCE_TRANSACTION_PARAM` + `useSearchParams`, with the page wrapped in `Suspense` (required by
   Next 16 for `useSearchParams`).
2. `focusedSourceIndex` / `effectiveDisplayCount` — derived during render, extending the page only
   far enough to include the requested source. Matching is on the **stable transaction ID**; no
   index is ever accepted from the URL.
3. The requested ID is unioned into `selectedTransactionIds`.
4. The pre-existing reveal effect now also honours the requested ID for scrolling.

P16D's virtualization, focus, presence and alignment are untouched: no change to `TransactionTable`,
`TransactionRow`, `allocation-columns.ts` or `PersonAllocationCell`, and the existing
`transactionIdToReveal` mechanism is reused rather than duplicated. An initial effect-based version
was rewritten as derived state after `react-hooks/set-state-in-effect` correctly flagged the
cascading render.

## 9. Test counts

- Unit/integration: **84 files, 1735 passed, 2 skipped** (`pnpm test`), including 13 new
  `settlement-view` cases and 8 `balance-summary` cases.
- E2E `people-settlement.spec.ts`: **16 tests** — 8 named canonical examples (A-H), the mandatory
  12-step journey, and 7 matrix tests.
- Full E2E suite and retries-disabled repeats: see §11 and §16.

### E2E run history (RED → GREEN, nothing hidden)

Every run used `--retries=0`. Three runs were red before green; all four defects were in **test**
code or environment, none in the product:

| Run | Result              | Defects and resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 12 passed, 4 failed | (a) console assertion caught pre-existing local `sync.pushOps` transport noise from `manager.ts`/`vault-provider.tsx` — scoped to a documented allowlist; (b) multi-currency: a new account inherits **equal** ownership across all People, so my EUR data was actually example G — the engine was right, the test was wrong; fixed by setting sole ownership; (c) clipboard write denied — now grants the permission and uses a real `ControlOrMeta+v`; (d) delete-Bob timed out because the delete control is hidden for a Person holding allocations — reshaped so Bob's balance comes from ownership. |
| 4   | 15 passed, 1 failed | `setAccountOwnership` snapshotted the remove-owner buttons with `.all()`; the first click re-renders the editor and invalidates the rest. Fixed to re-resolve the unwanted set each iteration.                                                                                                                                                                                                                                                                                                                                                                                                            |
| 5   | 15 passed, 1 failed | Multi-currency again, and again the engine was right: `handleAddTransaction` takes `accountOptions[0]`, which is CRDT map order and **not** sorted, so both rows landed on the Euro account and produced a single correct `€70.00` EUR obligation. Fixed by naming both accounts explicitly instead of assuming the default.                                                                                                                                                                                                                                                                              |
| 6   | **32 passed**       | `--repeat-each=2`, `--retries=0`, 16 tests x 2. No failures, no flakes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 7   | **32 passed**       | Re-run after replacing two in-step `await import("./helpers")` calls with a static import. `--repeat-each=2 --retries=0`, no failures.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 8   | **140 passed**      | **Entire** E2E suite at final HEAD, `--retries=0 --workers=4`, 3.2m. Zero failures, zero flaky. Confirms no regression in the P16D grid, keyboard-navigation, selection or bulk-edit journeys neighbouring my `transactions/page.tsx` change.                                                                                                                                                                                                                                                                                                                                                             |

Run 3 produced no result at all: it collided with run 2 on port 3000 (`reuseExistingServer: false`),
which is a harness collision, not a test outcome.

Worth flagging for the reviewer: **two of the five defects were the settlement engine being correct
and my fixture being wrong** (runs 1b and 5). In both cases the displayed obligation was the honest
consequence of the vault state I had actually built — equal ownership on a newly added account, and
unsorted account selection on a new row. I changed the tests, never the engine or the UI, to match
the canonical semantics.

## 10. Named E2E per canonical example (all eight mandatory, none substituted)

Each is an independent `test(...)` driving the production settlement path; the RED→GREEN assertion
is the People-page obligation (or its documented absence) produced by the engine.

| Example | Test name                                                                               | Setup                               | Assertion that makes it RED→GREEN                              |
| ------- | --------------------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------- |
| A       | `canonical example A: no explicit allocations produces no obligation`                   | -$100, Me 100%, no allocations      | `expectEveryoneSettled` (settled, not neutral)                 |
| B       | `canonical example B: basic 50/50 expense makes Bob owe Me $50`                         | -$100, Me 100%, Me 50 / Bob 50      | obligation Bob → Me `$50.00` in USD                            |
| C       | `canonical example C: owner remainder makes Bob owe Me $30`                             | -$100, Me 100%, Bob 30              | obligation Bob → Me `$30.00`                                   |
| D       | `canonical example D: joint owners split the third person's share $18 and $12`          | -$100, Me 60 / Bob 40, Charlie 30   | two obligations: Charlie → Me `$18.00`, Charlie → Bob `$12.00` |
| E       | `canonical example E: a negative allocation reverses the direction so Me owes Bob $20`  | -$100, Me 100%, Bob -20             | obligation **Me → Bob** `$20.00` (direction reversed)          |
| F       | `canonical example F: income makes the receiving owner owe Bob $50`                     | **+$100**, Me 100%, Me 50 / Bob 50  | obligation Me → Bob `$50.00`                                   |
| G       | `canonical example G: equal joint ownership with no allocations produces no obligation` | -$100, Me 50 / Bob 50               | `expectEveryoneSettled`                                        |
| H       | `canonical example H: a status without Treat-as-Paid produces no obligation`            | Example B data, `For Review` status | `expectNoQualifyingTransactions` (neutral, NOT settled)        |

Examples A/G vs H are asserted through _different_ helpers, which is what proves the settled and
neutral states are genuinely distinct rather than one shared empty state.

## 11. The mandatory 12-step journey

`mandatory journey: allocate, settle, trace, persist, exclude, restore and reverse`, one
`test.step()` per canonical step:

1. create/unlock (`createNewIdentity`) · 2. add Bob · 3. assert `Me (100%)` on Accounts ·
2. -$100 Treat-as-Paid · 5. Me 50 / Bob 50 through real grid cells · 6. Bob owes Me `$50.00` ·
3. expand and assert the source's date, description, account, `$50.00`, `explicit 50%` and
   `effective 50%` · 8. "View transaction" → `waitForURL(/\?transaction=/)` and the ID-addressed row
   is `aria-selected="true"` · 9. reload: the grid cell still reads `50%` and the obligation
   persists ·
4. `For Review` → `expectNoQualifyingTransactions` · 11. restore `Paid`, Me 0 / Bob -20 → the
   obligation reverses to Me → Bob `$20.00` · 12. `-101` and `101` rejected with
   `aria-invalid="true"` and a `role="alert"`, original preserved on Escape (no clamping); a real
   `ControlOrMeta+v` clipboard paste of `33.75`; Escape preserves; blur saves `25.5`.

Console/network cleanliness is asserted at the end via `observeBrowserHealth`.

## 12. Additional matrices

`multiple currencies` (separate USD/EUR sections, no `70.00` total) · `add-row allocations` ·
`imported/existing edit updates settlement` · `bidirectional netting retains both signed sources` ·
`deleted Person keeps balance under a stable deleted label` ·
`invalid ownership surfaces Settlement incomplete` ·
`keyboard operable, accessible and stable across themes and widths` (role/name/state,
`aria-expanded`, `aria-controls`, `toHaveAccessibleName`, keyboard-only Enter activation, 320px
narrow viewport, dark + reduced motion, clean console/network).

## 13. Q-proposals

### Q-PROPOSAL-P16E-01-001 — Strict 100k/200ms settlement target is not met; carry the measured follow-up

- **Raised by/package/revision:** p16e-implementer-01 / P16E / 01
- **Context and evidence:** Canonical §14 asks that 100,000 transactions meet the existing
  account-balance target of approximately 200ms in a production build, "or provide measured evidence
  and a documented optimization follow-up". Measured on `node v22.21.1`: 10k `78.87`ms, 50k
  `385.15`ms, 100k `811.38 / 786.52 / 862.40 / 764.68 / 763.69`ms, with 100,000 qualifying
  transactions, 75,000 contributions, 2 obligations, 0 issues and conservation holding. This matches
  P16B/05's independently recorded `753-853`ms and RISKS `R-020`, which assigns P16E "production
  profiling, memoized projection/safe interning and strict-target disposition".
- **Why existing authority does not decide it:** §14 explicitly offers the measured-evidence branch,
  so not meeting 200ms is not automatically a canonical violation — but it does not say who may
  close R-020 or whether the strict target is abandoned. The remaining cost is inside the P16B
  engine's defensive `snapshotMaterialized*` boundary (three calls per transaction on the hot path),
  which the P16B/05 immutable FAIL review specifically required for exact-key `$cid` handling and
  invalid-data honesty. Optimizing it means reopening a passed package's reviewed semantics.
- **Options considered:** (a) report measured numbers and carry the follow-up; (b) optimize the P16B
  engine's materialization inside P16E; (c) declare the target met by excluding projection cost from
  the measurement.
- **Reversible default selected to continue:** (a). P16E reports the measured numbers, does not
  claim the target passed, and leaves the engine's reviewed semantics untouched.
- **Decision-hierarchy basis:** (1) the explicit frozen §14 measured-evidence branch; (3) preserving
  the invalid-data honesty the P16B review mandated over raw speed; (4) smallest reversible change —
  P16E adds no engine edit, so a later optimization package has a clean surface.
- **Impact and risk:** Real-world vaults are far below 100k, and the People page memoizes the
  result, so interactive cost is unaffected; the <100ms allocation-edit target is separately met
  (P16D). Risk is that R-020 stays open past FS-001.
- **Reversal or migration path:** A later package can optimize `snapshotMaterializedRecord`/
  `snapshotMaterializedArray` (e.g. a fast path for already-plain records) behind the existing
  benchmark, with no API or data change.
- **Human review still useful after completion:** Yes — whether ~0.8s at 100k is acceptable, or
  whether a dedicated optimization package should be scheduled, is a product judgement.

Option (c) was rejected outright: excluding the projection would be measuring something other than
the production path, which is exactly the "never claim the target passed" failure §14 forbids.

## 14. Frozen-source integrity spot check

- `sha256sum specs/008-transaction-percentage-allocations-settlement/spec.md` =
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c` — matches the required hash.
- `wc -l -c` = `715` lines, `25441` bytes — matches.
- Verified before coding and again after the final commit. No ledger, scratch, SCOPE, task, review
  or canonical file was written by this package.

## 15. Risks

- `R-020` remains open; see `Q-PROPOSAL-P16E-01-001`.
- The People page renders every retained transaction into a lookup map to resolve source rows. This
  is a single pass built alongside the existing `getAllTransactions` call the page already made for
  the delete guard, and it is memoized, but it is linear in vault size on the People route.
- `PRE_EXISTING_TRANSPORT_NOISE` in the E2E spec allowlists local `sync.pushOps` transport failures
  so the console/network assertion is not vacuous elsewhere. If the reviewer would rather see that
  noise fixed than filtered, it belongs to the sync package, not to P16E — the filter is narrow,
  commented with its origin files, and does not mask any People/settlement error.

## 16. Final verification

- **Final HEAD:** `be82ad0622086759365d38a74982f492d1d9fc59` — one commit,
  `feat(P16E): render canonical settlement on the People page`, 12 exact-path files.
- **Working tree after commit:** only the two evidence files are untracked
  (`evidence/P08/implementation-01.md` pre-existed this dispatch;
  `evidence/P16E/implementation-01.md` is this document). No other dirty path.
- **Full gate:** `pnpm typecheck` clean; `pnpm lint` 0 errors; `pnpm format:check` clean on all
  changed paths; `pnpm test` 1735 passed / 2 skipped; `people-settlement` 32/32 under
  `--repeat-each=2 --retries=0`.
- **`pnpm format:check` at repo root** still fails on pre-existing `specs/**` files. That failure is
  documented as not attributable to this package (Q-024) and bare `pnpm format` was never run.
- Frozen canonical source re-verified byte-identical after the final commit.
- Evidence file (this document) is left **UNCOMMITTED** per the dispatch.

## 17. Manual installed-CLI verification

Repository-installed `pnpm exec playwright-cli`, unique disposable session `p16e-m2`, at product
HEAD `be82ad0`. No Playwright MCP, `npx`, ad-hoc script, temporary test/config,
headed/`--debug`/`--ui`/ `show` mode or arbitrary sleep. The dev server was started with the same
`SUPABASE_JWT_SECRET` the Playwright config derives, so realtime authorization behaves as in the
automated suite.

- **Onboarding.** Identity created through the masked flow; the recovery phrase was never revealed,
  read, copied or emitted. An earlier `p16e-impl-01` session against a bare `pnpm dev` (no JWT
  secret) produced three realtime-authorization 500s; that is a server-env defect of my own launch,
  not a product defect, and the session was discarded and re-run correctly.
- **Canonical example B in the real app.** Added Bob, created `Manual CLI groceries` / `-100.00` /
  `Paid` and entered Me 50 / Bob 50 through real grid cells. People rendered
  `region "USD" > heading "USD" > button "Bob Me $50.00"` — one per-currency region, positive
  amount, no grand total.
- **Deterministic accessibility.** Expected an expandable button naming both parties; observed
  `role=button`, name `Bob Me $50.00`, `aria-expanded="false"`, and
  `aria-controls="settlement-sources-USD:6b5d81d4-…:person-default-me"` — the control is keyed by
  **stable person IDs**, not names or indices. After activation `aria-expanded="true"`.
- **Expansion content.** The source row read
  `2026-07-27 · Manual CLI groceries · Default · Bob: explicit 50%, effective 50% · Me: explicit 50%, effective 50% · $50.00 · View transaction`
  — every §13 field present, explicit and effective shown separately and never conflated.
- **Source navigation.** "View transaction" went to
  `/transactions?transaction=fcadb2f5-a124-45b5-9bbd-0a946be09031` and the row with that exact
  `data-transaction-id` reported `aria-selected="true"`.
- **Persistence.** After reload the People card still read `USD Bob Me $50.00`.
- **Responsive / dark / reduced motion.** At 320x720 with `colorScheme: dark` and
  `reducedMotion: reduce`, the obligation text was unchanged and
  `documentElement.clientWidth === scrollWidth === 320` (no horizontal overflow).
- **Contrast.** The `$50.00` amount: foreground sRGB `[2, 6, 24]` on background `[248, 250, 252]`,
  ratio **19.27:1** against a 4.5:1 threshold — passes. (Colours resolve as `lab()`/`oklab()`, so
  they were rasterized to sRGB before measuring; a first naive parse reported a bogus 1.01 and was
  discarded rather than reported.)
- **Invalid-data honesty.** Zeroing both owners on the Default account made People render
  `Settlement incomplete · 1 transaction needs attention and is excluded from the amounts below · Account ownership is invalid`,
  with **0** settled claims and **0** obligation rows. No misleading total was produced.
- **Console / network.** Final inspection: 6 messages, **0 errors**, 1 warning. Every dynamic
  request returned 200 (`vault.list`, `sync.getUpdates`, `realtime.authorize`, `realtime.revoke`).
- **Privacy.** A scan of the full request inventory for `groceries`, `Bob`, `50.00`, `seed`,
  `phrase` and `key=` outside static assets returned nothing: the deep link carries only an opaque
  UUID and no vault plaintext appears in any URL or query string.
- **Cleanup.** Session closed, `delete-data` run for both sessions, `.playwright-cli/` artifacts
  removed, dev server stopped. Working tree contains only the two evidence files.
