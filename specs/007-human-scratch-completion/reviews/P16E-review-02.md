VERDICT: PASS

# P16E / revision 02 — independent review

- **Reviewer:** `p16e-reviewer-02` (human_scratch_reviewer), distinct from `p16e-implementer-02` and
  from `p16e-reviewer-01`
- **Review range:**
  `191d0707f5e6dbfa5871dbddaa7318b9a14885dd..bb12e0c86e0a42ec682ab7a67df5b1a355084559`
- **Product HEAD reviewed:** `bb12e0c86e0a42ec682ab7a67df5b1a355084559` — unchanged at verdict time
- **Rev-02 delta:** exactly one product commit, `bb12e0c`
- **Blocking findings: 0**
- **F-1 (the rev-01 blocker): genuinely fixed** — reproduced end-to-end in the real app, including
  the data-loss path
- **Adjudications A and B:** not re-opened. Rev-02 touches no engine code and no console assertion
  (verified: `src/lib/**` = 0 changed files across the whole range; `tests/` delta is one file). The
  settled dispositions stand unchanged.

Nothing was committed. No ledger, scratch, SCOPE, task, canonical source or implementer evidence was
edited.

---

## 1. Reproduction notes

### Delta scope — established independently

`git diff --name-status d79a630..bb12e0c`:

```
M	src/app/(app)/transactions/page.tsx
M	src/components/features/people/README.md
M	tests/e2e/people-settlement.spec.ts
```

Exactly the three authorized paths, no more. `git log --oneline 191d070..bb12e0c` shows six commits:
two product (`be82ad0`, `bb12e0c`) and four root ledger (`1712d29`, `d5733e1`, `839665d`,
`d79a630`). The only commit beyond `bb12e0c` is `052e379`, which touches only `HANDOFF.md` and
`PROGRESS.md` — ledger only, so the assigned product HEAD is intact and no escalation to root is
warranted on that ground.

### Boundaries over the whole range `191d070..bb12e0c` — all EMPTY

| Boundary                                          | Command                               | Result      |
| ------------------------------------------------- | ------------------------------------- | ----------- |
| `src/lib/**` (settlement engine)                  | `git diff --name-only … -- src/lib/`  | **0 files** |
| P16D grid `src/components/features/transactions/` | `git diff --stat … -- <dir>`          | **0 bytes** |
| `supabase/**` (migrations)                        | `git diff --name-only … -- supabase/` | **0 files** |
| Three realtime paths                              | `git diff --name-only … -- <3 paths>` | **0 files** |
| `vault_ops` in the product diff                   | grep over the `src/ tests/` diff      | **0 hits**  |

Single-engine invariant intact: `grep -rn "calculateSettlementBalances" src/` returns the definition
in `src/lib/domain/settlement.ts` (1), the re-export in `src/lib/domain/index.ts` (1) and the sole
consumer `src/components/features/people/BalanceSummary.tsx` (2). No second or forked engine. Cache
scan
(`settlementCache|persistSettlement|saveSettlement|localStorage.*settle|idb.*settle|cacheSettle`)
over `src/ tests/` returns **0** — no settlement cache or persistence. No cross-currency total
field: `grandTotal|crossCurrency|totalAcross` over `src/components/features/people/` returns **0**.

### Frozen-source integrity

`sha256sum specs/008-transaction-percentage-allocations-settlement/spec.md` =
`0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`; `wc -l -c` = `715` / `25441`.
Both match, verified after all my runs.

---

## 2. F-1 — reproduced in the REAL app, not merely via the tests

Repository-installed `pnpm exec playwright-cli`, disposable session `p16erev02rv`, against the
committed product HEAD `bb12e0c`, with a dev server started from the same realtime-derived
`SUPABASE_JWT_SECRET` the Playwright config uses. Local Supabase stack healthy (`supabase_db`,
`supabase_realtime`, `supabase_kong` all up). Identity created through the real masked onboarding
flow with the reveal control **deliberately never clicked** — the recovery phrase was never
revealed, read, copied or emitted. No Playwright MCP, no `npx`, no ad-hoc script, no temporary test
or config, no `--headed`/`--ui`/`--debug`/`show`, no arbitrary sleep as a synchronisation device.

Data built entirely through production controls: Bob added on People; two 50/50 `-100.00` Paid
transactions and two `-40.00` Paid transactions created through real grid cells (the extra pair came
from an interrupted first attempt and made the scenario stricter, not weaker — four rows, two
obligation sources).

