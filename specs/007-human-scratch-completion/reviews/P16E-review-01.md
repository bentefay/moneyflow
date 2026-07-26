VERDICT: CHANGES_REQUESTED

# P16E / revision 01 — independent review

- **Reviewer:** `p16e-reviewer-01` (human_scratch_reviewer), distinct from `p16e-implementer-01`
- **Review range:**
  `191d0707f5e6dbfa5871dbddaa7318b9a14885dd..be82ad0622086759365d38a74982f492d1d9fc59`
- **Product HEAD reviewed:** `be82ad0622086759365d38a74982f492d1d9fc59` — unchanged at verdict time
- **Blocking findings:** 1 (F-1, below)
- **Adjudication A (benchmark shortfall):** falls within the canonical measured-evidence branch —
  **acceptable, not a scope reduction**. No escalation required.
- **Adjudication B (E2E console allowlist):** narrow and non-masking — **acceptable**.

Nothing was committed. No ledger, scratch, SCOPE, task, canonical source or implementer evidence was
edited.

---

## 1. Reproduction notes

### Range and boundaries — all established independently

| Check                       | Command                                                                                                                                            | Result                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Range non-empty             | `git diff --exit-code 191d070 be82ad0`                                                                                                             | exit 1 (non-empty), as expected                                     |
| Product paths               | `git diff --name-status 191d070 be82ad0`                                                                                                           | exactly the 12 authorized paths + the 2 ledger files from `1712d29` |
| Migrations / realtime       | `git diff 191d070..be82ad0 -- 'supabase/migrations/**' src/server/routers/realtime.ts src/lib/supabase/realtime.ts src/server/schemas/realtime.ts` | **0 bytes — EMPTY**                                                 |
| P16D grid dir               | `git diff 191d070..be82ad0 -- src/components/features/transactions/`                                                                               | **0 bytes — EMPTY**                                                 |
| P16D grid byte-identity     | per-file `git rev-parse` blob comparison across every file under the grid dir                                                                      | **every blob hash identical**                                       |
| `vault_ops` in product diff | grep over `src/ tests/` diff                                                                                                                       | 0 hits                                                              |
| New migration               | `git diff --name-only … -- supabase/`                                                                                                              | 0 files                                                             |
| `src/lib/**` touched        | `git diff --name-only … -- src/lib/`                                                                                                               | **0 files** — engine, allocation and balance untouched              |

The 12 product paths are all within `src/components/features/people/**`, the flagged
`src/app/(app)/transactions/page.tsx` glue, `README.md` and `tests/**`. No out-of-domain product
path. The one commit beyond `be82ad0` (`d5733e1`) touches only `HANDOFF.md`/`PROGRESS.md` — ledger
only, so the assigned product HEAD is intact and no escalation to root is needed on that ground.

### Frozen-source integrity

`sha256sum specs/008-transaction-percentage-allocations-settlement/spec.md` =
`0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`; `wc -l -c` = `715` / `25441`.
All match. Verified after all my runs; unchanged.

### Single-engine invariant — CONFIRMED

`grep -rn "calculateSettlementBalances" src/ tests/` returns in production only:

- `src/lib/domain/settlement.ts:1060` (the definition),
- `src/lib/domain/index.ts:52` (re-export),
- `src/components/features/people/BalanceSummary.tsx:25,77` (sole consumer).

`grep -rln "obligation" src/` returns only the engine, the three People files and the new People
README. No second or forked engine.
`grep -rniE "settlementCache|persistSettlement|saveSettlement|localStorage.*settle|idb.*settle|cacheSettle"`
over `src/ tests/` returns **nothing** — no settlement cache or persistence.
`src/lib/domain/balance.ts` contains no `settle|obligation|debtor|creditor` token — no settlement
logic. All memoization in `BalanceSummary.tsx` is React-render scoped (`useMemo`/`useCallback`);
nothing derived is written back to the vault.

### Gates — re-run by me, not taken on trust

