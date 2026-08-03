# Q-P20B-26 — discriminating experiment

**ANSWER: the entry is ABSENT from persisted IndexedDB state. This is a genuine lost write, not a
rehydration/derivation gap.** MEASURED, 50 reproductions in 195 runs, zero counterexamples.

The write never reaches storage: no op row is ever created for it, before the navigation, after the
navigation, after the reload, or 8 s later. It is not on the server either.

---

## 1. The discriminator and its result

| Outcome of a barrier-confirmed write, after the reload | Runs | Op row created for that write? |
| ------------------------------------------------------ | ---- | ------------------------------ |
| **missing** from the UI                                 | 50   | **never** — 0 / 50             |
| present in the UI                                       | 145  | **always** — 145 / 145         |

MEASURED. Arms C, D and E across four campaigns; correlation checked mechanically over every verdict
line in `/tmp/q26-logs/campaign{2,3,4,6}*.log`:

```
runs=195 losses=50 consistent=195 counterexamples=0
```

There is no run in which the entry was present in IndexedDB and absent from the UI. The
rehydration/derivation branch of the question is not merely unsupported — it never occurred.

## 2. The raw dumps

One complete losing run, serial worker, no interleaving — `/tmp/q26-logs/campaign7-armD-serial.log`
lines 6–50. Arm D is the captured journey exactly: `setAllocation(Me,50)` → `setAllocation(Bob,50)`
→ `goToTransactions()` → `reload()`, with nothing inserted between Bob's barrier and the navigation.

```
D/0-before-bob ops=6 snapshots=1 stores=ops,snapshots,sync_meta
D/0-before-bob   op[0] id=cf121da5 vv=Aqnbo+GK5+acdzCzv53HlZ7+kc8BBg== pushed=1 len=316 at=1785725638705
D/0-before-bob   op[1] id=fe09d425 vv=A5yFvKb2hs/s+AEwqduj4Yrn5px3MLO/nceVnv6RzwEG pushed=0 len=720 at=1785725639221
D/0-before-bob   op[2] id=54938aab vv=A5yFvKb2hs/s+AFAqduj4Yrn5px3MLO/nceVnv6RzwEG pushed=0 len=524 at=1785725639304
D/0-before-bob   op[3] id=35aca356 vv=A5yFvKb2hs/s+AFCqduj4Yrn5px3MLO/nceVnv6RzwEG pushed=0 len=172 at=1785725639379
D/0-before-bob   op[4] id=2f33565e vv=A5yFvKb2hs/s+AFEqduj4Yrn5px3MLO/nceVnv6RzwEG pushed=0 len=188 at=1785725639735
D/0-before-bob   op[5] id=ddfe21be vv=A5yFvKb2hs/s+AFGqduj4Yrn5px3MLO/nceVnv6RzwEG pushed=0 len=184 at=1785725639965
D/0-before-bob   snapshot {"data_len":2076,"updated_at":1785725638423,"vault_id":"547747d1-...","version_vector":"{}"}

  << setAllocation(row, "Bob", "50") — barrier `Explicit: 50%.` confirmed in the live DOM >>
  << goToTransactions() >>

D/1-after-goto ops=6      (op[0..5] byte-identical, all now pushed=1; NO op[6])
D/2-after-reload ops=6    (op[0..5] byte-identical; NO op[6])
D/post-reload DOM Me="50%Explicit: 50%. Effective: 100%. Owner remainder: 50%."
D/post-reload DOM Bob="—Explicit: not stored. Effective: 0%. Owner remainder: 50%."
D/settled-8s  DOM Bob="—Explicit: not stored. Effective: 0%. Owner remainder: 50%."
D/3-settled-8s ops=6      (still no op[6], 8 s after the reload)
D/SETTLE bobStillLost=true opsSettled=6
D/VERDICT meLost=false bobLost=true opsBeforeBob=6 opsAfterGoto=6 opsAfterReload=6
```

The two DOM lines reproduce the originally captured failure verbatim
(`/tmp/rev08-artifacts/zz-rev08-fb-control-F-B-PR-52aba-ocation-is-genuinely-stored-chromium/error-context.md`
lines 168–174), including Me's `Effective: 100%. Owner remainder: 50%.`

A surviving run from the same file, for contrast — one extra op row and both cells present:

```
D/1-after-goto ops=7
D/1-after-goto   op[6] id=f12ef9a4 vv=A57unKWnnNjAR0jfsf3Y1OerloQBMIXsitmf+8GiOwY= pushed=1 len=212 at=1785725652548
D/post-reload DOM Me="50%Explicit: 50%. Effective: 50%. Owner remainder: 0%."
D/post-reload DOM Bob="50%Explicit: 50%. Effective: 50%. Owner remainder: 0%."
D/VERDICT meLost=false bobLost=false opsBeforeBob=6 opsAfterGoto=7 opsAfterReload=7
```

MEASURED. `encrypted_data` is opaque to the probe, but `version_vector` is stored plaintext
(`/home/ben-agents/Code/moneyflow/src/lib/sync/persistence.ts:24`) and is captured from the doc
frontier at enqueue time (`/home/ben-agents/Code/moneyflow/src/lib/sync/manager.ts:304`), so an
absent row with an unadvanced frontier is direct evidence that no doc change reached storage. The op
ids are byte-identical across all four checkpoints, so nothing was written and later removed, and no
snapshot compaction occurred (`snapshots` stayed at 1 with an unchanged `updated_at`).

## 3. Per-arm results

All arms run against product code byte-identical to repo `HEAD` = `10a290d` (§7).

| Arm       | Shape                                                                          | Losses      |
| --------- | ------------------------------------------------------------------------------ | ----------- |
| A         | two writes, **IndexedDB poll inserted** between barrier and nav                | **0 / 70**  |
| B         | three writes, **IndexedDB poll inserted** between each barrier and nav         | **0 / 70**  |
| C         | `setAllocation(Bob)` → `reload()` immediately                                  | **21 / 70** |
| D         | the captured journey: `setAllocation(Bob)` → `goToTransactions()` → `reload()` | **17 / 70** |
| E         | arm D with the write order swapped (`Bob` first, then `Me`)                    | **12 / 55** |
| F         | `createTransaction()` → `reload()` immediately (corrected oracle)              | **0 / 28**  |
| F-control | arm F with durability allowed before the reload                                | **0 / 28**  |

MEASURED. Per-campaign breakdown in `/tmp/q26-logs/campaign{2,3,4,6}*.log`; arm F and F-control in
`/tmp/q26-logs/campaign{5-armF,6-final-w4-r20}.log`. Every run used
`env -u CI pnpm exec playwright test --config=playwright.q26.config.ts --retries=0 --workers=4 --repeat-each=<N>`.

Arms A and B differ from C/D/E **only** by the IndexedDB poll inserted between the barrier and the
navigation. That poll is what makes the difference: 0 losses in 140 runs with it, 50 in 195 without.

## 4. The sub-questions the brief asked about

**Is the losing write always the second write into the map?** No — MEASURED. In arm E the write
order is reversed and the lost write is `Me` (12/12 losses `meLost=true bobLost=false`,
`/tmp/q26-logs/campaign{3,4,6}*.log`). The loss follows _adjacency to the document teardown_,
not position in the allocation map and not which person.

**Per-key or whole-map?** Per-key — MEASURED. In every arm D loss `meLost=false`; in every arm E
loss `bobLost=false`. Exactly the one write adjacent to the teardown is missing; the rest of the map
survives. INFERRED from `manager.ts:292-345`: each mirror commit is its own op, so "per key" here is
really "per op", and the two coincide because each cell edit is one commit.

**Is `Saved` reported before the data is durable?** Not observed, and I would not claim it.
MEASURED: in 350/350 samples taken ~2 ms after the barrier returned, the indicator read `Saving...`
_and_ the op was already durable — so I never caught the indicator over a non-durable write.
INFERRED from code: the indicator cannot function as a durability barrier regardless —
`hasUnsavedChanges` comes from `usePollUnsavedChanges(vaultId, 2000)`
(`src/app/(app)/layout.tsx:161`), a 2 s poll of IndexedDB, and `setSyncState("saving")` only runs
_after_ `appendOp` resolves (`manager.ts:346-348`). Both signals are downstream of, or staler than,
the write they would be vouching for.

**Undo/redo (F-2) vs a direct cell edit.** NOT MEASURED. I did not build an undo arm; INFERRED from
`manager.ts:292` that both paths go through the same `subscribeLocalUpdates` queue, but that is an
argument from reading, not a measurement, and should not be relied on.