The **canonical §13 entry path** was used, not a hand-typed URL: People page → expand the obligation
→ click the real "View transaction" link. `aria-expanded` went `false` → `true`, and the two links
resolved to `/transactions?transaction=<uuid>` — stable IDs, never indices.

### All four required behaviours confirmed

**(1) Lands SELECTED and REVEALED.** After clicking the real link:

```
{ url: "http://localhost:3000/transactions", selected: "true", highlighted: true,
  inViewport: true, toolbar: "Add transaction 4 transactions· 1 selected",
  totalSelectedRows: 1 }
```

The row carries the `selected` highlight class, is scrolled into the viewport, and **exactly one**
row is selected — the landing does not over-select.

**(2) The URL param is cleared (one-shot).** The URL had already been reduced to `/transactions` on
arrival. Sampling the URL 13 times over ~3s on a cold direct navigation showed exactly two distinct
values — the `?transaction=…` entry URL and the cleared `/transactions` — and `history.length` grew
by exactly **1** (the navigation itself). No replace loop, no history pollution.

**(3) The row is DESELECTABLE.** Clicking the checkbox gave `aria-selected: "false"`, toolbar
`"Add transaction 4 transactions"` (no count) and bulk bar count `0`. I then forced additional
renders — mouse wheel scroll plus a viewport resize — and re-read the attribute: still `"false"`.
The deselection sticks rather than snapping back.

**(4) The data-loss path is CLOSED.** After deselecting the deep-linked row I selected a different
row: `{ t1: "false", t2: "true" }`, toolbar `· 1 selected`, bulk bar `"Edit 1 …"` — where the rev-01
review observed **"2 selected"**. Bulk delete + confirm produced:

```
{ t1Present: 1, t2Present: 0, remainingRows: 3 }
```

**Only the row the user actually selected was deleted; the originally deep-linked row was
preserved.** This is the exact destructive sequence that destroyed user data at rev-01, and it is
now safe.

### Edge cases beyond the dispatch's four, probed independently

- **No first-paint selection flicker — measured, not assumed.** I installed an init script with a
  `MutationObserver` recording every `aria-selected` value the target row ever holds from the moment
  it is attached. The complete history for the target across a cold deep-link navigation was a
  single entry: `init:eef1e2d5:true`. The row is _already_ selected on its first observed DOM state;
  there is no unselected→selected transition to flicker. This validates the implementer's stated
  reason for seeding during render rather than in an effect.
- **Async vault load.** The cold direct navigation (worst case — the vault is not yet loaded when
  the param is first read) landed correctly. The guard leaves the intent _pending_ rather than
  consuming it against an empty list, which is the right failure mode.
- **Unknown / stale ID.** `?transaction=00000000-…` left 0 rows selected, rendered the grid
  normally, produced no console error and no loop. The param is retained (intent stays pending)
  rather than being falsely consumed — correct, and harmless since nothing is selected.
- **Revisiting the same source twice.** Deep-link → deselect → deep-link the _same_ ID again → the
  row is selected again. `landedSourceId` resetting on a null param genuinely works; the intent is
  not permanently spent.
- **Mechanism termination, read from the source.** The render-phase branch at `page.tsx:225-243` can
  only fire when `requestedTransactionId !== landedSourceId`; its first statement sets
  `landedSourceId = requestedTransactionId`, so the very next render takes `pendingSourceIndex = -1`
  and the branch is dead. The reset branch fires only when the param is `null` and
  `landedSourceId != null`, and sets it to `null`. Both directions are strictly decreasing — no
  ping-pong is representable. The `router.replace` effect is likewise gated on
  `requestedTransactionId === landedSourceId`, which can hold at most once per navigation.
- **`selectedTransactionIds` is BASE-form.** `git diff 191d070..bb12e0c` confirms
  `selectedTransactionIds`, `displayedTransactions` and `hasMore` are byte-identical to BASE — the
  param term is gone entirely. Rev-01's `focusedSourceIndex`, `effectiveDisplayCount` and
  `revealedIdRef` are all removed (`grep` over the file confirms zero occurrences), and the reveal
  effect is back to its BASE shape keyed on `transactionIdToReveal` alone. The net P16E surface in
  this file is now _smaller_ than at rev-01.

### No P16D regression on the landed row