| Gate                                                        | My result                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                                            | **clean (exit 0)**                                                                                                                                                                                                                                                                     |
| `pnpm lint`                                                 | **0 errors**, 10 warnings — all pre-existing unused-imports in untouched `tests/unit/crdt/*` and `src/lib/crdt/queries.ts`                                                                                                                                                             |
| `pnpm format:check`                                         | fails on **15 `specs/**`files only**; zero failures in any`src/`, `tests/`or`README.md`path. Scoped`oxfmt --check` over all 12 changed paths: "All matched files use the correct format." Those 15 files are untouched by this range, so the failure is not attributable (R-024/Q-024) |
| `pnpm test`                                                 | **84 files, 1735 passed, 2 skipped** — exactly matches the evidence                                                                                                                                                                                                                    |
| `people-settlement --repeat-each=2 --retries=0 --workers=4` | **32/32 passed (56.4s), zero flaky**                                                                                                                                                                                                                                                   |
| Full E2E `--retries=0 --workers=4`                          | **140/140 passed (3.2m), zero failures, zero flaky** — no P16D grid/keyboard/selection regression                                                                                                                                                                                      |

A local Supabase stack was available (`supabase_db`/`realtime`/`kong` healthy), so nothing was
passed on unverified evidence. No `--headed`, `--ui`, `--debug` or `show` was used anywhere.

### Independent benchmark re-run

`P16B_BENCHMARK=1 pnpm exec vitest run tests/unit/domain/settlement.test.ts -t "benchmarks 100,000"`:

```
node=v22.21.1 scale10kMs=89.30 scale50kMs=471.33
elapsed100kMs=1051.57,951.30,1104.82,930.94,1004.66
obligations=2 contributions=75000 issues=0 conservation=true
```

My numbers are ~0.93–1.10s, somewhat **slower** than the implementer's reported 0.76–0.86s (my box
was concurrently running other work). Near-linearity holds on my run too: 10k→100k is ~11.2x wall
time for 10x input. Correctness output is identical and exact: 100,000 qualifying, 75,000
contributions, 2 obligations, 0 issues, conservation true. The benchmark test itself is P16B-owned
and byte-unchanged in this range.

---

## 2. Per-acceptance-item findings

### §13 People page — obligations, currencies, names, highlight

**PASS.** Verified at the type/view-model level, not merely visually. `SettlementView` is
`{ state: SettlementViewState }`; the `obligations` state carries
`readonly sections: readonly SettlementCurrencySection[]`, each `{ currency, obligations }`. There
is **no field anywhere in the type graph capable of expressing a cross-currency total** — no
`total`, `grandTotal`, `sum` or untagged aggregate. Amount formatting is per-section
(`CurrencySection` builds its own `createCurrencyFormatter` from `section.currency`), so an amount
cannot even be rendered outside its currency context.
`tests/unit/components/settlement-view.test.ts:162-164` asserts the serialized view contains neither
`total` nor `grandTotal` — a structural assertion, not a text one. Manually confirmed: with USD-only
data the page rendered exactly one `settlement-currency-section-USD`.

Debtor/creditor names and positive amounts confirmed manually: obligation text `Bob | Me | $50.00`
for canonical example B. Amounts come from the engine's already-positive `amountMinor`.
Linked-Person highlight is `involvesLinkedPerson` (debtor **or** creditor equals `linkedPersonId`),
covered positively _and_ negatively at `balance-summary.test.tsx:212-217`.

### §13 Expansion — date, alias, account, signed contribution, explicit AND effective

**PASS.** Manually expanded the obligation in the real app; the source row read:

```
2026-07-27 | Tracked settlement source | Default | Bob: explicit 50%, effective 50% · Me: explicit 50%, effective 50% | $50.00 | View transaction
```

Every §13 field is present and explicit/effective are shown **separately and never conflated**.
`settlement-allocations.ts` derives them through the P16A `deriveEffectiveAllocations` primitive
rather than recomputing, and returns an empty list (`buildAllocationEntries` line 46) when the
primitive rejects the data — a refusal rather than a plausible substitute. That refusal is asserted
three ways at `settlement-view.test.ts:275-279` (out-of-range `101`, empty ownership, ownership not
totalling 100). Signed contributions retain their sign: `-$20.00` for a netting-reducing source
(`balance-summary.test.tsx:268`, E2E `people-settlement.spec.ts:569-571`).

### §13 "View transaction" targets the stable ID — **PASS on addressing, but see F-1**