**Does the class extend beyond allocations?** Not demonstrated. Arm F (create a transaction, reload
at once) lost nothing in 28 runs. So the `51 transactions` observation in `/tmp/p20b07-F2-repro/` is
**not** shown by this experiment to be the same class — treat it as a separate open question.

## 5. Mechanism

INFERRED — consistent with every measurement above, but the causal step is read from code, not
measured:

`setAllocation`'s barrier waits on the cell's `Explicit:` clause, which reflects the loro-mirror
commit and the React re-render. Persistence is downstream and asynchronous: `subscribeLocalUpdates`
enqueues the update (`manager.ts:292-296`), and a queued attempt then dynamically imports the crypto
module, encrypts, and only then calls `appendOp` (`manager.ts:312-345`). The server push runs after
that (`manager.ts:388-396`), so an update that never reaches IndexedDB is never pushed either —
which is why the value does not come back from the server after the reload.

`goToTransactions` is `page.goto("/transactions")` (`tests/e2e/helpers/nav.ts:9`) — a full document
teardown, the same as `reload()`. A teardown issued in the window between the barrier and `appendOp`
discards the queued work.

MEASURED, and the reason the loss is intermittent rather than constant: the gap between the DOM
commit and the barrier returning is bimodal, because `expect().toContainText` polls. Distribution of
`op.created_at − barrierSampleTime` over 200 arm A/B writes (`/tmp/q26-logs/campaign{4,6}*.log`,
range −4 to −66 ms): a near cluster of 53 writes at −4 to −8 ms and a far cluster of 147 writes at
−37 to −66 ms. When the barrier returns in the tight cluster an immediately following teardown beats
the write; when it returns in the late cluster the write is already durable.

## 6. What I got wrong on the way, and how it was caught

Arm F initially reported `descriptionLost=true amountLost=true` in **35/35** runs
(`/tmp/q26-logs/campaign{3,4}*.log`). That was an instrument defect, not a finding: description and
amount render inside `<input>` elements, and I was reading `row.textContent()`, which never contains
an input's value — the oracle would have reported those fields lost on a perfectly intact
transaction. Rewriting it to use `inputValue()` and adding the F-control arm (which proves the
oracle can read fields that are genuinely present) turned the result to 0/28. **The 35/35 figure in
those two logs should be disregarded.**

## 7. Reproduction

- Worktree: `/tmp/mf-q26`, detached at `10a290d`, `.env.local` copied in,
  `pnpm install --frozen-lockfile`. Dev server on **:3100** (not :3000, not :3001) via
  `/tmp/mf-q26/playwright.q26.config.ts`. Remove with `git worktree remove /tmp/mf-q26 --force`.
- Product code unmodified.
  `find src tests/e2e/helpers -type f | sort | xargs md5sum | awk '{print $1}' | md5sum` →
  `e7662f03b51f3415fc5ec4b2e1eec062` in **both** `/tmp/mf-q26` and
  `/home/ben-agents/Code/moneyflow`, both at `HEAD=10a290d`. `git status` in the worktree shows only
  `next-env.d.ts` (dev-server churn) plus the two untracked probe files. Nothing was committed.
- Probe: `/tmp/q26-logs/zz-q26-idb.spec.ts.artifact` (copy of
  `/tmp/mf-q26/tests/e2e/zz-q26-idb.spec.ts`), config:
  `/tmp/q26-logs/playwright.q26.config.ts.artifact`.
- Logs — every figure above is grep-able from these: `/tmp/q26-logs/smoke.log`,
  `campaign1-w4-r12.log`, `campaign2-w4-r15.log`, `campaign3-w4-r15.log`, `campaign4-w4-r20.log`,
  `campaign5-armF.log`, `campaign6-final-w4-r20.log`, `campaign7-armD-serial.log`.
- The probe reads IndexedDB through the raw IDB API in `page.evaluate` and closes its connection
  after each dump, so it cannot block the app's own `openDB`.

## 8. Open questions this did not settle

1. Does a **client-side** in-app navigation (no document teardown) also lose the write, or is the
   exposure confined to full teardowns — reload, tab close, crash? This decides whether a real user
   can hit it or only a test that navigates within milliseconds. One arm, same probe.