From the deep-linked row: `ArrowDown` kept grid keyboard focus inside the row model,
`Edit Bob allocation` / `Edit Me allocation` cells were present (count 2) with correct accessible
names, and clicking one opened the allocation textbox editor. The P16D grid behaves identically on a
row reached through the P16E deep link.

### Accessibility, responsive, dark/reduced-motion, contrast

- **Role/name/state:** the row is `role="row"`, `aria-selected="true"`, `tabindex="0"`. Its real
  control is `role="checkbox"` with `aria-checked="true"` — expected an operable checkbox reflecting
  selection state, observed exactly that. **Keyboard-only deselection works**: focus the checkbox,
  press Space → `aria-checked: "false"` and the row's `aria-selected: "false"`.
- **Reflow at 320px under `colorScheme: dark` + `reducedMotion: reduce`:** the deep link still
  landed selected with the param cleared, and `documentElement.clientWidth === scrollWidth === 320`
  — no horizontal overflow.
- **Contrast (rasterized to sRGB via canvas, not a naive `getComputedStyle` parse):** selected-row
  text `[2,6,24]` on selected background `[241,245,249]` = **18.40:1** against a 4.5:1 threshold;
  selected vs unselected row background = **19.17:1** against a 3.0:1 non-text threshold. Both pass.
- **Console / network:** 62 console entries across the entire manual session, **0 errors and 0
  warnings** — with no allowlist applied at all. 64 requests on the deep-link navigation, **0
  responses ≥400**.

### Non-blocking observation (NOT a finding against this range)

The row selection checkbox's accessible name renders as `"Select transaction "` with an empty
trailing description. This comes from `ariaLabel={`Select transaction
${effectiveData.description}`}` at `src/components/features/transactions/TransactionRow.tsx:274` —
P16D-owned code that is **byte-unchanged across this entire range** (0 changed files under the grid
dir). In my session all rows showed an empty description because the descriptions I typed did not
persist to the row model before the assertion, so the name degrades to a bare prefix; the control is
still discoverable, focusable and operable by role. This is pre-existing P16D territory, not
attributable to P16E, and I do not raise it as a P16E finding. I note it only so root can route it
if it recurs at P21.

---

## 3. RED → GREEN honesty — verified structurally, not from the narrative

I reproduced the RED myself rather than accepting the evidence. Reverting **only** the product file
(`git checkout d79a630 -- 'src/app/(app)/transactions/page.tsx'`) while keeping the new tests in
place, then running the two new tests:

```
2 failed
  › View transaction deep link › the deep-linked row lands selected and revealed, and can then be deselected
  › View transaction deep link › a bulk delete after deselecting the deep-linked row preserves it
```

with the failure on the real defect — `expect aria-selected "false", received "true"` at
`people-settlement.spec.ts:812`, the deselection assertion, against a row whose live class list is
`… bg-accent focused selected`. That is the rev-01 bug, not a strawman. I restored `bb12e0c` and
confirmed the product tree is byte-identical to the assigned HEAD.

GREEN corrections live only in tests:
`git diff --name-only d79a630 bb12e0c -- src/lib/ src/components/features/transactions/` returns **0
files**, so it was _impossible_ for the engine or the grid to have been altered to fake a pass. The
rev-02 test delta is a single file (`tests/e2e/people-settlement.spec.ts`), additive only — a new
`test.describe("View transaction deep link")` block; no existing assertion was weakened or deleted.

The two new tests are meaningful, not tautological: they assert the §13 landing (`aria-selected`,
`toBeInViewport`, `1 selected`) _and_ the URL reduction _and_ the deselection _and_ the
preserve-on-bulk-delete, ending with a People-page settlement assertion so the surviving row is
proved still to drive its obligation. Selectors are stable-ID and testid based; no sleeps, no hidden
retries, no test-only product hooks.

---

## 4. Gates — re-run by me, not taken on trust