The link is `/transactions?transaction=${encodeURIComponent(source.transactionId)}` — the stable
transaction ID, URL-encoded, never an index. The route matches by
`transaction.id === requestedTransactionId` (`page.tsx` `focusedSourceIndex`), so the target
survives filtering, pagination and reordering. I verified this genuinely, not just by reading:

- Direct deep link: target row `aria-selected="true"`.
- **Filtered-out target:** filtered the grid to 0 rows, navigated to People, clicked "View
  transaction" — the target row was rendered and selected (`rowVisibleAfterLink: 1`,
  `selected: "true"`). Filters do not survive the route change, so the target stays reachable.
- Keyboard-only: focus toggle → Enter expands → focus link → Enter navigates → target selected.

Note: the new `people/README.md:56` claims "if the source is filtered out, the filters are cleared
so it stays reachable." No such code exists — the only `setFilters(createEmptyFilters())` call is
the pre-existing one inside `handleAddTransaction` (`page.tsx:385`). Reachability actually comes
from filters being component state that resets on route change. The behaviour is correct; the
documentation sentence is inaccurate. Non-blocking (documentation only), but worth correcting
alongside F-1 since both live in the same glue.

### §13 Distinct states

**PASS.** `buildSettlementView` returns exactly one state and `incomplete` is checked **first**
(`settlement-view.ts:184-185`), before the obligations branch — so an invalid vault can never be
presented as settled. Settled vs neutral are genuinely distinct code paths, not one shared empty
state: the discriminator is `result.qualifyingTransactionCount === 0`
(`settlement-view.ts:187-193`), they render different `data-testid`s (`settlement-no-qualifying` vs
`settlement-settled`) in separate `if` blocks, and the E2E helpers `expectEveryoneSettled` /
`expectNoQualifyingTransactions` each assert the _other_ testid has count 0. Canonical A/G route to
one helper and H to the other, which is what proves the distinction.

Manually confirmed invalid-data honesty in the real app: zeroing both owners produced

```
Settlement incomplete | 1 transaction needs attention and is excluded from the amounts below. | Account ownership is invalid
```

with `settledClaimCount: 0` and `obligationRowCount: 0`. **No misleading total was produced.**
Deleted/unknown labels are stable and ID-derived (`Name (deleted)`,
`Unknown person <8-char prefix>`), covered at `settlement-view.test.ts:44-58` and E2E 574-614.

### §7 Examples A–H — **PASS, all eight individually present**

Each is an independent named `test(...)` driving the production settlement path through real UI,
with no combined case standing in for any one:

| Ex  | Test (line)                                                                | Asserted outcome                                            |
| --- | -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| A   | `canonical example A: no explicit allocations produces no obligation` (88) | `expectEveryoneSettled`                                     |
| B   | `…basic 50/50 expense makes Bob owe Me $50` (101)                          | Bob → Me `$50.00` USD                                       |
| C   | `…owner remainder makes Bob owe Me $30` (122)                              | Bob → Me `$30.00`                                           |
| D   | `…joint owners split the third person's share $18 and $12` (143)           | Charlie → Me `$18.00` **and** Charlie → Bob `$12.00`        |
| E   | `…a negative allocation reverses the direction so Me owes Bob $20` (174)   | **Me → Bob** `$20.00` — direction reversed                  |
| F   | `…income makes the receiving owner owe Bob $50` (197)                      | +$100 income, Me → Bob `$50.00`                             |
| G   | `…equal joint ownership with no allocations produces no obligation` (218)  | `expectEveryoneSettled`                                     |
| H   | `…a status without Treat-as-Paid produces no obligation` (233)             | `expectNoQualifyingTransactions` (neutral, **not** settled) |

D and E in particular assert the exact canonical split and the reversed direction, not merely "an
obligation exists." All eight passed twice under `--repeat-each=2 --retries=0`.

### §15.3 12-step journey and matrices — **PASS**

One `test.step()` per canonical step (spec lines 264-418). Step 12 asserts what it claims: `-101`
and `101` are rejected with `aria-invalid="true"` and a `role="alert"`, and after Escape the cell
still reads `-20%` — **the original is preserved, not clamped to ±100** (lines 375, 384). A real
`ControlOrMeta+v` clipboard paste (not a synthetic fill), Escape-preserves and blur-saves are all
covered. Step 8 asserts the ID-addressed row is `aria-selected="true"`.