2. Is the `51 transactions` case in `/tmp/p20b07-F2-repro/` this class? Arm F says transaction
   creation does not reproduce it in 28 runs, so assume not until measured.
3. Does the undo/redo path share the queue? Read, not measured.

---

# 9. Arm G follow-up — client-side navigation vs document teardown

**ANSWER: the teardown is the cause. A Next.js client-side transition does not lose the write —
0 / 70. A full document load, fired by the identical in-page trigger at the identical instant, loses
it 48 / 70 (69%).** MEASURED.

**But arm G as originally specified was confounded and its result must not be used.** Details in
§9.2; the number that answers the question comes from the matched pair in §9.3.

## 9.1 Does the sidebar link produce a client-side transition?

Yes — MEASURED, 70/70. The sidebar items are real `next/link` elements
(`src/app/(app)/layout.tsx:63-72, 386-389`). A marker planted on `window` before the write
(`__q26DocumentAlive = "alive"`) is read back after the navigation: it survives a sidebar click and
is gone after a document load. Every arm reports this, so no arm below is asserting a transition
type it did not verify:

```
G/TRANSITION  marker="alive"  clientSide=true   url=http://localhost:3100/people      70/70
J1/TRANSITION marker="alive"  clientSide=true   url=http://localhost:3100/people      70/70
J2/TRANSITION marker="<gone>" clientSide=false  url=http://localhost:3100/people      70/70
```

## 9.2 Arm G is retracted as uninformative

| Arm | Shape | Losses |
| --- | --- | --- |
| G | barrier → **Playwright click** on the sidebar `People` link (client-side) | 0 / 70 |
| G2 | barrier → `click({ trial: true })` on the same link → **`page.goto`** (teardown) | 0 / 52 |

MEASURED (`/tmp/q26-logs/campaign{8-armGH-w4-r18,9-armGH-w4-r52,11-armG2-w4-r52}.log`).

Arm G's clean 0/70 looked like "client-side navigation is safe". It is not evidence for that. A
Playwright click runs actionability checks before it dispatches, so arm G's navigation starts later
after the barrier than arm D's `page.goto` does. Arm G2 pays exactly that cost —
`click({ trial: true })` performs the identical checks and then does *not* click — and then tears the
document down anyway. **It also stopped losing, 0/52.** So the few milliseconds of click latency
close the window on their own, and arm G's result is explained by latency rather than by the absence
of a teardown. Reported alone it would have supported the opposite routing.

## 9.3 The matched pair that does answer it

Both arms arm the navigation **before** the write and fire it from inside the page via a
`MutationObserver` that triggers the instant the cell's `Explicit: 50%.` text commits — the same
task as the DOM confirmation, with no Playwright round trip in between. The two are byte-identical
except for one line: `a[href="/people"].click()` versus `location.assign("/people")`.

| Arm | Navigation primitive | Confirmed | Losses | Op row created? |
| --- | --- | --- | --- | --- |
| J1 | sidebar `<a>` click — client-side transition | 70/70 client-side | **0 / 70** | 70/70 grew 6→7 |
| J2 | `location.assign` — full document load | 70/70 full load | **48 / 70** | 48 absent, 22 grew |

MEASURED (`/tmp/q26-logs/campaign{12,13}-armJ-w4-r35.log`). The op-count discriminator holds exactly
as in §1: every J2 loss has `opsAfterNav=6`, every survival has `7`, no counterexamples in 140 runs.

One clean serial J2 loss (`/tmp/q26-logs/armJ-smoke.log`, single worker, one vault throughout):

```
J2/0-before-bob ops=6  snapshot {"vault_id":"2d7e1a7f-942d-40cf-85da-a61533c74988",...}
J2/1-after-nav  ops=6  snapshot {"vault_id":"2d7e1a7f-942d-40cf-85da-a61533c74988",...}
J2/TRANSITION marker="<gone>" clientSide=false url=http://localhost:3100/people
J2/post-reload DOM Bob="—Explicit: not stored. Effective: 0%. Owner remainder: 50%."
J2/VERDICT clientSide=false meLost=false bobLost=true opsBeforeBob=6 opsAfterNav=6
```