| Gate                                                        | My result                                                                                                                                                                                 |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                                            | **clean, exit 0**                                                                                                                                                                         |
| `pnpm lint`                                                 | **0 errors**, 10 warnings — all pre-existing unused-imports in untouched `tests/unit/crdt/*` and `src/lib/crdt/queries.ts`                                                                |
| `pnpm eslint` on the changed product file alone             | **no output — clean**                                                                                                                                                                     |
| `pnpm format:check`                                         | fails on **15 `specs/**`files only**, all untouched by this range (Q-024) — not attributable. Scoped`oxfmt --check` over the 3 changed paths: "All matched files use the correct format." |
| `pnpm test`                                                 | **84 files, 1735 passed, 2 skipped** — exactly matches the evidence                                                                                                                       |
| `pnpm exec playwright test --retries=0 --workers=4` (full)  | **142/142 passed (3.2m)**, zero failures, zero flaky                                                                                                                                      |
| `people-settlement --repeat-each=3 --retries=0 --workers=4` | **54/54 passed (1.5m)**, zero flaky                                                                                                                                                       |

142 is 140 + exactly the two new regression tests. No P16D grid, keyboard, selection or bulk-edit
test regressed. Retries were disabled throughout. A local Supabase container was available, so
nothing here is passed on unverified evidence.

---

## 5. No regression of rev-01's passing acceptance

Rev-02's product delta is confined to the deep-link glue in one file, so rev-01's settlement
acceptance is structurally untouched; I confirmed the surface anyway:

- **All eight §7 Examples A–H** remain individually named tests (A at line 88 through H at 233), all
  passing three times over under `--repeat-each=3 --retries=0`.
- **§15.3 12-step journey** present (23 `test.step()` calls across the file), 18 tests in the spec.
- **Distinct settled / neutral / incomplete states** still render separate testids
  (`settlement-settled`, `settlement-no-qualifying`, `settlement-incomplete-count`) with helpers
  that assert the _other_ testid has count 0 — the distinction is enforced, not implied.
- **Per-currency sections with no cross-currency total:** one `settlement-currency-section-USD` in
  my manual session, obligation `Bob Me $100.00`, card text ending "Each currency is settled
  separately" with no grand total anywhere; zero `grandTotal|crossCurrency|totalAcross` tokens in
  the People feature.
- **Explicit + effective allocations** shown separately: my grid cells reported
  `Explicit: 50%. Effective: 50%. Owner remainder: …`.
- **Stable-ID source navigation:** both "View transaction" hrefs were
  `/transactions?transaction=<uuid>`; the route matches on `transaction.id`, never an index.

---

## 6. Secret-safety — PASS

Diff-wide scan of every added line across `191d070..bb12e0c` in `src/ tests/` for
`seed phrase|recovery phrase|mnemonic|masterKey|JWT_SECRET|SERVICE_ROLE|crypto_box|secretKey|privateKey|BEGIN .*PRIVATE`
returns **nothing**. A live scan of all request URLs from the deep-link navigation for the
transaction descriptions, `Bob`, `100.00`, `seed`, `phrase`, `recovery` and `key=` returned **zero
leaks**. The deep link carries only an opaque UUID. The implementer's evidence contains no key,
seed, phrase or secret material. The recovery phrase was never revealed in my session.

---

## 7. Q proposals transcribed for root

**I raise no new Q proposal.** Rev-02 raised none either.

Rev-01's `Q-PROPOSAL-P16E-01-001` — "Strict 100k/200ms settlement target is not met; carry the
measured follow-up" — is unchanged and still awaiting root transcription (link R-020). Rev-02
changed no engine code (`src/lib/**` = 0 changed files across the whole range), so its disposition
under §14's measured-evidence-with-follow-up branch is untouched. I did not re-litigate it, as the
dispatch directs.

---

## 8. UX verdict

The fix is smaller and cleaner than the defect it replaces. Rev-01 layered a derived selection
override on top of real selection state; rev-02 removes that layer entirely and returns
`selectedTransactionIds`, `displayedTransactions` and `hasMore` to their BASE form, consuming the
deep link once into the state the user actually owns. The result is that a row reached from the
People page behaves exactly like any other row from the moment it lands — which is the correct
mental model, and is why the data-loss path closes rather than being patched around.

The one design choice worth scrutiny, seeding during render rather than in an effect, is justified
and I verified the justification rather than accepting it: the MutationObserver trace shows the row
is selected on its first observed paint, so the no-flicker claim is real, and the guard provably
terminates in both directions. Landing, reveal, param-clearing, deselection, bulk-delete
preservation, repeat navigation, unknown IDs, cold loads, keyboard operation, 320px dark reflow and
18.40:1 contrast all hold in the real app.

**VERDICT: PASS** — 0 blocking findings. F-1 is genuinely fixed, boundaries are clean, no acceptance
regressed, and all gates pass independently.