Matrices present and asserting their claims: multi-currency (separate USD/EUR sections **and**
`not.toContainText("70.00")` — no grand total), add-row, imported/existing edit, bidirectional
netting retaining both signed sources, deleted Person, invalid ownership, and a combined
keyboard/accessibility/responsive/dark/reduced-motion test.

### Accessibility, responsive, contrast — independently reproduced

Manual repository-installed CLI, disposable sessions `p16e-rev-01`/`p16e-rev-02`, against product
HEAD `be82ad0`. Identity created through the masked flow; the recovery phrase was **never revealed,
read, copied or emitted**.

- **Role/name/state:** expected an expandable button naming both parties. Observed `role=button`,
  accessible name `Bob Me $50.00`, `aria-expanded="false"` → `"true"` after activation, and
  `aria-controls="settlement-sources-USD:3d6d8db6-…:person-default-me"` — keyed by **stable person
  IDs**, not names or indices.
- **Reflow at 320px:** `documentElement.clientWidth === scrollWidth === 320` — no horizontal
  overflow; obligation text unchanged under `colorScheme: dark` + `reducedMotion: reduce`.
- **Contrast:** the `$50.00` amount resolves as `lab()` on an `oklab()` background, so a naive
  `getComputedStyle` parse yields a bogus **1.01** — I reproduced that trap, discarded it, and
  rasterized both colors to sRGB via a 1×1 canvas: foreground `[2, 6, 24]` on background
  `[248, 250, 252]` = **19.27:1** against a 4.5:1 threshold — **passes**. This independently
  reproduces the implementer's figure to the hundredth.
- **Console/network:** 0 console errors, 0 failed requests, 0 responses ≥400 across a full People →
  expand → keyboard-navigate flow.

### Secret-safety — **PASS**

Diff-wide scan for
`seed phrase|recovery phrase|mnemonic|masterKey|JWT_SECRET|SERVICE_ROLE|crypto_box|secretKey|privateKey|BEGIN .*PRIVATE`
over `src/ tests/ README.md` returns one hit: the pre-existing marketing line in `README.md:13`
("Your 12-word recovery phrase IS your identity") — prose, no material. Fixtures use synthetic names
only. I inspected all 76 request URLs from a live session for `Tracked settlement`, `Bob`, `50.00`,
`seed`, `phrase`, `key=` outside static assets: **zero leaks**. The deep link carries only an opaque
UUID.

### RED→GREEN "engine-right/fixture-wrong" corrections — **PASS**

Evidence §9 claims both corrections changed only tests. Verified structurally, which is stronger
than reading the narrative:
`git diff --name-only be82ad0^ be82ad0 -- src/lib/ src/components/features/transactions/` returns
**0 files**. The engine, the allocation primitive and the entire P16D grid are byte-identical to
BASE. It was therefore _impossible_ for either correction to have adjusted the engine or the grid to
make a wrong result look right. The multi-currency fixes live in `tests/` only.

---

## 3. Blocking finding

### F-1 (BLOCKER) — the deep-linked row cannot be deselected, and a later bulk delete destroys it

**Where:** `src/app/(app)/transactions/page.tsx`, `selectedTransactionIds` (the P16E glue):

```ts
const selectedTransactionIds = useMemo(() => {
    const explicit = new Set([...selectedIds].filter((id) => displayedTransactionIds.has(id)));
    if (requestedTransactionId != null && displayedTransactionIds.has(requestedTransactionId)) {
        explicit.add(requestedTransactionId);
    }
    return explicit;
}, [displayedTransactionIds, requestedTransactionId, selectedIds]);
```

`requestedTransactionId` is unioned in on **every render** for as long as the `?transaction=` param
is in the URL. It is derived, so it is not backed by `selectedIds` and the user's deselection has
nowhere to land. The URL param is never consumed or cleared after the reveal (the effect clears
`transactionIdToReveal`, but the param itself persists), so the row is permanently, invisibly sticky
— and `selectedTransactionIds` is the exact set every bulk handler iterates (`handleBulkDelete` at
`page.tsx:431-447`, and `handleBulkSetTags/Status/Account/Notes/Amount`).