**On the zero:** 0/70 is a bound, not a clearance. Rule of three puts the 95% upper bound on J1's
true rate at ≈ 4.3%. What makes it decisive is the paired comparison rather than the zero itself:
under J2's measured rate of 0.686, the chance of seeing 0 losses in 70 J1 runs is 6.5 × 10⁻³⁶. The
two arms differ in one line of code, so the navigation primitive is the cause.

## 9.4 Tab destroyed — arm H

| Arm | Shape | Losses |
| --- | --- | --- |
| H | barrier → `page.close()` → read IndexedDB from a fresh tab in the same context | **17 / 70** |

MEASURED (`/tmp/q26-logs/campaign{8-armGH-w4-r18,9-armGH-w4-r52}.log`; 2/12 more in the serial
`campaign10-armH-serial.log`). IndexedDB is scoped to the browser context, so the surviving tab can
read the state without the vault session that died with the old one. A clean serial loss, same
`vault_id` and byte-identical op ids on both sides, with no seventh op
(`/tmp/q26-logs/campaign10-armH-serial.log`):

```
H/0-before-bob      ops=6  ... snapshot {"vault_id":"2eb54dd4-9e72-4383-b100-dfecc10d74a8",...}
H/1-after-tab-close ops=6  ... snapshot {"vault_id":"2eb54dd4-9e72-4383-b100-dfecc10d74a8",...}
H/VERDICT opLost=true opsBeforeBob=6 opsAfterClose=6
```

Scope caveat, MEASURED-by-construction: Playwright's `page.close()` does **not** run `beforeunload`,
so arm H models a crash or a killed tab, not a user clicking the window's close button. INFERRED
from `manager.ts:437-448`: a user-initiated close would hit the `beforeunload` handler, and
`hasPendingWorkSync()` returns true while `pendingLocalUpdates` is non-empty, so that path should
raise the unsaved-changes dialog rather than silently drop the write. I did not measure that.

## 9.5 What this means for exposure — the measured part and the inferred part

MEASURED:

- In-app navigation is safe in 70 runs (J1), and the sidebar links really are client-side (70/70).
- Full document teardowns lose the write: `location.assign` 48/70, `page.goto` 17/70 (arm D),
  `reload()` 21/70 (arm C), killed tab 17/70 (arm H).
- Anything that delays the teardown by even a few milliseconds closes the window: arm G2 0/52,
  arms A/B 0/140.

INFERRED, and flagged as such:

- A human cannot aim a reload at a window this narrow; the realistic user-facing exposure is an
  *unaimed* teardown — a crash, an OS kill, a force-quit — landing inside the few-millisecond window
  that follows each individual write. That is a small probability per write, not zero, and it is not
  something I measured on real users.
- The E2E failure class is a different matter and is largely a harness property: the navigation
  helpers use `page.goto` (`tests/e2e/helpers/nav.ts`), which is a full teardown, and no helper
  offers a way to await durability. J1 versus J2 is exactly that difference.
- The product-side gap behind both is that `setAllocation`'s DOM barrier is the strongest signal a
  caller has, and it does not imply durability; `SyncManager.awaitLocalPersistence()`
  (`manager.ts:367-378`) exists but is not surfaced to the UI or to tests.

I am not routing this — flagging that the two components above have different owners, which is the
decision the adjudicator has to make.

## 9.6 Provenance for this section

- Same worktree `/tmp/mf-q26` at `10a290d`, dev server on `:3100`, `env -u CI`, `--retries=0`,
  `--workers=4` except where noted. No database commands. Nothing committed.
- The main checkout advanced to `HEAD=9d8d2cb` during this work (another agent), but the code under
  test did not drift: `find src tests/e2e/helpers -type f | sort | xargs md5sum | awk '{print $1}' |
  md5sum` is `e7662f03b51f3415fc5ec4b2e1eec062` in **both** trees, identical to §7. Every arm in this
  section ran against that content.
- Probe (now including arms G, G2, H, J1, J2): `/tmp/q26-logs/zz-q26-idb.spec.ts.artifact`.
- Logs: `armGH-smoke.log`, `campaign8-armGH-w4-r18.log`, `campaign9-armGH-w4-r52.log`,
  `campaign10-armH-serial.log`, `campaign11-armG2-w4-r52.log`, `armJ-smoke.log`,
  `campaign12-armJ-w4-r35.log`, `campaign13-armJ-w4-r35.log` — all under `/tmp/q26-logs/`.