**Reproduction (real app, manual CLI, product HEAD `be82ad0`):**

1. Create a vault, add Bob, create two Treat-as-Paid transactions `t1` and `t2`.
2. Open `/transactions?transaction=<t1>`. → `t1` `aria-selected="true"` (correct, intended).
3. Click `t1`'s checkbox to **deselect** it. → still `aria-selected="true"`. Deselection silently
   fails.
4. Click `t2`'s checkbox. → bulk bar reads **"2 selected"** when the user selected exactly one.
5. Click **Delete** and confirm. → **both `t1` and `t2` are deleted.** Observed:
   `{ t1StillPresent: 0, t2StillPresent: 0 }`.

**Control proving this is caused by the P16E glue and not pre-existing behaviour:** on the same page
with **no** `?transaction=` param, check-then-uncheck of `t1` works normally —
`baselineAfterCheck: "true"`, `baselineAfterUncheck: "false"`. The sticky behaviour appears only
when the P16E param is present.

**Why blocking.** This is user-data destruction from an ordinary interaction, reached through the
P16E-introduced navigation path, with no warning: the row the user explicitly deselected is deleted.
Under HANDOFF's blocker list it is both a "misleading total" in the selection sense (the bulk bar
misreports intent) and a data-loss risk; `.claude/rules/coding-style.md` ("Make illegal states
unrepresentable") and the canonical §17 bullet on preserving user data both point the same way. The
existing suite does not catch it because every P16E selection assertion checks only that the target
_is_ selected — none asserts it can be **deselected**, and no test combines a deep link with a bulk
action.

**Suggested fix (implementer's call).** Treat the param as a one-shot intent rather than a standing
override: on first observation seed it into real `selectedIds` state (alongside the existing reveal
effect, which already has a `revealedIdRef` one-shot guard) and clear the param via
`router.replace("/transactions")`. Selection then lives entirely in `selectedIds`, deselection
works, and the deep link still lands selected. A regression test should assert (a) the deep-linked
row can be deselected, and (b) a bulk action after deselection does not touch it.

---

## 4. The two flagged adjudications

### A. Benchmark shortfall (Q-PROPOSAL-P16E-01-001) — **within the canonical branch; ACCEPTABLE. Not a scope reduction.**

Ruling on the merits from the frozen text, on grounds independent of convenience.

The canonical §14 clause (spec lines 582-584) reads: 100,000 transactions "should meet the existing
account-balance target of approximately 200ms in a production build on the project's benchmark
environment, **or provide measured evidence and a documented optimization follow-up**." The P16B
clause in the task (lines 98-100) is more explicit still: "Benchmark 100,000 transactions against
approximately 200ms in production build, **or provide measured evidence and a documented
optimization follow-up without claiming the target passed**."

This is a genuine disjunction written into the frozen text — a two-branch requirement, not a target
with an excuse attached. The second branch is satisfied when three things hold, and I verified each
independently rather than accepting the implementer's account:

1. **Measured evidence exists and is real.** I re-ran the benchmark myself and got 0.93–1.10s —
   _worse_ than the reported 0.76–0.86s. The implementer did not report a flattering number; if
   anything they reported a favourable one relative to my noisier box. Correctness output is exact
   and unchanged (100,000 qualifying, 75,000 contributions, 2 obligations, 0 issues, conservation
   true).
2. **The target is explicitly NOT claimed as passing.** Evidence §6 is headed "Benchmark disposition
   (honest, not a pass claim)" and states the target is "**NOT met**." Option (c) — excluding
   projection cost to manufacture a pass — was rejected outright and the reasoning recorded. That is
   precisely the failure mode the clause's "without claiming the target passed" language forbids,
   and it was refused.
3. **Near-linearity, which §14 separately requires, holds.** §14's own scaling requirement ("linear
   or near-linear in transactions plus allocation/owner entries") is a distinct bullet from the
   200ms bullet, and it is met on both the implementer's run (10.1x for 10x input) and mine
   (~11.2x). The engine is not superlinear; it is uniformly slower by a constant factor.

The residual cost sits inside the P16B engine's defensive `snapshotMaterialized*` boundary — code
that is **byte-unchanged in this range** (`src/lib/**` shows 0 changed files) and that a prior
immutable P16B/05 FAIL review specifically _required_ for exact-key `$cid` handling and invalid-data
honesty. Optimizing it inside P16E would mean reopening a passed package's independently reviewed
semantics, trading invalid-data honesty for raw speed — which the decision hierarchy ranks backwards
(security/privacy/data-preservation at 3 outranks a performance preference).

So this is **not** a reduction of committed scope and **not** a supersession of the 200ms target.
The committed scope was always "meet 200ms **OR** measure honestly and carry a follow-up," and the
second branch was taken and satisfied. The 200ms target is not abandoned — R-020 stays open and the
reversal path (a fast path in `snapshotMaterializedRecord`/`Array` behind the existing benchmark, no
API or data change) is recorded. Because I judge it inside the canonical branch, no escalation to an
independent scope adjudicator is required. Root should still transcribe Q-PROPOSAL-P16E-01-001 so
the human product judgement ("is ~0.8-1.0s at 100k acceptable, or schedule an optimization
package?") survives to after-the-fact audit.

### B. E2E console allowlist — **narrow and non-masking; ACCEPTABLE.**

The allowlist is `/SyncManager error|Failed to push to server|Failed to fetch|ERR_ABORTED/`
(`people-settlement.spec.ts:49-50`). I verified rather than assumed:

- The first two alternatives are **exact, unique literal strings** from known non-settlement
  sources: `console.error("SyncManager error:", …)` at
  `src/components/providers/vault-provider.tsx:203` and
  `console.error("Failed to push to server:", …)` at `src/lib/sync/manager.ts:888`. Both are
  grep-confirmed as the only occurrences in `src/`.
- `Failed to fetch` and `ERR_ABORTED` are browser-emitted transport strings;
  `grep -rn "Failed to fetch" src/` returns **no product source**, so no P16E code path can author
  them.
- **No People/settlement code can produce a console error at all:**
  `grep -rn "console\." src/components/features/people/` returns nothing. There is no console call
  in `BalanceSummary.tsx`, `settlement-view.ts` or `settlement-allocations.ts` to be masked.
- The assertion is not vacuous: it is `expect(consoleErrors).toEqual([])` — everything outside the
  four alternatives is fatal. React errors, hydration warnings, thrown render errors and failed
  non-transport requests all still fail. The suite also independently flags any response ≥500.
- Corroborated live: my manual session logged **0 console errors and 0 failed requests** with **no
  allowlist applied at all** — the unfiltered surface is genuinely clean, so the filter is not
  hiding anything in practice.

The noise is real, local-stack, and reproduces on the pre-existing suite (I observed
`tRPC failed on sync.pushOps: Request authentication failed` in the full 140-test run too). It
belongs to the sync package, not P16E. Not a finding.

---

## 5. Q proposals transcribed for root

The implementer raised exactly one, reproduced verbatim in evidence §13: **Q-PROPOSAL-P16E-01-001 —
"Strict 100k/200ms settlement target is not met; carry the measured follow-up."** I concur with its
reversible default (option (a)) for the reasons in adjudication A. Root should transcribe it and
link R-020.

I raise no new Q proposal. F-1 is a straightforward defect with an authority-clear fix, not a
question needing new authority.

---

## 6. UX verdict

The settlement surface itself is genuinely good work: honest states, no cross-currency total
_structurally_ prevented rather than merely avoided, real explicit/effective traceability, stable
labels for deleted/unknown people, clean keyboard and 320px reflow, 19.27:1 contrast, and an
engine-consuming design that adds no second implementation and no cache. Examples A–H are all
individually present against the production path, and the RED→GREEN corrections provably could not
have touched the engine.

The single blocker is in the glue, not the settlement model: a deep-linked row that cannot be
deselected and is silently swept into bulk delete. That is user-data destruction on an ordinary
interaction and must be fixed and re-reviewed before P16E can pass.

**VERDICT: CHANGES_REQUESTED** — 1 blocking finding (F-1). Adjudication A: acceptable, no
escalation. Adjudication B: acceptable.
